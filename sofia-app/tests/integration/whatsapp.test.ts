import { createHmac } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { LlmProvider, LlmRequest, LlmResult } from "@/server/ai/provider";
import type { SofiaTurn } from "@/server/ai/reply";
import { ChannelNotConnectedError, getChannelAdapter } from "@/server/channels";
import { withTenant } from "@/server/db/context";
import { conversations, integrations, leads, messages, notifications, organizations } from "@/server/db/schema";
import { resetEnvCache } from "@/server/env";
import { sendManualReply, takeOverConversation } from "@/server/services/inbox";
import { leadFormSchema } from "@/lib/validation/leads";
import { createLead } from "@/server/services/leads";
import { createService, saveEstablishmentProfile, saveOpeningHours } from "@/server/services/setup";
import { connectWhatsapp, disconnectWhatsapp, findWhatsappRoute, getWhatsappChannel } from "@/server/whatsapp/connection";
import { answerWhatsappMessage } from "@/server/whatsapp/inbound";
import { receiveDelivery, verifySubscription } from "@/server/whatsapp/receive";

import { addMember, createEstablishment, meta } from "./helpers";

const APP_SECRET = "test-meta-app-secret-0123456789";
const VERIFY_TOKEN = "verify-token-0123456789abcdef";
const GRAPH = "https://graph.test";
const TOKEN = "EAAGtestTokenForSofia0123456789";

/*
 * Meta's Graph API, in memory: the numbers it knows, the tokens it accepts,
 * and every message SOFIA asked it to send.
 */
class FakeGraph {
  readonly sent: Array<{ phoneNumberId: string; to: string; body: string }> = [];
  readonly numbers = new Map<string, { waba: string; display: string; name: string }>();
  readonly validTokens = new Set([TOKEN]);
  failNextSend: { status: number; code: number; message: string } | null = null;
  private counter = 0;

  fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    const [, version, id, edge] = url.pathname.split("/");
    expect(version).toBe("v23.0");
    const token = new Headers(init?.headers).get("authorization")?.replace("Bearer ", "") ?? "";
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    if (!this.validTokens.has(token)) return json(401, { error: { message: "Invalid OAuth access token.", code: 190 } });

    if (!edge && init?.method === "GET") {
      const number = this.numbers.get(id!);
      if (!number) return json(400, { error: { message: "Unsupported get request.", code: 100 } });
      return json(200, { id, display_phone_number: number.display, verified_name: number.name, quality_rating: "GREEN" });
    }
    if (edge === "phone_numbers") {
      return json(200, { data: [...this.numbers.entries()].filter(([, number]) => number.waba === id).map(([phoneId]) => ({ id: phoneId })) });
    }
    if (edge === "subscribed_apps") return json(200, { success: true });
    if (edge === "messages") {
      if (this.failNextSend) {
        const failure = this.failNextSend;
        this.failNextSend = null;
        return json(failure.status, { error: { message: failure.message, code: failure.code } });
      }
      const payload = JSON.parse(String(init?.body)) as { to: string; text: { body: string } };
      this.sent.push({ phoneNumberId: id!, to: payload.to, body: payload.text.body });
      return json(200, { messaging_product: "whatsapp", messages: [{ id: `wamid.sofia${++this.counter}` }] });
    }
    return json(404, { error: { message: "Unknown edge", code: 803 } });
  };
}

const graph = new FakeGraph();

/** Returns prepared answers. */
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

let sequence = 0;
const nextId = () => `wamid.customer${Date.now()}${++sequence}`;
const seconds = (date = new Date()) => String(Math.floor(date.getTime() / 1000));

function delivery(phoneNumberId: string, value: { messages?: unknown[]; statuses?: unknown[]; contacts?: unknown[] }) {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ id: "WABA", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { display_phone_number: "33612345678", phone_number_id: phoneNumberId }, ...value } }] }],
  });
}

function textMessage(from: string, body: string, id = nextId(), name = "Maria Silva") {
  return { contacts: [{ wa_id: from, profile: { name } }], messages: [{ from, id, timestamp: seconds(), type: "text", text: { body } }] };
}

const sign = (body: string, secret = APP_SECRET) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

async function deliver(body: string) {
  const result = await receiveDelivery(body, sign(body));
  if (result.status !== "accepted") throw new Error(`Delivery rejected: ${result.reason}`);
  return result;
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

async function connected(name: string, phoneNumberId: string) {
  const owner = await readyEstablishment(name);
  graph.numbers.set(phoneNumberId, { waba: `waba${phoneNumberId}`, display: "+33 6 12 34 56 78", name });
  await connectWhatsapp(owner.ctx, { phoneNumberId, businessAccountId: `waba${phoneNumberId}`, accessToken: TOKEN }, meta);
  return owner;
}

async function setSofia(organizationId: string, status: "ACTIVE" | "INACTIVE") {
  await withTenant(organizationId, (tx) => tx.update(organizations).set({ sofiaStatus: status }).where(eq(organizations.id, organizationId)));
}

async function threadOf(organizationId: string, conversationId: string) {
  return withTenant(organizationId, (tx) => tx.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt), asc(messages.id)));
}

async function routeOf(phoneNumberId: string) {
  const route = await findWhatsappRoute(phoneNumberId);
  if (!route) throw new Error("No route");
  return route;
}

beforeAll(() => {
  process.env.META_APP_SECRET = APP_SECRET;
  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = VERIFY_TOKEN;
  process.env.WHATSAPP_GRAPH_URL = GRAPH;
  resetEnvCache();
  vi.stubGlobal("fetch", graph.fetch);
});

afterAll(() => {
  delete process.env.META_APP_SECRET;
  delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  delete process.env.WHATSAPP_GRAPH_URL;
  resetEnvCache();
  vi.unstubAllGlobals();
});

describe("connecting a WhatsApp number", () => {
  it("is Connected only after Meta confirmed the number, the account and the token", async () => {
    const owner = await readyEstablishment("Institut Ancre");
    graph.numbers.set("1100001", { waba: "waba1100001", display: "+33 6 12 34 56 78", name: "Institut Ancre" });
    const input = { phoneNumberId: "1100001", businessAccountId: "waba1100001", accessToken: TOKEN };

    const staff = await addMember(owner.organizationId, "STAFF");
    await expect(connectWhatsapp(staff.ctx, input, meta)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(connectWhatsapp(owner.ctx, { ...input, accessToken: "EAAGwrongToken0123456789" }, meta)).rejects.toMatchObject({
      code: "VALIDATION",
      message: expect.stringContaining("refuse ce jeton"),
    });
    await expect(connectWhatsapp(owner.ctx, { ...input, businessAccountId: "waba9999999" }, meta)).rejects.toMatchObject({
      message: expect.stringContaining("n'appartient pas à ce compte"),
    });
    expect((await withTenant(owner.organizationId, (tx) => getWhatsappChannel(tx, owner.organizationId))).status).toBe("NOT_CONNECTED");

    const result = await connectWhatsapp(owner.ctx, input, meta);
    expect(result).toEqual({ displayName: "+33 6 12 34 56 78", verifiedName: "Institut Ancre" });
    const channel = await withTenant(owner.organizationId, (tx) => getWhatsappChannel(tx, owner.organizationId));
    expect(channel).toMatchObject({ status: "CONNECTED", displayName: "+33 6 12 34 56 78", config: { businessAccountId: "waba1100001", qualityRating: "GREEN" } });

    // The token is stored encrypted, never as typed.
    const [row] = await withTenant(owner.organizationId, (tx) => tx.select().from(integrations).where(eq(integrations.provider, "WHATSAPP_CLOUD")));
    expect(row!.credentialsEncrypted).not.toContain(TOKEN);

    // The same number cannot belong to two establishments.
    const other = await readyEstablishment("Institut Copie");
    await expect(connectWhatsapp(other.ctx, input, meta)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("answers Meta's subscription check only with the right verify token", () => {
    const params = (token: string) => new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": token, "hub.challenge": "1158201444" });
    expect(verifySubscription(params(VERIFY_TOKEN))).toBe("1158201444");
    expect(verifySubscription(params("wrong-token-0123456789abcdef"))).toBeNull();
    expect(verifySubscription(new URLSearchParams({ "hub.mode": "unsubscribe", "hub.verify_token": VERIFY_TOKEN, "hub.challenge": "1" }))).toBeNull();
  });

  it("refuses deliveries that Meta did not sign", async () => {
    const body = delivery("1100001", textMessage("33611111111", "Bonjour"));
    expect(await receiveDelivery(body, null)).toEqual({ status: "rejected", reason: "signature" });
    expect(await receiveDelivery(body, sign(body, "another-secret-0123456789"))).toEqual({ status: "rejected", reason: "signature" });
    expect(await receiveDelivery(`${body} `, sign(body))).toEqual({ status: "rejected", reason: "signature" });
  });
});

describe("a customer writing on WhatsApp", () => {
  let owner: Awaited<ReturnType<typeof connected>>;
  const PHONE_ID = "2200002";

  beforeAll(async () => {
    owner = await connected("Institut Phare", PHONE_ID);
  });

  beforeEach(async () => {
    graph.sent.length = 0;
    await setSofia(owner.organizationId, "INACTIVE");
  });

  it("opens a lead and a conversation, and a replayed delivery changes nothing", async () => {
    const id = nextId();
    const body = delivery(PHONE_ID, textMessage("33622222222", "Bonjour, quel est le prix du soin visage ?", id));
    const first = await deliver(body);
    expect(first.toAnswer).toHaveLength(0); // SOFIA is not active: the team answers.
    await deliver(body);

    const [lead] = await withTenant(owner.organizationId, (tx) => tx.select().from(leads).where(eq(leads.phone, "+33622222222")));
    expect(lead).toMatchObject({ source: "WHATSAPP", channel: "WHATSAPP", firstName: "Maria", lastName: "Silva" });
    const [conversation] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.leadId, lead!.id)));
    expect(conversation).toMatchObject({ channel: "WHATSAPP", externalThreadId: "33622222222", unreadCount: 1 });
    expect(conversation!.lastInboundAt).not.toBeNull();

    const thread = await threadOf(owner.organizationId, conversation!.id);
    expect(thread.filter((message) => message.authorType === "CONTACT")).toHaveLength(1);
    expect(thread.at(-1)).toMatchObject({ body: "Bonjour, quel est le prix du soin visage ?", externalMessageId: id, status: "RECEIVED" });

    const [alert] = await withTenant(owner.organizationId, (tx) =>
      tx.select().from(notifications).where(and(eq(notifications.entityId, conversation!.id), eq(notifications.type, "NEW_LEAD"))),
    );
    expect(alert?.title).toBe("Nouveau contact sur WhatsApp");
  });

  it("joins the file of a customer the establishment already knows by her number", async () => {
    const known = await createLead(
      owner.ctx,
      leadFormSchema.parse({ firstName: "Inês", lastName: "Costa", phone: "+33633333333", email: "", instagramHandle: "", source: "MANUAL", interestedServiceId: "", potentialValue: "", assignedToUserId: "", marketingConsent: "UNKNOWN" }),
      meta,
    );
    await deliver(delivery(PHONE_ID, textMessage("33633333333", "Olá, é a Inês", nextId(), "Ines C")));
    const [conversation] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.externalThreadId, "33633333333")));
    expect(conversation!.leadId).toBe(known.id);
    const [lead] = await withTenant(owner.organizationId, (tx) => tx.select().from(leads).where(eq(leads.id, known.id)));
    expect(lead).toMatchObject({ firstName: "Inês", lastName: "Costa" });
  });

  it("gets SOFIA's answer on WhatsApp, and its delivery reports move it forward only", async () => {
    await setSofia(owner.organizationId, "ACTIVE");
    const result = await deliver(delivery(PHONE_ID, textMessage("33644444444", "Combien coûte le soin visage ?")));
    expect(result.toAnswer).toHaveLength(1);
    const { route, stored } = result.toAnswer[0]!;

    const provider = new QueueProvider([answer()]);
    const outcome = await answerWhatsappMessage(route, stored, { provider, burstWindowMs: 0 });
    expect(outcome.status).toBe("answered");
    expect(graph.sent).toEqual([{ phoneNumberId: PHONE_ID, to: "33644444444", body: "Bonjour ! Le soin visage éclat est à 85 €." }]);

    const sofia = (await threadOf(owner.organizationId, stored.conversationId)).find((message) => message.authorType === "AI")!;
    expect(sofia).toMatchObject({ status: "SENT", externalMessageId: expect.stringMatching(/^wamid\.sofia/) });

    const report = (status: string) => delivery(PHONE_ID, { statuses: [{ id: sofia.externalMessageId, status, timestamp: seconds(), recipient_id: "33644444444" }] });
    await deliver(report("read"));
    await deliver(report("delivered")); // Late: never moves a read message back.
    const [after] = await withTenant(owner.organizationId, (tx) => tx.select().from(messages).where(eq(messages.id, sofia.id)));
    expect(after).toMatchObject({ status: "READ" });
    expect(after!.readAt).not.toBeNull();
    expect(after!.deliveredAt).not.toBeNull();
  });

  it("answers a burst of messages once, after the last one", async () => {
    await setSofia(owner.organizationId, "ACTIVE");
    const first = await deliver(delivery(PHONE_ID, textMessage("33655555555", "Bonjour")));
    const second = await deliver(delivery(PHONE_ID, textMessage("33655555555", "je voudrais un rendez-vous samedi")));
    const provider = new QueueProvider([answer({ reply: "Avec plaisir ! Pour quel soin ?", intent: "BOOKING_REQUEST" })]);

    expect(await answerWhatsappMessage(first.toAnswer[0]!.route, first.toAnswer[0]!.stored, { provider, burstWindowMs: 0 })).toEqual({ status: "skipped", reason: "superseded" });
    expect((await answerWhatsappMessage(second.toAnswer[0]!.route, second.toAnswer[0]!.stored, { provider, burstWindowMs: 0 })).status).toBe("answered");
    expect(graph.sent).toHaveLength(1);
    expect(provider.requests).toHaveLength(1);
  });

  it("sends voice notes and photos to the team, never to SOFIA", async () => {
    await setSofia(owner.organizationId, "ACTIVE");
    const result = await deliver(
      delivery(PHONE_ID, {
        contacts: [{ wa_id: "33666666666", profile: { name: "Léa" } }],
        messages: [{ from: "33666666666", id: nextId(), timestamp: seconds(), type: "audio", audio: { id: "media-1", mime_type: "audio/ogg; codecs=opus" } }],
      }),
    );
    expect(result.toAnswer).toHaveLength(0);
    const [conversation] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.externalThreadId, "33666666666")));
    expect(conversation!.humanRequestedAt).not.toBeNull();
    const last = (await threadOf(owner.organizationId, conversation!.id)).at(-1)!;
    expect(last).toMatchObject({ contentType: "AUDIO", body: "[Message vocal reçu : SOFIA n'affiche pas encore les médias]" });
    expect(last.attachments).toEqual([{ type: "audio", mediaId: "media-1", mimeType: "audio/ogg; codecs=opus" }]);
  });

  it("warns the team when WhatsApp could not deliver SOFIA's answer", async () => {
    await setSofia(owner.organizationId, "ACTIVE");
    const result = await deliver(delivery(PHONE_ID, textMessage("33677777777", "Vous êtes ouverts lundi ?")));
    const { route, stored } = result.toAnswer[0]!;
    graph.failNextSend = { status: 400, code: 131026, message: "Message undeliverable" };
    await answerWhatsappMessage(route, stored, { provider: new QueueProvider([answer({ reply: "Oui, de 10 h à 19 h." })]), burstWindowMs: 0 });

    const sofia = (await threadOf(owner.organizationId, stored.conversationId)).find((message) => message.authorType === "AI")!;
    expect(sofia.status).toBe("FAILED");
    expect(sofia.error).toContain("ne peut pas recevoir de message WhatsApp");
    const [conversation] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.id, stored.conversationId)));
    expect(conversation!.humanRequestedAt).not.toBeNull();
  });

  it("lets the team answer within 24 hours, and refuses free text after", async () => {
    const result = await deliver(delivery(PHONE_ID, textMessage("33688888888", "Je préfère parler à quelqu'un")));
    const [conversation] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.externalThreadId, "33688888888")));
    expect(result.toAnswer).toHaveLength(0);

    await takeOverConversation(owner.ctx, conversation!.id, meta);
    const sent = await sendManualReply(owner.ctx, { conversationId: conversation!.id, body: "Bonjour, c'est Camille. Je vous écoute." }, meta);
    expect(sent.simulated).toBe(false);
    expect(graph.sent.at(-1)).toEqual({ phoneNumberId: PHONE_ID, to: "33688888888", body: "Bonjour, c'est Camille. Je vous écoute." });

    await withTenant(owner.organizationId, (tx) =>
      tx.update(conversations).set({ lastInboundAt: new Date(Date.now() - 25 * 60 * 60 * 1000) }).where(eq(conversations.id, conversation!.id)),
    );
    await expect(sendManualReply(owner.ctx, { conversationId: conversation!.id, body: "Vous êtes là ?" }, meta)).rejects.toMatchObject({
      message: expect.stringContaining("plus de 24 h"),
    });
  });
});

describe("WhatsApp across establishments", () => {
  it("routes each number to its own establishment, and ignores numbers SOFIA does not know", async () => {
    const north = await connected("Institut Nord", "3300003");
    const south = await connected("Institut Sud", "3300004");
    await deliver(delivery("3300003", textMessage("33699999999", "Bonjour le Nord")));
    await deliver(delivery("9999999", textMessage("33699999999", "Bonjour l'inconnu")));

    const inNorth = await withTenant(north.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.organizationId, north.organizationId)));
    const inSouth = await withTenant(south.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.organizationId, south.organizationId)));
    expect(inNorth).toHaveLength(1);
    expect(inSouth).toHaveLength(0);
  });

  it("stops everything when the token is rejected, and after a disconnection", async () => {
    const owner = await connected("Institut Jeton", "4400004");
    await deliver(delivery("4400004", textMessage("33612121212", "Bonjour")));
    const [conversation] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.externalThreadId, "33612121212")));
    await takeOverConversation(owner.ctx, conversation!.id, meta);

    graph.failNextSend = { status: 401, code: 190, message: "Error validating access token" };
    await expect(sendManualReply(owner.ctx, { conversationId: conversation!.id, body: "Bonjour !" }, meta)).rejects.toMatchObject({
      message: expect.stringContaining("reconnectez-le"),
    });
    const channel = await withTenant(owner.organizationId, (tx) => getWhatsappChannel(tx, owner.organizationId));
    expect(channel.status).toBe("ERROR");
    const [alert] = await withTenant(owner.organizationId, (tx) => tx.select().from(notifications).where(eq(notifications.type, "INTEGRATION_ERROR")));
    expect(alert?.title).toBe("WhatsApp est déconnecté");
    // Nothing was stored as sent.
    expect((await threadOf(owner.organizationId, conversation!.id)).filter((message) => message.authorType === "USER")).toHaveLength(0);

    await disconnectWhatsapp(owner.ctx, meta);
    expect(await findWhatsappRoute("4400004")).toBeNull();
    await expect(withTenant(owner.organizationId, (tx) => getChannelAdapter(tx, { id: owner.organizationId, isDemo: false }, "WHATSAPP"))).rejects.toBeInstanceOf(
      ChannelNotConnectedError,
    );
    // The number is free for another establishment.
    const next = await readyEstablishment("Institut Relais");
    await connectWhatsapp(next.ctx, { phoneNumberId: "4400004", businessAccountId: "waba4400004", accessToken: TOKEN }, meta);
    expect((await routeOf("4400004")).organizationId).toBe(next.organizationId);
  });
});
