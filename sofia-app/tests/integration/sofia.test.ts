import { and, desc, eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { resetLlmProvider } from "@/server/ai/config";
import { databaseKnowledgeSearch, loadKnowledgeSnapshot } from "@/server/ai/knowledge";
import { handleInboundMessage } from "@/server/ai/orchestrator";
import { LlmUnavailableError, type LlmProvider, type LlmRequest, type LlmResult } from "@/server/ai/provider";
import type { SofiaTurn } from "@/server/ai/reply";
import { withTenant } from "@/server/db/context";
import {
  consentRecords,
  conversations,
  eventLogs,
  knowledgeChunks,
  leadStatusChanges,
  leads,
  messages,
  notifications,
  organizations,
  services,
} from "@/server/db/schema";
import { resetEnvCache } from "@/server/env";
import {
  archivePractitioner,
  createClosure,
  createDocument,
  createFaq,
  createPractitioner,
  createPromotion,
  deleteDocument,
  deleteFaq,
  listDocuments,
  listFaqs,
  listPractitioners,
  listPromotions,
  updateDocument,
  updateFaq,
} from "@/server/services/knowledge-entries";
import { createService, saveEstablishmentProfile, saveOpeningHours } from "@/server/services/setup";
import { testSofia } from "@/server/services/sofia-console";

import { addMember, createEstablishment, meta } from "./helpers";

class QueueProvider implements LlmProvider {
  readonly name = "queue";
  readonly requests: Array<LlmRequest<unknown>> = [];
  constructor(private readonly answers: Array<SofiaTurn | Error>) {}
  async generate<T>(request: LlmRequest<T>): Promise<LlmResult<T>> {
    this.requests.push(request as LlmRequest<unknown>);
    const next = this.answers.shift();
    if (!next) throw new Error("No prepared answer left");
    if (next instanceof Error) throw next;
    return {
      output: request.output.parse(next),
      provider: this.name,
      model: "queue-model",
      usedFallback: false,
      usage: { inputTokens: 1200, outputTokens: 80, cacheReadTokens: 1000, cacheWriteTokens: 0 },
      toolCalls: [],
      latencyMs: 42,
    };
  }
}

const answer = (overrides: Partial<SofiaTurn>): SofiaTurn => ({
  reply: "Bonjour !",
  language: "fr",
  intent: "GENERAL_INFORMATION",
  intentLevel: "LOW",
  action: { type: "none" },
  ...overrides,
});

let contacts = 0;

async function openConversation(organizationId: string, text: string, options: { lead?: Partial<typeof leads.$inferInsert> } = {}) {
  return withTenant(organizationId, async (tx) => {
    const phone = `+336399801${String((contacts += 1)).padStart(2, "0")}`;
    const [lead] = await tx
      .insert(leads)
      .values({ organizationId, phone, source: "WHATSAPP", channel: "WHATSAPP", ...options.lead })
      .returning({ id: leads.id });
    const [conversation] = await tx
      .insert(conversations)
      .values({ organizationId, leadId: lead!.id, channel: "WHATSAPP", lastMessageAt: new Date(), lastInboundAt: new Date() })
      .returning({ id: conversations.id });
    await tx.insert(messages).values({ organizationId, conversationId: conversation!.id, direction: "INBOUND", authorType: "CONTACT", body: text, status: "RECEIVED" });
    return { leadId: lead!.id, conversationId: conversation!.id };
  });
}

async function setSofiaStatus(organizationId: string, status: "ACTIVE" | "INACTIVE" | "PAUSED") {
  await withTenant(organizationId, (tx) => tx.update(organizations).set({ sofiaStatus: status }).where(eq(organizations.id, organizationId)));
}

const outbound = (organizationId: string, conversationId: string) =>
  withTenant(organizationId, (tx) =>
    tx
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), eq(messages.direction, "OUTBOUND")))
      .orderBy(desc(messages.createdAt)),
  );

describe("knowledge base", () => {
  let owner: Awaited<ReturnType<typeof createEstablishment>>;
  let other: Awaited<ReturnType<typeof createEstablishment>>;

  beforeAll(async () => {
    owner = await createEstablishment("Institut Savoir");
    other = await createEstablishment("Institut Voisin");
  });

  it("manages questions and answers, linked to a service of this establishment only", async () => {
    const serviceId = await createService(owner.ctx, { name: "Soin éclat", category: null, description: null, priceType: "FIXED", priceCents: 8_000, durationMinutes: 60, preparation: null, contraindications: null, requiresConsultation: false }, meta);
    const foreignService = await createService(other.ctx, { name: "Soin voisin", category: null, description: null, priceType: "FIXED", priceCents: 5_000, durationMinutes: 30, preparation: null, contraindications: null, requiresConsultation: false }, meta);

    const faqId = await createFaq(owner.ctx, { question: "Avez-vous un parking ?", answer: "Oui, gratuit au sous-sol.", language: "fr", serviceId: null }, meta);
    await updateFaq(owner.ctx, faqId, { question: "Avez-vous un parking ?", answer: "Oui, gratuit au sous-sol, accès rue Victor-Hugo.", language: "fr", serviceId }, meta);
    const faqs = await withTenant(owner.organizationId, (tx) => listFaqs(tx, owner.organizationId));
    expect(faqs).toEqual([expect.objectContaining({ id: faqId, serviceName: "Soin éclat", answer: expect.stringContaining("Victor-Hugo") })]);

    // A service id from another establishment is refused, even typed by hand.
    await expect(createFaq(owner.ctx, { question: "Question", answer: "Réponse", language: "fr", serviceId: foreignService }, meta)).rejects.toMatchObject({ code: "NOT_FOUND" });
    // And another establishment can neither read nor change this FAQ.
    expect(await withTenant(other.organizationId, (tx) => listFaqs(tx, other.organizationId))).toEqual([]);
    await expect(deleteFaq(other.ctx, faqId, meta)).rejects.toMatchObject({ code: "NOT_FOUND" });

    await deleteFaq(owner.ctx, faqId, meta);
    expect(await withTenant(owner.organizationId, (tx) => listFaqs(tx, owner.organizationId))).toEqual([]);
  });

  it("is written by owners and admins only", async () => {
    const staff = await addMember(owner.organizationId, "STAFF");
    await expect(createFaq(staff.ctx, { question: "Question ?", answer: "Réponse.", language: "fr", serviceId: null }, meta)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createDocument(staff.ctx, { title: "Protocole", content: "Un texte de plus de vingt caractères." }, meta)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(testSofia(staff.ctx, [{ author: "customer", text: "Bonjour" }])).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("stores promotion days in the establishment's time zone, last day included", async () => {
    await createPromotion(owner.ctx, { title: "-20 % sur le soin éclat", description: null, serviceId: null, startsOn: "2026-11-01", endsOn: "2026-11-30" }, meta);
    const [promotion] = await withTenant(owner.organizationId, (tx) => listPromotions(tx, owner.organizationId));
    // Europe/Paris, winter time (UTC+1).
    expect(promotion?.startsAt?.toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(promotion?.endsAt?.toISOString()).toBe("2026-11-30T23:00:00.000Z");

    const snapshot = (now: string) => withTenant(owner.organizationId, (tx) => loadKnowledgeSnapshot(tx, { ...owner.ctx.organization }, new Date(now)));
    expect((await snapshot("2026-10-20T12:00:00Z")).promotions).toEqual([]);
    expect((await snapshot("2026-11-15T12:00:00Z")).promotions).toEqual([expect.objectContaining({ title: "-20 % sur le soin éclat", endsOn: "2026-11-30" })]);
    expect((await snapshot("2026-12-01T12:00:00Z")).promotions).toEqual([]);
  });

  it("links practitioners to services and archives them", async () => {
    const [service] = await withTenant(owner.organizationId, (tx) => tx.select({ id: services.id }).from(services).where(eq(services.organizationId, owner.organizationId)));
    const id = await createPractitioner(owner.ctx, { name: "Dre Claire Martin", title: "médecin esthétique", bio: null, serviceIds: [service!.id, service!.id] }, meta);
    expect(await withTenant(owner.organizationId, (tx) => listPractitioners(tx, owner.organizationId))).toEqual([expect.objectContaining({ id, serviceIds: [service!.id] })]);
    await archivePractitioner(owner.ctx, id, meta);
    expect(await withTenant(owner.organizationId, (tx) => listPractitioners(tx, owner.organizationId))).toEqual([]);
  });

  it("only gives SOFIA current and upcoming closures", async () => {
    await createClosure(owner.ctx, { startsOn: "2026-08-01", endsOn: "2026-08-15", reason: "Congés d'été" }, meta);
    await createClosure(owner.ctx, { startsOn: "2026-12-24", endsOn: "2026-12-26", reason: "Noël" }, meta);
    const snapshot = await withTenant(owner.organizationId, (tx) => loadKnowledgeSnapshot(tx, owner.ctx.organization, new Date("2026-10-14T10:00:00Z")));
    expect(snapshot.closures).toEqual([{ startsOn: "2026-12-24", endsOn: "2026-12-26", reason: "Noël" }]);
  });

  it("splits documents into passages SOFIA can search, isolated per establishment", async () => {
    const content = [
      "Cartes cadeaux. Elles sont valables douze mois à compter de l'achat et s'utilisent sur tous les soins esthétiques.",
      "Une carte perdue ne peut pas être remplacée.",
      "Épilation : prévoyez de raser la zone la veille, sans cire ni crème dépilatoire pendant les quatre semaines précédentes. ".repeat(10),
    ].join("\n\n");
    const documentId = await createDocument(owner.ctx, { title: "Infos pratiques", content }, meta);
    const [document] = await withTenant(owner.organizationId, (tx) => listDocuments(tx, owner.organizationId));
    expect(document).toMatchObject({ id: documentId, status: "READY" });
    expect(document!.chunkCount).toBeGreaterThan(1);

    const search = databaseKnowledgeSearch(owner.organizationId);
    expect((await search("Combien de temps est valable une carte cadeau ?"))[0]?.content).toContain("valables douze mois");
    // Accents and case do not matter.
    expect((await search("EPILATION creme depilatoire"))[0]?.content).toContain("crème dépilatoire");
    expect(await search("hammam")).toEqual([]);

    // Another establishment finds nothing, and cannot even see the passages.
    expect(await databaseKnowledgeSearch(other.organizationId)("carte cadeau")).toEqual([]);
    expect(await withTenant(other.organizationId, (tx) => tx.select().from(knowledgeChunks))).toEqual([]);

    // Editing replaces the passages; deleting removes them.
    await updateDocument(owner.ctx, documentId, { title: "Infos pratiques", content: "Le hammam est ouvert le samedi matin uniquement." }, meta);
    expect((await search("hammam"))[0]?.content).toContain("samedi matin");
    expect(await search("carte cadeau")).toEqual([]);
    await deleteDocument(owner.ctx, documentId, meta);
    expect(await withTenant(owner.organizationId, (tx) => tx.select().from(knowledgeChunks))).toEqual([]);
  });
});

describe("SOFIA on a live conversation", () => {
  let owner: Awaited<ReturnType<typeof createEstablishment>>;
  let serviceSlug: string;

  beforeAll(async () => {
    owner = await createEstablishment("Institut Orchidée");
    await saveEstablishmentProfile(
      owner.ctx,
      {
        assistantName: "Sofia",
        description: null,
        tone: null,
        addressLine: "12 rue des Lilas",
        postalCode: "69003",
        city: "Lyon",
        phone: "04 78 00 00 00",
        email: "bonjour@institut-orchidee.example",
        websiteUrl: null,
        instagramHandle: null,
        cancellationPolicy: null,
        bookingPolicy: null,
        importantInfo: null,
        medicalReferent: "la Dre Morel",
      },
      meta,
    );
    await saveOpeningHours(owner.ctx, [{ day: 1, opensAt: "09:00", closesAt: "19:00" }], meta);
    await createService(owner.ctx, { name: "Soin visage éclat", category: "Visage", description: null, priceType: "FIXED", priceCents: 8_500, durationMinutes: 60, preparation: null, contraindications: null, requiresConsultation: false }, meta);
    const [service] = await withTenant(owner.organizationId, (tx) => tx.select({ slug: services.slug }).from(services).where(eq(services.organizationId, owner.organizationId)));
    serviceSlug = service!.slug;
    await setSofiaStatus(owner.organizationId, "ACTIVE");
  });

  it("stays silent until SOFIA is active, and while the team has the conversation", async () => {
    const { conversationId } = await openConversation(owner.organizationId, "Bonjour");
    const provider = new QueueProvider([]);
    await setSofiaStatus(owner.organizationId, "PAUSED");
    expect(await handleInboundMessage(owner.organizationId, conversationId, { provider })).toEqual({ status: "skipped", reason: "sofia_inactive" });
    await setSofiaStatus(owner.organizationId, "ACTIVE");

    await withTenant(owner.organizationId, (tx) => tx.update(conversations).set({ handlingMode: "HUMAN_ACTIVE" }).where(eq(conversations.id, conversationId)));
    expect(await handleInboundMessage(owner.organizationId, conversationId, { provider })).toEqual({ status: "skipped", reason: "human_active" });
    expect(provider.requests).toHaveLength(0);
  });

  it("answers with the establishment's knowledge and stores the reply for the channel to deliver", async () => {
    const { conversationId } = await openConversation(owner.organizationId, "Combien coûte le soin visage ?");
    const provider = new QueueProvider([answer({ reply: "Le soin visage éclat est à 85 €, pour une heure.", intent: "PRICE_REQUEST", intentLevel: "MEDIUM" })]);
    const outcome = await handleInboundMessage(owner.organizationId, conversationId, { provider });
    expect(outcome.status).toBe("answered");

    expect(provider.requests[0]!.establishmentPrompt).toContain("- Prix : 85 €");
    expect(provider.requests[0]!.conversation).toEqual([{ author: "customer", text: "Combien coûte le soin visage ?" }]);
    const [reply] = await outbound(owner.organizationId, conversationId);
    expect(reply).toMatchObject({ authorType: "AI", status: "PENDING", body: "Le soin visage éclat est à 85 €, pour une heure." });
    expect(reply!.aiMetadata).toMatchObject({ model: "queue-model", intent: "PRICE_REQUEST", guard: { replaced: false } });
    const [conversation] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.id, conversationId)));
    expect(conversation).toMatchObject({ intent: "PRICE_REQUEST", intentLevel: "MEDIUM", language: "fr", humanRequestedAt: null });
    const events = await withTenant(owner.organizationId, (tx) => tx.select().from(eventLogs).where(and(eq(eventLogs.entityId, conversationId), eq(eventLogs.type, "AI_RESPONSE"))));
    expect(events).toHaveLength(1);
  });

  it("hands medical questions to the team, urgently when needed", async () => {
    const { conversationId } = await openConversation(owner.organizationId, "Depuis mon soin ma peau brûle et a gonflé.");
    const provider = new QueueProvider([
      answer({
        reply: "C'est une question pour la Dre Morel. En cas de douleur, appelez le 04 78 00 00 00. Je transmets tout de suite.",
        intent: "MEDICAL_QUESTION",
        action: { type: "handoff", reason: "medical", urgency: "high", summary: "Brûlure et gonflement après un soin." },
      }),
    ]);
    await handleInboundMessage(owner.organizationId, conversationId, { provider });

    const [conversation] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.id, conversationId)));
    expect(conversation?.humanRequestedAt).not.toBeNull();
    expect(conversation?.intent).toBe("MEDICAL_QUESTION");
    const sent = await withTenant(owner.organizationId, (tx) =>
      tx.select().from(notifications).where(and(eq(notifications.entityId, conversationId), eq(notifications.type, "HUMAN_REQUESTED"))),
    );
    expect(sent[0]).toMatchObject({ title: "Urgent · Question médicale à traiter", body: "Brûlure et gonflement après un soin." });
  });

  it("records a booking request on the lead, without overwriting what the team entered", async () => {
    const { conversationId, leadId } = await openConversation(owner.organizationId, "Je voudrais un soin visage jeudi après-midi, Marie Dupont, marie@example.org", {
      lead: { lastName: "Dupond-Martin" },
    });
    const provider = new QueueProvider([
      answer({
        reply: "Merci Marie, je transmets votre demande : l'équipe vous confirme le créneau très vite.",
        intent: "BOOKING_REQUEST",
        intentLevel: "READY_TO_BOOK",
        action: { type: "booking_request", serviceSlug, isNewClient: true, preferredDays: ["thursday"], period: "afternoon", firstName: "Marie", lastName: "Dupont", email: "marie@example.org", notes: null },
      }),
    ]);
    await handleInboundMessage(owner.organizationId, conversationId, { provider });

    const [lead] = await withTenant(owner.organizationId, (tx) => tx.select().from(leads).where(eq(leads.id, leadId)));
    expect(lead).toMatchObject({ firstName: "Marie", lastName: "Dupond-Martin", email: "marie@example.org", status: "BOOKING_PENDING", intentLevel: "READY_TO_BOOK" });
    expect(lead?.interestedServiceId).not.toBeNull();
    const [change] = await withTenant(owner.organizationId, (tx) => tx.select().from(leadStatusChanges).where(eq(leadStatusChanges.leadId, leadId)));
    expect(change).toMatchObject({ fromStatus: "NEW", toStatus: "BOOKING_PENDING", actorType: "AI" });
    const [hot] = await withTenant(owner.organizationId, (tx) => tx.select().from(notifications).where(and(eq(notifications.entityId, conversationId), eq(notifications.type, "HOT_LEAD"))));
    expect(hot?.body).toBe("Marie Dupont · jeudi, l'après-midi");
  });

  it("applies an opt-out immediately, with proof", async () => {
    const { conversationId, leadId } = await openConversation(owner.organizationId, "Arrêtez de m'écrire s'il vous plaît.");
    const provider = new QueueProvider([answer({ reply: "C'est noté, vous ne recevrez plus de messages de notre part.", intent: "FOLLOW_UP", action: { type: "opt_out" } })]);
    await handleInboundMessage(owner.organizationId, conversationId, { provider });
    const [lead] = await withTenant(owner.organizationId, (tx) => tx.select().from(leads).where(eq(leads.id, leadId)));
    expect(lead?.optedOutAt).not.toBeNull();
    expect(lead?.marketingConsent).toBe("WITHDRAWN");
    const [record] = await withTenant(owner.organizationId, (tx) => tx.select().from(consentRecords).where(eq(consentRecords.leadId, leadId)));
    expect(record).toMatchObject({ purpose: "MARKETING", status: "WITHDRAWN", source: "sofia_conversation" });
  });

  it("never sends an invented price: the reply is replaced and the team is warned", async () => {
    const { conversationId } = await openConversation(owner.organizationId, "Et le soin corps, c'est combien ?");
    const provider = new QueueProvider([answer({ reply: "Le soin corps est à 70 €.", intent: "PRICE_REQUEST" })]);
    await handleInboundMessage(owner.organizationId, conversationId, { provider });
    const [reply] = await outbound(owner.organizationId, conversationId);
    expect(reply?.body).toContain("vérifier ce point avec l'équipe");
    expect(reply?.aiMetadata).toMatchObject({ guard: { replaced: true, originalReply: "Le soin corps est à 70 €." } });
    const [conversation] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.id, conversationId)));
    expect(conversation?.humanRequestedAt).not.toBeNull();
  });

  it("leaves the conversation to the team when no model can answer", async () => {
    const { conversationId } = await openConversation(owner.organizationId, "Bonjour, vous êtes ouverts lundi ?");
    expect(await handleInboundMessage(owner.organizationId, conversationId, { provider: new QueueProvider([new LlmUnavailableError("overloaded")]) })).toEqual({
      status: "failed",
      reason: "unavailable",
    });
    expect(await outbound(owner.organizationId, conversationId)).toEqual([]);
    const [conversation] = await withTenant(owner.organizationId, (tx) => tx.select().from(conversations).where(eq(conversations.id, conversationId)));
    expect(conversation?.humanRequestedAt).not.toBeNull();
    const warned = await withTenant(owner.organizationId, (tx) => tx.select().from(notifications).where(eq(notifications.entityId, conversationId)));
    expect(warned[0]?.title).toBe("SOFIA n'a pas pu répondre");
  });
});

describe("Tester SOFIA", () => {
  afterEach(() => {
    delete process.env.AI_PROVIDER;
    resetEnvCache();
    resetLlmProvider();
  });

  it("says plainly when no model is configured", async () => {
    const { ctx } = await createEstablishment("Institut Console");
    const result = await testSofia(ctx, [{ author: "customer", text: "Bonjour" }]);
    expect(result).toEqual({ status: "unavailable", message: expect.stringContaining("clé API Anthropic") });
  });

  it("answers from the real knowledge base without sending or executing anything", async () => {
    process.env.AI_PROVIDER = "scripted";
    resetEnvCache();
    resetLlmProvider();
    const { ctx, organizationId } = await createEstablishment("Institut Console Test");
    const result = await testSofia(ctx, [{ author: "customer", text: "J'ai une rougeur après mon soin, c'est normal ?" }]);
    expect(result).toMatchObject({ status: "answered", intent: "MEDICAL_QUESTION", action: { type: "handoff", reason: "medical" } });
    // Nothing was stored as a conversation, and nobody was notified.
    expect(await withTenant(organizationId, (tx) => tx.select().from(conversations))).toEqual([]);
    expect(await withTenant(organizationId, (tx) => tx.select().from(notifications))).toEqual([]);

    const blocked = await testSofia(ctx, [{ author: "customer", text: "Combien ? #prix-invente" }]);
    expect(blocked).toMatchObject({ status: "answered", replaced: true, originalReply: "[Mode test] Ce soin coûte 999 €." });
  });
});
