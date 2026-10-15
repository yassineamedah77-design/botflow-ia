import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { withTenant, type Transaction } from "@/server/db/context";
import { consentRecords, conversations, leadStatusChanges, leads, messages, organizations, services } from "@/server/db/schema";
import { recordEvent, recordEventDetached } from "@/server/observability/audit";
import { logger } from "@/server/observability/logger";
import { notify } from "@/server/services/notifications";

import { applyGuards, type GuardViolation } from "./guards";
import { databaseKnowledgeSearch, loadKnowledgeSnapshot, type KnowledgeSearch, type KnowledgeSnapshot, type SearchHit } from "./knowledge";
import { buildEstablishmentPrompt, buildTurnContext, PLATFORM_PROMPT, PROMPT_VERSION, type TurnCustomer } from "./prompt";
import {
  LlmNotConfiguredError,
  LlmUnavailableError,
  LlmUnusableAnswerError,
  type ConversationTurn,
  type LlmProvider,
  type LlmTool,
  type LlmToolCall,
  type LlmUsage,
} from "./provider";
import { sofiaTurnSchema, type HandoffAction, type SofiaTurn } from "./reply";

/*
 * The AI Orchestrator: one customer message in, one checked answer out.
 *
 *   knowledge snapshot → layered prompt → model (+ read-only search tool)
 *   → structured answer → deterministic guards → actions applied by code.
 *
 * The model proposes; the code decides. Nothing the model writes is ever
 * executed: actions are validated fields, applied here with the tenant's
 * rights, and a medical question or an unverifiable answer always reaches a
 * human.
 */

/** Messages sent to the model: enough context, bounded cost. */
const HISTORY_LIMIT = 40;
const MAX_MESSAGE_LENGTH = 4000;

export type TurnChannel = "WHATSAPP" | "INSTAGRAM" | "WEBSITE" | "TEST";

export interface RunTurnInput {
  provider: LlmProvider | null;
  snapshot: KnowledgeSnapshot;
  /** Oldest first, ending with the customer's message to answer. */
  conversation: ConversationTurn[];
  customer: TurnCustomer | null;
  channel: TurnChannel;
  search: KnowledgeSearch;
  humanAlreadyRequested?: boolean;
  now?: Date;
  requestId?: string;
}

export interface TurnTrace {
  provider: string;
  model: string;
  usedFallback: boolean;
  usage: LlmUsage;
  latencyMs: number;
  toolCalls: LlmToolCall[];
  promptVersion: string;
}

export type RunTurnResult =
  | {
      status: "answered";
      turn: SofiaTurn;
      violations: GuardViolation[];
      replaced: boolean;
      originalReply: string | null;
      adjustments: string[];
      searches: Array<{ query: string; hits: number }>;
      trace: TurnTrace;
    }
  | {
      status: "failed";
      reason: "not_configured" | "unavailable" | "refusal" | "invalid_output" | "too_long" | "too_many_tool_calls";
      detail: string;
    };

const searchInput = z.object({ query: z.string().trim().min(2).max(300) }).strict();

function searchTool(search: KnowledgeSearch, collected: SearchHit[], searches: Array<{ query: string; hits: number }>): LlmTool {
  return {
    name: "search_knowledge_base",
    description:
      "Cherche dans les documents de référence de l'établissement (protocoles, conditions, politiques détaillées). " +
      "Appelle cet outil quand la question de la cliente n'est couverte ni par la fiche de l'établissement ni par sa FAQ, " +
      "avant de répondre que tu ne sais pas. Formule la requête avec les mots-clés de la question, dans la langue des documents (souvent le français). " +
      "Ne l'appelle pas pour les prix, horaires ou prestations : ils sont déjà dans la fiche.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Mots-clés de la question, par exemple « carte cadeau validité »." } },
      required: ["query"],
      additionalProperties: false,
    },
    parseInput: (input) => {
      const parsed = searchInput.safeParse(input);
      return parsed.success ? { success: true, data: parsed.data } : { success: false, error: "query must be 2 to 300 characters" };
    },
    run: async (input) => {
      const { query } = input as z.infer<typeof searchInput>;
      const hits = await search(query);
      searches.push({ query, hits: hits.length });
      collected.push(...hits);
      if (hits.length === 0) return "Aucun passage trouvé dans les documents de l'établissement.";
      return JSON.stringify(hits.map((hit) => ({ document: hit.documentTitle, passage: hit.content })));
    },
  };
}

/** Leading messages from the establishment move to the context: the model's conversation starts with the customer. */
export function splitConversation(conversation: ConversationTurn[]) {
  const firstCustomer = conversation.findIndex((turn) => turn.author === "customer");
  if (firstCustomer === -1) return null;
  const opening = conversation.slice(0, firstCustomer).map((turn) => turn.text);
  let rest = conversation.slice(firstCustomer).map((turn) => ({ ...turn, text: turn.text.slice(0, MAX_MESSAGE_LENGTH) }));
  if (rest.length > HISTORY_LIMIT) {
    rest = rest.slice(-HISTORY_LIMIT);
    const start = rest.findIndex((turn) => turn.author === "customer");
    rest = rest.slice(Math.max(0, start));
  }
  if (rest.at(-1)?.author !== "customer") return null;
  return { opening, conversation: rest };
}

export async function runSofiaTurn(input: RunTurnInput): Promise<RunTurnResult> {
  if (!input.provider) return { status: "failed", reason: "not_configured", detail: "No language model is configured." };
  const split = splitConversation(input.conversation);
  if (!split) throw new Error("runSofiaTurn needs a conversation ending with a customer message.");

  const hits: SearchHit[] = [];
  const searches: Array<{ query: string; hits: number }> = [];
  const now = input.now ?? new Date();

  let result;
  try {
    result = await input.provider.generate({
      platformPrompt: PLATFORM_PROMPT,
      establishmentPrompt: buildEstablishmentPrompt(input.snapshot),
      turnContext: buildTurnContext({
        now,
        timezone: input.snapshot.organization.timezone,
        channel: input.channel,
        customer: input.customer,
        openingMessages: split.opening,
        humanAlreadyRequested: input.humanAlreadyRequested ?? false,
      }),
      conversation: split.conversation,
      tools: input.snapshot.documentCount > 0 ? [searchTool(input.search, hits, searches)] : [],
      output: sofiaTurnSchema,
      requestId: input.requestId,
    });
  } catch (error) {
    if (error instanceof LlmNotConfiguredError) return { status: "failed", reason: "not_configured", detail: error.message };
    if (error instanceof LlmUnavailableError) return { status: "failed", reason: "unavailable", detail: error.message };
    if (error instanceof LlmUnusableAnswerError) return { status: "failed", reason: error.reason, detail: error.message };
    throw error;
  }

  const customerText = split.conversation
    .filter((turn) => turn.author === "customer")
    .map((turn) => turn.text)
    .join("\n");
  const guarded = applyGuards(result.output, {
    snapshot: input.snapshot,
    searchHits: hits,
    customerEmail: input.customer?.email ?? null,
    customerText,
  });

  return {
    status: "answered",
    turn: guarded.turn,
    violations: guarded.violations,
    replaced: guarded.replaced,
    originalReply: guarded.originalReply,
    adjustments: guarded.adjustments,
    searches,
    trace: {
      provider: result.provider,
      model: result.model,
      usedFallback: result.usedFallback,
      usage: result.usage,
      latencyMs: result.latencyMs,
      toolCalls: result.toolCalls,
      promptVersion: PROMPT_VERSION,
    },
  };
}

// ─── Live conversations ─────────────────────────────────────────────────────

export type InboundOutcome =
  | { status: "answered"; messageId: string; turn: SofiaTurn }
  | { status: "skipped"; reason: "sofia_inactive" | "human_active" | "nothing_to_answer" | "not_found" }
  | { status: "failed"; reason: Extract<RunTurnResult, { status: "failed" }>["reason"] };

const HANDOFF_TITLES: Record<HandoffAction["reason"], string> = {
  medical: "Question médicale à traiter",
  complaint: "Réclamation d'une cliente",
  price_unknown: "Tarif à confirmer",
  human_request: "Une cliente demande à parler à l'équipe",
  out_of_scope: "Demande hors du cadre de SOFIA",
  manipulation: "Message suspect transmis par SOFIA",
  other: "SOFIA passe la main",
};

const WEEKDAY_FR: Record<string, string> = {
  monday: "lundi",
  tuesday: "mardi",
  wednesday: "mercredi",
  thursday: "jeudi",
  friday: "vendredi",
  saturday: "samedi",
  sunday: "dimanche",
};

function bookingSummary(turn: SofiaTurn) {
  if (turn.action.type !== "booking_request") return "";
  const { action } = turn;
  const days = action.preferredDays.length ? action.preferredDays.map((day) => WEEKDAY_FR[day]).join(", ") : "jours flexibles";
  const period = { morning: "le matin", afternoon: "l'après-midi", any: "à tout moment" }[action.period];
  return `${action.firstName} ${action.lastName}`.trim() + ` · ${days}, ${period}` + (action.notes ? ` · ${action.notes}` : "");
}

async function loadConversation(tx: Transaction, organizationId: string, conversationId: string) {
  const [organization] = await tx
    .select({
      id: organizations.id,
      name: organizations.name,
      sofiaStatus: organizations.sofiaStatus,
      timezone: organizations.timezone,
      defaultLanguage: organizations.defaultLanguage,
      allowedLanguages: organizations.allowedLanguages,
      currency: organizations.currency,
      isDemo: organizations.isDemo,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  const [conversation] = await tx
    .select({
      id: conversations.id,
      leadId: conversations.leadId,
      channel: conversations.channel,
      handlingMode: conversations.handlingMode,
      humanRequestedAt: conversations.humanRequestedAt,
    })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.organizationId, organizationId)))
    .limit(1);
  if (!organization || !conversation) return null;
  const [lead] = await tx
    .select({
      id: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      email: leads.email,
      status: leads.status,
      isExistingClient: leads.isExistingClient,
      optedOutAt: leads.optedOutAt,
      marketingConsent: leads.marketingConsent,
      interestedServiceId: leads.interestedServiceId,
    })
    .from(leads)
    .where(eq(leads.id, conversation.leadId))
    .limit(1);
  const recent = await tx
    .select({ id: messages.id, direction: messages.direction, authorType: messages.authorType, body: messages.body })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(HISTORY_LIMIT + 10);
  return { organization, conversation, lead: lead ?? null, history: recent.reverse() };
}

/**
 * Answers the last inbound message of a conversation. Called by the channel
 * adapters (website widget, WhatsApp, Instagram: phases 4 to 6) once the
 * inbound message is stored. The answer is stored as a PENDING outbound
 * message: delivering it is the channel adapter's job.
 *
 * SOFIA stays silent when she is not active for the establishment or when a
 * team member has taken the conversation over.
 */
export async function handleInboundMessage(
  organizationId: string,
  conversationId: string,
  options: { provider: LlmProvider | null; now?: Date; search?: KnowledgeSearch },
): Promise<InboundOutcome> {
  const now = options.now ?? new Date();
  const loaded = await withTenant(organizationId, async (tx) => {
    const data = await loadConversation(tx, organizationId, conversationId);
    if (!data) return null;
    return { ...data, snapshot: await loadKnowledgeSnapshot(tx, data.organization, now) };
  });
  if (!loaded) return { status: "skipped", reason: "not_found" };
  const { organization, conversation, lead, history, snapshot } = loaded;
  if (organization.sofiaStatus !== "ACTIVE") return { status: "skipped", reason: "sofia_inactive" };
  if (conversation.handlingMode === "HUMAN_ACTIVE") return { status: "skipped", reason: "human_active" };

  const turns: ConversationTurn[] = history
    .filter((message) => message.body && message.authorType !== "SYSTEM")
    .map((message) => ({
      author: message.direction === "INBOUND" ? "customer" : message.authorType === "AI" ? "assistant" : "team",
      text: message.body!,
    }));
  const lastInbound = [...history].reverse().find((message) => message.direction === "INBOUND");
  if (turns.at(-1)?.author !== "customer" || !lastInbound) return { status: "skipped", reason: "nothing_to_answer" };

  const result = await runSofiaTurn({
    provider: options.provider,
    snapshot,
    conversation: turns,
    customer: lead
      ? { firstName: lead.firstName, lastName: lead.lastName, email: lead.email, isExistingClient: lead.isExistingClient, optedOut: Boolean(lead.optedOutAt) }
      : null,
    channel: conversation.channel,
    search: options.search ?? databaseKnowledgeSearch(organizationId),
    humanAlreadyRequested: Boolean(conversation.humanRequestedAt),
    now,
    requestId: conversationId,
  });

  if (result.status === "failed") {
    // No answer is better than a wrong one: the team takes over, and sees why.
    await withTenant(organizationId, async (tx) => {
      await tx.update(conversations).set({ humanRequestedAt: now, updatedAt: now }).where(eq(conversations.id, conversationId));
      await notify(tx, {
        organizationId,
        type: "HUMAN_REQUESTED",
        title: "SOFIA n'a pas pu répondre",
        body: result.reason === "not_configured" ? "Le moteur d'IA n'est pas configuré : répondez à cette cliente." : "Répondez à cette cliente : SOFIA n'a pas pu formuler de réponse fiable.",
        linkUrl: `/inbox?conversation=${conversationId}`,
        entityType: "conversation",
        entityId: conversationId,
        recipients: "team",
      });
    });
    await recordEventDetached({
      organizationId,
      type: "AI_ERROR",
      level: result.reason === "unavailable" || result.reason === "not_configured" ? "ERROR" : "WARN",
      message: `SOFIA could not answer: ${result.reason}`,
      entityType: "conversation",
      entityId: conversationId,
      details: { reason: result.reason, detail: result.detail },
    });
    return { status: "failed", reason: result.reason };
  }

  const { turn } = result;
  const messageId = await withTenant(organizationId, async (tx) => {
    const [stored] = await tx
      .insert(messages)
      .values({
        organizationId,
        conversationId,
        direction: "OUTBOUND",
        authorType: "AI",
        body: turn.reply,
        status: "PENDING",
        aiMetadata: {
          ...result.trace,
          language: turn.language,
          intent: turn.intent,
          intentLevel: turn.intentLevel,
          action: turn.action,
          guard: { violations: result.violations, replaced: result.replaced, originalReply: result.originalReply, adjustments: result.adjustments },
          searches: result.searches,
        },
      })
      .returning({ id: messages.id });
    await tx.update(messages).set({ intent: turn.intent }).where(eq(messages.id, lastInbound.id));

    const handoff = turn.action.type === "handoff" || turn.action.type === "booking_request";
    await tx
      .update(conversations)
      .set({
        intent: turn.intent,
        intentLevel: turn.intentLevel,
        language: turn.language,
        lastMessageAt: now,
        lastOutboundAt: now,
        lastMessagePreview: turn.reply.slice(0, 160),
        ...(handoff ? { humanRequestedAt: now } : {}),
        updatedAt: now,
      })
      .where(eq(conversations.id, conversationId));

    if (lead) await applyLeadEffects(tx, organizationId, lead, conversation.channel, turn, stored!.id, now);
    await notifyTeam(tx, organizationId, conversationId, lead?.id ?? null, turn);
    await recordEvent(tx, {
      organizationId,
      type: "AI_RESPONSE",
      message: `SOFIA answered (${turn.intent}, action ${turn.action.type})`,
      entityType: "conversation",
      entityId: conversationId,
      durationMs: result.trace.latencyMs,
      details: { model: result.trace.model, usage: result.trace.usage, usedFallback: result.trace.usedFallback, replaced: result.replaced, violations: result.violations.length },
    });
    return stored!.id;
  });

  if (result.replaced) logger.warn("SOFIA reply replaced by a guard", { organizationId, conversationId, violations: result.violations });
  return { status: "answered", messageId, turn };
}

type LeadRow = NonNullable<NonNullable<Awaited<ReturnType<typeof loadConversation>>>["lead"]>;

async function applyLeadEffects(tx: Transaction, organizationId: string, lead: LeadRow, channel: TurnChannel, turn: SofiaTurn, messageId: string, now: Date) {
  const changes: Partial<typeof leads.$inferInsert> = { intentLevel: turn.intentLevel, language: turn.language, lastInteractionAt: now, updatedAt: now };

  if (turn.action.type === "booking_request") {
    const action = turn.action;
    // What the customer said about herself fills blanks; it never overwrites what the team entered.
    if (!lead.firstName && action.firstName) changes.firstName = action.firstName.slice(0, 80);
    if (!lead.lastName && action.lastName) changes.lastName = action.lastName.slice(0, 80);
    if (!lead.email && action.email) changes.email = action.email.slice(0, 200);
    const [service] = await tx
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.organizationId, organizationId), eq(services.slug, action.serviceSlug)))
      .limit(1);
    if (service) changes.interestedServiceId = service.id;
    // Only a lead still being worked moves to "booking pending".
    if (["NEW", "CONTACTED", "QUALIFIED", "HOT", "LOST", "REACTIVATION"].includes(lead.status)) {
      changes.status = "BOOKING_PENDING";
      await tx.insert(leadStatusChanges).values({
        organizationId,
        leadId: lead.id,
        fromStatus: lead.status,
        toStatus: "BOOKING_PENDING",
        actorType: "AI",
        reason: "Demande de rendez-vous recueillie par SOFIA",
      });
    }
  }

  if (turn.action.type === "opt_out" && !lead.optedOutAt) {
    changes.optedOutAt = now;
    changes.marketingConsent = "WITHDRAWN";
    changes.marketingConsentUpdatedAt = now;
    await tx.insert(consentRecords).values({
      organizationId,
      leadId: lead.id,
      purpose: "MARKETING",
      status: "WITHDRAWN",
      channel: channel === "TEST" ? null : channel,
      source: "sofia_conversation",
      proof: { messageId, at: now.toISOString() },
    });
  }

  await tx.update(leads).set(changes).where(eq(leads.id, lead.id));
}

async function notifyTeam(tx: Transaction, organizationId: string, conversationId: string, leadId: string | null, turn: SofiaTurn) {
  const linkUrl = `/inbox?conversation=${conversationId}`;
  if (turn.action.type === "handoff") {
    await notify(tx, {
      organizationId,
      type: "HUMAN_REQUESTED",
      title: (turn.action.urgency === "high" ? "Urgent · " : "") + HANDOFF_TITLES[turn.action.reason],
      body: turn.action.summary,
      linkUrl,
      entityType: "conversation",
      entityId: conversationId,
      recipients: "team",
    });
  } else if (turn.action.type === "booking_request") {
    await notify(tx, {
      organizationId,
      type: "HOT_LEAD",
      title: "Demande de rendez-vous à confirmer",
      body: bookingSummary(turn),
      linkUrl: leadId ? `/leads/${leadId}` : linkUrl,
      entityType: "conversation",
      entityId: conversationId,
      recipients: "team",
    });
  }
}
