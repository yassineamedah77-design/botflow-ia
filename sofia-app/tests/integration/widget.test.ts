import { and, eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { LlmProvider, LlmRequest, LlmResult } from "@/server/ai/provider";
import type { SofiaTurn } from "@/server/ai/reply";
import { resetLlmProvider } from "@/server/ai/config";
import { withTenant } from "@/server/db/context";
import { consentRecords, conversations, leads, messages, notifications, organizations } from "@/server/db/schema";
import { resetEnvCache } from "@/server/env";
import { AppError } from "@/server/errors";
import { consumeRateLimit, rateLimitPolicies, resetRateLimit } from "@/server/security/rate-limit";
import { sendManualReply, takeOverConversation } from "@/server/services/inbox";
import { createService, saveEstablishmentProfile, saveOpeningHours } from "@/server/services/setup";
import { getSofiaReadiness, setSofiaStatus } from "@/server/services/sofia";
import { getWidgetChannel, saveWidgetSettings } from "@/server/services/widget-settings";
import { forgetWidgetEmbedding, loadPublicWidget, widgetEmbeddingDomains } from "@/server/widget/public";
import {
  answerVisitorMessage,
  listVisitorMessages,
  postVisitorMessage,
  recordWhatsappHandoff,
  recordWidgetSeen,
  saveVisitorContact,
  WidgetError,
} from "@/server/widget/visitor";

import { addMember, createEstablishment, meta } from "./helpers";

/** Returns prepared answers and records what SOFIA was asked. */
class QueueProvider implements LlmProvider {
  readonly name = "queue";
  readonly requests: Array<LlmRequest<unknown>> = [];
  constructor(private readonly answers: SofiaTurn[]) {}
  async generate<T>(request: LlmRequest<T>): Promise<LlmResult<T>> {
    this.requests.push(request as LlmRequest<unknown>);
    const next = this.answers.shift();
    if (!next) throw new Error("No prepared answer left");
    return {
      output: request.output.parse(next),
      provider: this.name,
      model: "queue-model",
      usedFallback: false,
      usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0 },
      toolCalls: [],
      latencyMs: 5,
    };
  }
}

const answer = (overrides: Partial<SofiaTurn> = {}): SofiaTurn => ({
  reply: "Bonjour ! Le soin visage éclat est à 85 €.",
  language: "fr",
  intent: "PRICE_REQUEST",
  intentLevel: "MEDIUM",
  action: { type: "none" },
  ...overrides,
});

const visitor = { ipAddress: null, userAgent: "vitest-visitor" };

async function widgetOf(publicId: string) {
  forgetWidgetEmbedding(publicId);
  const widget = await loadPublicWidget(publicId);
  if (!widget) throw new Error("widget not found");
  return widget;
}

async function caught(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Expected a rejection");
}

async function readyEstablishment(name: string) {
  const owner = await createEstablishment(name);
  await saveEstablishmentProfile(
    owner.ctx,
    {
      assistantName: "Sofia",
      description: null,
      tone: null,
      addressLine: "8 rue du Port",
      postalCode: "13002",
      city: "Marseille",
      phone: "04 91 00 00 00",
      email: null,
      websiteUrl: null,
      instagramHandle: null,
      cancellationPolicy: null,
      bookingPolicy: null,
      importantInfo: null,
      medicalReferent: null,
    },
    meta,
  );
  await saveOpeningHours(owner.ctx, [{ day: 2, opensAt: "10:00", closesAt: "19:00" }], meta);
  await createService(
    owner.ctx,
    { name: "Soin visage éclat", category: "Visage", description: null, priceType: "FIXED", priceCents: 8_500, durationMinutes: 60, preparation: null, contraindications: null, requiresConsultation: false },
    meta,
  );
  return owner;
}

const settings = (overrides: Partial<Parameters<typeof saveWidgetSettings>[1]> = {}) => ({
  enabled: true,
  allowedDomains: ["institut-calanque.fr"],
  accentColor: "#d97757",
  position: "right" as const,
  greeting: null,
  whatsappButton: true,
  privacyUrl: null,
  ...overrides,
});

describe("website widget settings and installation", () => {
  it("starts closed to every site, and only owners and admins change it", async () => {
    const owner = await createEstablishment("Institut Fenêtre");
    const widget = await widgetOf(owner.ctx.organization.widgetPublicId);
    expect(widget.settings).toMatchObject({ enabled: true, allowedDomains: [] });
    expect(await widgetEmbeddingDomains(owner.ctx.organization.widgetPublicId)).toEqual([]);
    expect(await loadPublicWidget("sof_unknownunknownunknown")).toBeNull();

    const staff = await addMember(owner.organizationId, "STAFF");
    await expect(saveWidgetSettings(staff.ctx, settings(), meta)).rejects.toMatchObject({ code: "FORBIDDEN" });

    await saveWidgetSettings(owner.ctx, settings({ allowedDomains: ["institut-fenetre.fr"] }), meta);
    expect(await widgetEmbeddingDomains(owner.ctx.organization.widgetPublicId)).toEqual(["institut-fenetre.fr"]);
  });

  it("turns Connected the first time it loads on an allowed domain, and only then", async () => {
    const owner = await createEstablishment("Institut Vitrine");
    await saveWidgetSettings(owner.ctx, settings({ allowedDomains: ["institut-vitrine.fr"] }), meta);
    const publicId = owner.ctx.organization.widgetPublicId;

    await recordWidgetSeen(await widgetOf(publicId), "https://autre-site.fr");
    expect((await withTenant(owner.organizationId, (tx) => getWidgetChannel(tx, owner.ctx.organization))).status).toBe("NOT_CONNECTED");

    await recordWidgetSeen(await widgetOf(publicId), "https://www.institut-vitrine.fr");
    const channel = await withTenant(owner.organizationId, (tx) => getWidgetChannel(tx, owner.ctx.organization));
    expect(channel).toMatchObject({ status: "CONNECTED", seenOn: "www.institut-vitrine.fr" });

    // Removing the domain it was seen on, or switching it off, takes "Connecté" away.
    await saveWidgetSettings(owner.ctx, settings({ allowedDomains: ["nouveau-site.fr"] }), meta);
    expect((await withTenant(owner.organizationId, (tx) => getWidgetChannel(tx, owner.ctx.organization))).status).toBe("NOT_CONNECTED");
    await saveWidgetSettings(owner.ctx, settings({ enabled: false }), meta);
    expect((await withTenant(owner.organizationId, (tx) => getWidgetChannel(tx, owner.ctx.organization))).status).toBe("DISCONNECTED");
    expect(await widgetEmbeddingDomains(publicId)).toBeNull();
  });
});

describe("a visitor on the widget", () => {
  let owner: Awaited<ReturnType<typeof readyEstablishment>>;
  let publicId: string;

  beforeAll(async () => {
    owner = await readyEstablishment("Institut Calanque");
    publicId = owner.ctx.organization.widgetPublicId;
    await saveWidgetSettings(owner.ctx, settings(), meta);
  });

  afterEach(async () => {
    await withTenant(owner.organizationId, (tx) => tx.update(organizations).set({ sofiaStatus: "INACTIVE" }).where(eq(organizations.id, owner.organizationId)));
  });

  it("writes to the team while SOFIA is not active, and is invited to leave her details", async () => {
    const widget = await widgetOf(publicId);
    const posted = await postVisitorMessage(widget, { token: null, body: "Bonjour, vous êtes ouverts le samedi ?", language: "fr", pageUrl: "https://institut-calanque.fr/tarifs?utm=mail@x.fr" }, visitor);
    expect(posted.answer).toBe(false);
    expect(posted.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const { messages: shown, state } = await listVisitorMessages(widget, { token: posted.token });
    // The greeting, then her message; the team's system line stays internal.
    expect(shown.map((message) => message.author)).toEqual(["team", "visitor"]);
    expect(shown[1]!.body).toBe("Bonjour, vous êtes ouverts le samedi ?");
    expect(state).toMatchObject({ sofiaActive: false, awaitingReply: false, needsContact: true, contactKnown: false });

    const stored = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.id, posted.conversationId)));
    expect(stored[0]).toMatchObject({ channel: "WEBSITE", unreadCount: 1, lastMessagePreview: "Bonjour, vous êtes ouverts le samedi ?" });
    // The visitor's key is never stored in clear.
    expect(stored[0]!.externalThreadId).not.toContain(posted.token);
    const system = await withTenant(owner.organizationId, (tx) =>
      tx.select({ body: messages.body }).from(messages).where(and(eq(messages.conversationId, posted.conversationId), eq(messages.authorType, "SYSTEM"))),
    );
    expect(system[0]!.body).toContain("https://institut-calanque.fr/tarifs");
    expect(system[0]!.body).not.toContain("utm");
    const alerts = await withTenant(owner.organizationId, (tx) => tx.select().from(notifications).where(eq(notifications.entityId, posted.conversationId)));
    expect(alerts.some((alert) => alert.title === "Nouvelle conversation sur votre site")).toBe(true);
  });

  it("gets SOFIA's answer, one message at a time", async () => {
    await withTenant(owner.organizationId, (tx) => tx.update(organizations).set({ sofiaStatus: "ACTIVE" }).where(eq(organizations.id, owner.organizationId)));
    const widget = await widgetOf(publicId);
    const posted = await postVisitorMessage(widget, { token: null, body: "Combien coûte le soin visage ?", language: "fr" }, visitor);
    expect(posted.answer).toBe(true);
    expect((await listVisitorMessages(widget, { token: posted.token })).state.awaitingReply).toBe(true);

    // While SOFIA writes, a second message waits.
    const second = await caught(postVisitorMessage(widget, { token: posted.token, body: "Et le samedi ?" }, visitor));
    expect(second).toBeInstanceOf(WidgetError);
    expect((second as WidgetError).code).toBe("still_answering");

    const provider = new QueueProvider([answer()]);
    const outcome = await answerVisitorMessage(widget, posted.conversationId, { provider });
    expect(outcome.status).toBe("answered");
    // SOFIA saw her greeting as the opening of the conversation.
    expect(provider.requests[0]!.turnContext).toContain("Bonjour ! Je suis Sofia");
    expect(provider.requests[0]!.conversation).toEqual([{ author: "customer", text: "Combien coûte le soin visage ?" }]);

    const after = await listVisitorMessages(widget, { token: posted.token });
    expect(after.messages.at(-1)).toMatchObject({ author: "assistant", body: "Bonjour ! Le soin visage éclat est à 85 €." });
    expect(after.state.awaitingReply).toBe(false);
    // Fetched by the window: delivered.
    const [reply] = await withTenant(owner.organizationId, (tx) =>
      tx.select({ status: messages.status, deliveredAt: messages.deliveredAt }).from(messages).where(and(eq(messages.conversationId, posted.conversationId), eq(messages.body, "Bonjour ! Le soin visage éclat est à 85 €."))),
    );
    expect(reply).toMatchObject({ status: "DELIVERED" });

    // Only what is new since the last message she saw.
    const since = await listVisitorMessages(widget, { token: posted.token, since: after.messages.at(-1)!.createdAt });
    expect(since.messages).toHaveLength(1);
  });

  it("reads the team's reply once a member takes the conversation", async () => {
    await withTenant(owner.organizationId, (tx) => tx.update(organizations).set({ sofiaStatus: "ACTIVE" }).where(eq(organizations.id, owner.organizationId)));
    const widget = await widgetOf(publicId);
    const posted = await postVisitorMessage(widget, { token: null, body: "Je voudrais parler à quelqu'un.", language: "fr" }, visitor);
    await answerVisitorMessage(widget, posted.conversationId, {
      provider: new QueueProvider([
        answer({ reply: "Je préviens l'équipe.", intent: "HUMAN_REQUEST", action: { type: "handoff", reason: "human_request", urgency: "normal", summary: "Veut parler à l'équipe." } }),
      ]),
    });
    expect((await listVisitorMessages(widget, { token: posted.token })).state).toMatchObject({ needsContact: true });

    await takeOverConversation(owner.ctx, posted.conversationId, meta);
    const sent = await sendManualReply(owner.ctx, { conversationId: posted.conversationId, body: "Bonjour, c'est Camille. Je vous écoute." }, meta);
    expect(sent.simulated).toBe(false);

    const { messages: shown, state } = await listVisitorMessages(widget, { token: posted.token });
    expect(shown.at(-1)).toMatchObject({ author: "team", body: "Bonjour, c'est Camille. Je vous écoute." });
    expect(state.humanActive).toBe(true);
    // The internal "X took the conversation" line is not shown to her.
    expect(shown.some((message) => message.body.includes("a pris la conversation"))).toBe(false);
  });

  it("leaves her details with an optional marketing consent, joining her existing file", async () => {
    const existing = await withTenant(owner.organizationId, async (tx) => {
      const [lead] = await tx
        .insert(leads)
        .values({ organizationId: owner.organizationId, firstName: "Julie", lastName: "Martin", phone: "+33611223344", source: "IMPORT", isExistingClient: true })
        .returning({ id: leads.id });
      return lead!.id;
    });
    const widget = await widgetOf(publicId);
    const posted = await postVisitorMessage(widget, { token: null, body: "Bonjour, c'est Julie.", language: "fr" }, visitor);
    const [opened] = await withTenant(owner.organizationId, (tx) => tx.select({ leadId: conversations.leadId }).from(conversations).where(eq(conversations.id, posted.conversationId)));
    const invalid = await caught(saveVisitorContact(widget, { token: posted.token, contact: { firstName: "Julie", marketingConsent: false } }, visitor));
    expect((invalid as WidgetError).code).toBe("invalid");

    await saveVisitorContact(
      widget,
      { token: posted.token, contact: { firstName: "Julie", lastName: "Martin", phone: "06 11 22 33 44", email: "julie.martin@example.org", marketingConsent: true }, language: "fr" },
      visitor,
    );

    const [conversation] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.id, posted.conversationId)));
    expect(conversation!.leadId).toBe(existing);
    const [lead] = await withTenant(owner.organizationId, (tx) => tx.select().from(leads).where(eq(leads.id, existing)));
    expect(lead).toMatchObject({ email: "julie.martin@example.org", marketingConsent: "GRANTED", isExistingClient: true });
    const proofs = await withTenant(owner.organizationId, (tx) => tx.select().from(consentRecords).where(eq(consentRecords.leadId, existing)));
    expect(proofs.map((proof) => `${proof.purpose}:${proof.source}`).sort()).toEqual(["DATA_PROCESSING:widget_form", "MARKETING:widget_checkbox"]);
    expect(proofs.find((proof) => proof.purpose === "MARKETING")!.proof).toMatchObject({ wording: expect.stringContaining("Institut Calanque") });
    // The anonymous file opened for the visit is gone: she has one file.
    expect(await withTenant(owner.organizationId, (tx) => tx.select().from(leads).where(eq(leads.id, opened!.leadId)))).toEqual([]);
    expect((await listVisitorMessages(widget, { token: posted.token })).state).toMatchObject({ contactKnown: true, needsContact: false });
  });

  it("ignores bots filling the hidden field, and tells the team about a WhatsApp hand-over once", async () => {
    const widget = await widgetOf(publicId);
    const posted = await postVisitorMessage(widget, { token: null, body: "Hello", language: "en" }, visitor);
    await saveVisitorContact(widget, { token: posted.token, contact: { firstName: "Bot", email: "bot@spam.example", marketingConsent: true, website: "http://spam.example" } }, visitor);
    const bots = await withTenant(owner.organizationId, (tx) => tx.select().from(leads).where(eq(leads.email, "bot@spam.example")));
    expect(bots).toHaveLength(0);

    await recordWhatsappHandoff(widget, { token: posted.token });
    await recordWhatsappHandoff(widget, { token: posted.token });
    const lines = await withTenant(owner.organizationId, (tx) =>
      tx.select({ body: messages.body }).from(messages).where(and(eq(messages.conversationId, posted.conversationId), eq(messages.authorType, "SYSTEM"))),
    );
    expect(lines.filter((line) => line.body?.includes("continue sur WhatsApp"))).toHaveLength(1);
  });

  it("keeps each establishment's conversations apart, and refuses everything when the widget is off", async () => {
    const other = await createEstablishment("Institut Voisin du Port");
    const widget = await widgetOf(publicId);
    const posted = await postVisitorMessage(widget, { token: null, body: "Bonjour", language: "fr" }, visitor);
    const otherWidget = await widgetOf(other.ctx.organization.widgetPublicId);
    expect(((await caught(listVisitorMessages(otherWidget, { token: posted.token }))) as WidgetError).code).toBe("session");
    expect(((await caught(postVisitorMessage(otherWidget, { token: posted.token, body: "x" }, visitor))) as WidgetError).code).toBe("session");
    expect(((await caught(listVisitorMessages(widget, { token: "not-a-token" }))) as WidgetError).code).toBe("session");
    expect(((await caught(postVisitorMessage(widget, { token: null, body: "   " }, visitor))) as WidgetError).code).toBe("invalid");

    await saveWidgetSettings(owner.ctx, settings({ enabled: false }), meta);
    const closed = await widgetOf(publicId);
    expect(((await caught(postVisitorMessage(closed, { token: posted.token, body: "Encore là ?" }, visitor))) as WidgetError).code).toBe("closed");
    await saveWidgetSettings(owner.ctx, settings(), meta);
  });

  it("limits how fast one visitor can write", async () => {
    const widget = await widgetOf(publicId);
    const ip = { ipAddress: "203.0.113.77", userAgent: "vitest" };
    let limited: unknown = null;
    for (let index = 0; index < 12 && !limited; index++) {
      limited = await postVisitorMessage(widget, { token: null, body: `Bonjour ${index}`, language: "fr" }, ip).then(
        () => null,
        (error: unknown) => error,
      );
    }
    expect((limited as WidgetError).code).toBe("rate_limited");
    expect((limited as WidgetError).options.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("hands over to the team once SOFIA's daily budget is spent", async () => {
    await withTenant(owner.organizationId, (tx) => tx.update(organizations).set({ sofiaStatus: "ACTIVE" }).where(eq(organizations.id, owner.organizationId)));
    const widget = await widgetOf(publicId);
    const posted = await postVisitorMessage(widget, { token: null, body: "Vous faites des cartes cadeaux ?", language: "fr" }, visitor);
    const { limit } = rateLimitPolicies.widgetAiRepliesByOrganization;
    for (let used = 0; used < limit; used += 100) {
      await Promise.all(Array.from({ length: 100 }, () => consumeRateLimit("widgetAiRepliesByOrganization", owner.organizationId)));
    }
    try {
      const provider = new QueueProvider([answer()]);
      expect(await answerVisitorMessage(widget, posted.conversationId, { provider })).toMatchObject({ status: "skipped" });
      // The model is never called, and the team is told to answer her.
      expect(provider.requests).toHaveLength(0);
      const [conversation] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.id, posted.conversationId)));
      expect(conversation!.humanRequestedAt).not.toBeNull();
      const alerts = await withTenant(owner.organizationId, (tx) => tx.select().from(notifications).where(eq(notifications.entityId, posted.conversationId)));
      expect(alerts.some((alert) => alert.title === "Limite quotidienne de SOFIA atteinte sur le site")).toBe(true);
      expect((await listVisitorMessages(widget, { token: posted.token })).state).toMatchObject({ needsContact: true });
    } finally {
      await resetRateLimit("widgetAiRepliesByOrganization", owner.organizationId);
    }
  });

  it("goes silent for a suspended establishment", async () => {
    const suspended = await readyEstablishment("Institut Rideau Baissé");
    const id = suspended.ctx.organization.widgetPublicId;
    await saveWidgetSettings(suspended.ctx, settings({ allowedDomains: ["rideau-baisse.fr"] }), meta);
    const posted = await postVisitorMessage(await widgetOf(id), { token: null, body: "Bonjour", language: "fr" }, visitor);

    await withTenant(suspended.organizationId, (tx) => tx.update(organizations).set({ status: "SUSPENDED" }).where(eq(organizations.id, suspended.organizationId)));
    const widget = await widgetOf(id);
    expect(await widgetEmbeddingDomains(id)).toBeNull();
    expect(((await caught(postVisitorMessage(widget, { token: posted.token, body: "Toujours là ?" }, visitor))) as WidgetError).code).toBe("closed");
    expect(((await caught(listVisitorMessages(widget, { token: posted.token }))) as WidgetError).code).toBe("closed");
  });
});

describe("activating SOFIA", () => {
  afterEach(() => {
    delete process.env.AI_PROVIDER;
    resetEnvCache();
    resetLlmProvider();
  });

  it("refuses until the establishment and a model are ready, then pauses and resumes", async () => {
    const empty = await createEstablishment("Institut Pas Prêt");
    await expect(setSofiaStatus(empty.ctx, "ACTIVE", meta)).rejects.toThrow(AppError);
    const readiness = await withTenant(empty.organizationId, (tx) => getSofiaReadiness(tx, empty.organizationId));
    expect(readiness.checks.filter((check) => !check.ok).map((check) => check.key)).toEqual(["profile", "services", "hours", "ai"]);

    process.env.AI_PROVIDER = "scripted";
    resetEnvCache();
    resetLlmProvider();
    const owner = await readyEstablishment("Institut Prêt");
    const staff = await addMember(owner.organizationId, "STAFF");
    await expect(setSofiaStatus(staff.ctx, "ACTIVE", meta)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(setSofiaStatus(owner.ctx, "PAUSED", meta)).rejects.toMatchObject({ code: "VALIDATION" });

    expect(await setSofiaStatus(owner.ctx, "ACTIVE", meta)).toBe("ACTIVE");
    expect(await setSofiaStatus(owner.ctx, "PAUSED", meta)).toBe("PAUSED");
    expect(await setSofiaStatus(owner.ctx, "ACTIVE", meta)).toBe("ACTIVE");
    const [organization] = await withTenant(owner.organizationId, (tx) => tx.select({ sofiaStatus: organizations.sofiaStatus }).from(organizations).where(eq(organizations.id, owner.organizationId)));
    expect(organization!.sofiaStatus).toBe("ACTIVE");
  });
});
