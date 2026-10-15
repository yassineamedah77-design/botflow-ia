import "server-only";

import { and, asc, desc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";

import { formatPhone, normalizePhone } from "@/lib/phone";
import { visitorContactSchema, visitorMessageSchema } from "@/lib/validation/widget";
import { conversationReference, fillText, isOriginAllowed, pickWidgetLanguage, WIDGET_TEXTS, type WidgetLanguage } from "@/lib/widget";
import { getLlmProvider } from "@/server/ai/config";
import { handleInboundMessage, type InboundOutcome } from "@/server/ai/orchestrator";
import type { LlmProvider } from "@/server/ai/provider";
import { withTenant, type Transaction } from "@/server/db/context";
import { consentRecords, conversations, integrations, leads, messages } from "@/server/db/schema";
import { recordAudit, recordEvent } from "@/server/observability/audit";
import { logger } from "@/server/observability/logger";
import { generateToken, sha256Hex } from "@/server/security/crypto";
import { consumeRateLimit, type RateLimitPolicyName } from "@/server/security/rate-limit";
import type { RequestMeta } from "@/server/security/request";
import { notify } from "@/server/services/notifications";

import { isWidgetOpen, type PublicWidget } from "./public";

/*
 * What a website visitor can do: write, read the answers, leave contact
 * details, continue on WhatsApp. Visitors are anonymous and untrusted: a
 * random token kept in the chat window's storage is their only key, stored
 * here as a hash (conversations.external_thread_id). Every request is rate
 * limited, and the model is only called within a daily budget per
 * establishment.
 */

export type WidgetErrorCode = "not_found" | "closed" | "session" | "invalid" | "rate_limited" | "still_answering";

const STATUS: Record<WidgetErrorCode, number> = { not_found: 404, closed: 403, session: 401, invalid: 400, rate_limited: 429, still_answering: 409 };

export class WidgetError extends Error {
  readonly status: number;
  constructor(
    readonly code: WidgetErrorCode,
    readonly options: { retryAfterSeconds?: number; fields?: Record<string, string[]> } = {},
  ) {
    super(code);
    this.name = "WidgetError";
    this.status = STATUS[code];
  }
}

/** A message as the visitor sees it: never the team's internal notes or system lines. */
export interface VisitorMessage {
  id: string;
  author: "visitor" | "assistant" | "team";
  body: string;
  createdAt: string;
}

export interface VisitorState {
  sofiaActive: boolean;
  /** A team member took the conversation over: answers come from a person. */
  humanActive: boolean;
  /** SOFIA is writing an answer to the last message. */
  awaitingReply: boolean;
  /** Suggest leaving a phone number or an email (hand-over, booking request, team answering later). */
  needsContact: boolean;
  contactKnown: boolean;
  reference: string;
}

/** An answer still being written after this long is considered lost: the visitor may write again. */
const ANSWER_WINDOW_MS = 75_000;
const HISTORY_LIMIT = 100;

const hashToken = (token: string) => sha256Hex(`widget:${token}`);

function isPlausibleToken(token: string | null | undefined): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

async function limit(policy: RateLimitPolicyName, identifier: string | null) {
  if (!identifier) return;
  const result = await consumeRateLimit(policy, identifier);
  if (!result.allowed) throw new WidgetError("rate_limited", { retryAfterSeconds: result.retryAfterSeconds });
}

function assertOpen(widget: PublicWidget) {
  if (!isWidgetOpen(widget)) throw new WidgetError("closed");
}

async function findConversation(tx: Transaction, widget: PublicWidget, token: string) {
  const [conversation] = await tx
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.organizationId, widget.organizationId),
        eq(conversations.channel, "WEBSITE"),
        eq(conversations.externalThreadId, hashToken(token)),
      ),
    )
    .limit(1);
  return conversation ?? null;
}

function pageUrlForTeam(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // Query strings can carry personal data (emails in tracking links): keep the page only.
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return null;
  }
}

function toVisitorMessage(row: { id: string; direction: "INBOUND" | "OUTBOUND"; authorType: string; body: string | null; createdAt: Date }): VisitorMessage {
  return {
    id: row.id,
    author: row.direction === "INBOUND" ? "visitor" : row.authorType === "AI" ? "assistant" : "team",
    body: row.body ?? "",
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Writing ────────────────────────────────────────────────────────────────

export interface PostedMessage {
  token: string;
  conversationId: string;
  message: VisitorMessage;
  /** Whether SOFIA should answer now (active, conversation not taken over). */
  answer: boolean;
}

export async function postVisitorMessage(
  widget: PublicWidget,
  input: { token: string | null; body: unknown; language?: unknown; pageUrl?: unknown },
  meta: RequestMeta,
  now = new Date(),
): Promise<PostedMessage> {
  assertOpen(widget);
  const parsed = visitorMessageSchema.safeParse({ body: input.body, language: input.language, pageUrl: input.pageUrl });
  if (!parsed.success) throw new WidgetError("invalid");
  const { body, pageUrl } = parsed.data;
  const language: WidgetLanguage = parsed.data.language ?? pickWidgetLanguage([], widget.allowedLanguages, widget.defaultLanguage);
  await limit("widgetMessagesByIp", meta.ipAddress);

  const sofiaActive = widget.sofiaStatus === "ACTIVE";
  const resumed = isPlausibleToken(input.token)
    ? await withTenant(widget.organizationId, (tx) => findConversation(tx, widget, input.token!))
    : null;
  if (input.token && !resumed) throw new WidgetError("session");
  // Limits are checked before anything is stored: a refused message must not exist.
  if (resumed) await limit("widgetMessagesByConversation", resumed.id);
  else await limit("widgetConversationsByIp", meta.ipAddress);

  const token = resumed ? input.token! : generateToken(32);
  const result = await withTenant(widget.organizationId, async (tx) => {
    let conversation = resumed ? await findConversation(tx, widget, token) : null;

    if (conversation) {
      // One answer at a time: a second message while SOFIA is writing would get a reply that never saw it.
      const [last] = await tx
        .select({ direction: messages.direction, createdAt: messages.createdAt })
        .from(messages)
        .where(and(eq(messages.conversationId, conversation.id), ne(messages.authorType, "SYSTEM")))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(1);
      const waiting = last?.direction === "INBOUND" && now.getTime() - last.createdAt.getTime() < ANSWER_WINDOW_MS;
      if (waiting && sofiaActive && conversation.handlingMode === "AI_ACTIVE") throw new WidgetError("still_answering");
    } else {
      const [lead] = await tx
        .insert(leads)
        .values({ organizationId: widget.organizationId, source: "WEBSITE", channel: "WEBSITE", language, lastInteractionAt: now })
        .returning({ id: leads.id });
      const [created] = await tx
        .insert(conversations)
        .values({
          organizationId: widget.organizationId,
          leadId: lead!.id,
          channel: "WEBSITE",
          integrationId: widget.integrationId,
          externalThreadId: hashToken(token),
          language,
          createdAt: now,
        })
        .returning();
      conversation = created!;
      const page = pageUrlForTeam(pageUrl);
      const texts = WIDGET_TEXTS[language];
      const greeting = widget.settings.greeting ?? fillText(sofiaActive ? texts.greetingAi : texts.greetingTeam, { org: widget.organizationName, assistant: widget.assistantName });
      await tx.insert(messages).values([
        {
          organizationId: widget.organizationId,
          conversationId: conversation!.id,
          direction: "OUTBOUND",
          authorType: "SYSTEM",
          body: `Conversation ouverte depuis le widget du site${page ? ` (${page})` : ""}. Référence ${conversationReference(conversation!.id)}.`,
          status: "SENT",
          createdAt: new Date(now.getTime() - 2),
        },
        {
          // The greeting the visitor saw: SOFIA's history starts with it.
          organizationId: widget.organizationId,
          conversationId: conversation!.id,
          direction: "OUTBOUND",
          authorType: sofiaActive ? "AI" : "USER",
          body: greeting,
          status: "SENT",
          createdAt: new Date(now.getTime() - 1),
          sentAt: new Date(now.getTime() - 1),
        },
      ]);
      await notify(tx, {
        organizationId: widget.organizationId,
        type: "NEW_LEAD",
        title: "Nouvelle conversation sur votre site",
        body: body.slice(0, 140),
        linkUrl: `/inbox?conversation=${conversation!.id}`,
        entityType: "conversation",
        entityId: conversation!.id,
        recipients: "team",
      });
      await recordEvent(tx, {
        organizationId: widget.organizationId,
        type: "LEAD_CREATED",
        message: "Lead created from the website widget",
        entityType: "lead",
        entityId: lead!.id,
        details: { channel: "WEBSITE" },
      });
    }

    const [stored] = await tx
      .insert(messages)
      .values({
        organizationId: widget.organizationId,
        conversationId: conversation!.id,
        direction: "INBOUND",
        authorType: "CONTACT",
        body,
        status: "RECEIVED",
        createdAt: now,
      })
      .returning({ id: messages.id, direction: messages.direction, authorType: messages.authorType, body: messages.body, createdAt: messages.createdAt });
    await tx
      .update(conversations)
      .set({
        status: "OPEN",
        lastMessageAt: now,
        lastInboundAt: now,
        lastMessagePreview: body.slice(0, 160),
        unreadCount: sql`${conversations.unreadCount} + 1`,
        updatedAt: now,
      })
      .where(eq(conversations.id, conversation!.id));
    await tx.update(leads).set({ lastInteractionAt: now, updatedAt: now }).where(eq(leads.id, conversation!.leadId));
    await recordEvent(tx, {
      organizationId: widget.organizationId,
      type: "MESSAGE_RECEIVED",
      message: "Message received from the website widget",
      entityType: "conversation",
      entityId: conversation!.id,
      details: { channel: "WEBSITE", length: body.length },
    });
    return { conversation: conversation!, stored: stored! };
  });

  return {
    token,
    conversationId: result.conversation.id,
    message: toVisitorMessage(result.stored),
    answer: sofiaActive && result.conversation.handlingMode === "AI_ACTIVE",
  };
}

/**
 * SOFIA's answer to the visitor's last message, run after the response was
 * sent (`after()`): the chat window shows SOFIA writing and reads the answer
 * from its next poll. Over the daily budget, the team answers instead.
 */
export async function answerVisitorMessage(
  widget: PublicWidget,
  conversationId: string,
  options: { provider?: LlmProvider | null; now?: Date } = {},
): Promise<InboundOutcome> {
  const now = options.now ?? new Date();
  const budget = await consumeRateLimit("widgetAiRepliesByOrganization", widget.organizationId);
  if (!budget.allowed) {
    await withTenant(widget.organizationId, async (tx) => {
      const [conversation] = await tx
        .select({ humanRequestedAt: conversations.humanRequestedAt })
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      if (!conversation || conversation.humanRequestedAt) return;
      await tx.update(conversations).set({ humanRequestedAt: now, updatedAt: now }).where(eq(conversations.id, conversationId));
      await notify(tx, {
        organizationId: widget.organizationId,
        type: "HUMAN_REQUESTED",
        title: "Limite quotidienne de SOFIA atteinte sur le site",
        body: "SOFIA a déjà répondu au maximum de messages du widget pour aujourd'hui : répondez à cette cliente.",
        linkUrl: `/inbox?conversation=${conversationId}`,
        entityType: "conversation",
        entityId: conversationId,
        recipients: "team",
      });
    });
    logger.warn("Widget AI budget reached", { organizationId: widget.organizationId });
    return { status: "skipped", reason: "nothing_to_answer" };
  }

  const provider = options.provider === undefined ? getLlmProvider() : options.provider;
  const outcome = await handleInboundMessage(widget.organizationId, conversationId, { provider, now });
  if (outcome.status === "answered") {
    // Delivered by the widget itself: the visitor's next poll reads it.
    await withTenant(widget.organizationId, (tx) =>
      tx.update(messages).set({ status: "SENT", sentAt: new Date() }).where(eq(messages.id, outcome.messageId)),
    );
  }
  return outcome;
}

// ─── Reading ────────────────────────────────────────────────────────────────

export async function listVisitorMessages(
  widget: PublicWidget,
  input: { token: string | null; since?: string | null },
  now = new Date(),
): Promise<{ messages: VisitorMessage[]; state: VisitorState }> {
  if (!widget.organizationActive) throw new WidgetError("closed");
  if (!isPlausibleToken(input.token)) throw new WidgetError("session");
  const since = input.since ? new Date(input.since) : null;
  const sinceValid = since && !Number.isNaN(since.getTime()) ? since : null;

  return withTenant(widget.organizationId, async (tx) => {
    const conversation = await findConversation(tx, widget, input.token!);
    if (!conversation) throw new WidgetError("session");

    const visible = and(
      eq(messages.conversationId, conversation.id),
      ne(messages.authorType, "SYSTEM"),
      or(eq(messages.direction, "INBOUND"), inArray(messages.status, ["SENT", "DELIVERED", "READ"])),
    );
    const rows = sinceValid
      ? await tx
          .select()
          .from(messages)
          .where(and(visible, gte(messages.createdAt, sinceValid)))
          .orderBy(asc(messages.createdAt), asc(messages.id))
          .limit(HISTORY_LIMIT)
      : (
          await tx
            .select()
            .from(messages)
            .where(visible)
            .orderBy(desc(messages.createdAt), desc(messages.id))
            .limit(HISTORY_LIMIT)
        ).reverse();

    // What the visitor's window just received counts as delivered (shown in the inbox).
    if (rows.some((row) => row.direction === "OUTBOUND" && row.status === "SENT")) {
      await tx
        .update(messages)
        .set({ status: "DELIVERED", deliveredAt: now })
        .where(and(eq(messages.conversationId, conversation.id), eq(messages.direction, "OUTBOUND"), eq(messages.status, "SENT"), ne(messages.authorType, "SYSTEM")));
    }

    const [lead] = await tx.select({ phone: leads.phone, email: leads.email }).from(leads).where(eq(leads.id, conversation.leadId)).limit(1);
    const [lastVisible] = await tx
      .select({ direction: messages.direction, createdAt: messages.createdAt })
      .from(messages)
      .where(visible)
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(1);
    const [lastAnswer] = await tx
      .select({ aiMetadata: messages.aiMetadata })
      .from(messages)
      .where(and(eq(messages.conversationId, conversation.id), eq(messages.authorType, "AI"), sql`${messages.aiMetadata} IS NOT NULL`))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(1);

    const sofiaActive = widget.sofiaStatus === "ACTIVE";
    const humanActive = conversation.handlingMode === "HUMAN_ACTIVE";
    const contactKnown = Boolean(lead?.phone || lead?.email);
    const lastAction = (lastAnswer?.aiMetadata as { action?: { type?: string } } | null)?.action?.type;
    const awaitingReply =
      sofiaActive && !humanActive && lastVisible?.direction === "INBOUND" && now.getTime() - lastVisible.createdAt.getTime() < ANSWER_WINDOW_MS;
    const teamAnswers = !sofiaActive || humanActive || Boolean(conversation.humanRequestedAt);
    return {
      messages: rows.map(toVisitorMessage),
      state: {
        sofiaActive,
        humanActive,
        awaitingReply,
        contactKnown,
        needsContact: !contactKnown && (teamAnswers || lastAction === "handoff" || lastAction === "booking_request"),
        reference: conversationReference(conversation.id),
      },
    };
  });
}

// ─── Contact details ────────────────────────────────────────────────────────

const DATA_NOTICE = "Vos messages sont traités par l'établissement pour répondre à votre demande.";

export async function saveVisitorContact(
  widget: PublicWidget,
  input: { token: string | null; contact: unknown; language?: unknown },
  meta: RequestMeta,
  now = new Date(),
): Promise<{ saved: true }> {
  assertOpen(widget);
  if (!isPlausibleToken(input.token)) throw new WidgetError("session");
  const parsed = visitorContactSchema.safeParse(input.contact);
  if (!parsed.success) {
    const fields: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (fields[key] ??= []).push(issue.message);
    }
    throw new WidgetError("invalid", { fields });
  }
  const contact = parsed.data;
  // A filled honeypot is a bot: answer as if all went well, store nothing.
  if (contact.website) return { saved: true };
  await limit("widgetContactsByIp", meta.ipAddress);

  const phone = contact.phone ? normalizePhone(contact.phone, widget.country) : null;
  if (contact.phone && !phone) throw new WidgetError("invalid", { fields: { phone: ["Numéro invalide."] } });
  const language = pickWidgetLanguage(typeof input.language === "string" ? [input.language] : [], widget.allowedLanguages, widget.defaultLanguage);

  await withTenant(widget.organizationId, async (tx) => {
    const conversation = await findConversation(tx, widget, input.token!);
    if (!conversation) throw new WidgetError("session");
    const [visitor] = await tx.select().from(leads).where(eq(leads.id, conversation.leadId)).limit(1);
    if (!visitor) throw new WidgetError("session");

    // Someone the establishment already knows (same phone or email): the conversation joins her file.
    const known = await tx
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.organizationId, widget.organizationId),
          ne(leads.id, visitor.id),
          or(...[phone ? eq(leads.phone, phone) : undefined, contact.email ? eq(leads.email, contact.email) : undefined].filter((condition) => condition !== undefined)),
        ),
      )
      .orderBy(desc(leads.updatedAt))
      .limit(2);
    const target = known.find((lead) => phone && lead.phone === phone) ?? known[0] ?? visitor;
    const usedElsewhere = (field: "phone" | "email", value: string | null) => Boolean(value && known.some((lead) => lead.id !== target.id && lead[field] === value));

    if (target.id !== visitor.id) {
      await tx.update(conversations).set({ leadId: target.id, updatedAt: now }).where(eq(conversations.leadId, visitor.id));
      // The anonymous file was created by this widget session and holds nothing else.
      if (visitor.source === "WEBSITE" && !visitor.phone && !visitor.email) await tx.delete(leads).where(eq(leads.id, visitor.id));
    }

    const changes: Partial<typeof leads.$inferInsert> = { lastInteractionAt: now, updatedAt: now };
    if (!target.firstName) changes.firstName = contact.firstName;
    if (!target.lastName && contact.lastName) changes.lastName = contact.lastName;
    if (!target.phone && phone && !usedElsewhere("phone", phone)) changes.phone = phone;
    if (!target.email && contact.email && !usedElsewhere("email", contact.email)) changes.email = contact.email;
    if (!target.language) changes.language = language;
    if (contact.marketingConsent) {
      changes.marketingConsent = "GRANTED";
      changes.marketingConsentUpdatedAt = now;
      // A new, explicit agreement is the person's latest choice.
      changes.optedOutAt = null;
    }
    await tx.update(leads).set(changes).where(eq(leads.id, target.id));

    const shown = WIDGET_TEXTS[language];
    const proof = { conversationId: conversation.id, language, at: now.toISOString(), userAgent: meta.userAgent };
    await tx.insert(consentRecords).values([
      {
        organizationId: widget.organizationId,
        leadId: target.id,
        purpose: "DATA_PROCESSING",
        status: "GRANTED",
        channel: "WEBSITE",
        source: "widget_form",
        proof: { ...proof, notice: fillText(shown.privacyNotice, { org: widget.organizationName }) || DATA_NOTICE },
      },
      ...(contact.marketingConsent
        ? [
            {
              organizationId: widget.organizationId,
              leadId: target.id,
              purpose: "MARKETING" as const,
              status: "GRANTED" as const,
              channel: "WEBSITE" as const,
              source: "widget_checkbox",
              proof: { ...proof, wording: fillText(shown.marketingConsent, { org: widget.organizationName }) },
            },
          ]
        : []),
    ]);

    const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
    const details = [name, phone ? formatPhone(phone) : null, contact.email].filter(Boolean).join(" · ");
    await tx.insert(messages).values({
      organizationId: widget.organizationId,
      conversationId: conversation.id,
      direction: "INBOUND",
      authorType: "SYSTEM",
      body: `Coordonnées laissées dans le widget : ${details}${contact.marketingConsent ? " (accepte les offres et rappels)" : ""}.`,
      status: "RECEIVED",
      createdAt: now,
    });
    await notify(tx, {
      organizationId: widget.organizationId,
      type: "NEW_LEAD",
      title: "Coordonnées laissées sur votre site",
      body: details,
      linkUrl: `/leads/${target.id}`,
      entityType: "lead",
      entityId: target.id,
      recipients: "team",
    });
    await recordAudit(tx, {
      organizationId: widget.organizationId,
      actorType: "CONTACT",
      action: "lead.contact_left",
      entityType: "lead",
      entityId: target.id,
      metadata: { channel: "WEBSITE", marketingConsent: contact.marketingConsent, merged: target.id !== visitor.id },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
  return { saved: true };
}

/** The visitor chose to continue on WhatsApp: the team is told to expect her there, with the reference. */
export async function recordWhatsappHandoff(widget: PublicWidget, input: { token: string | null }, now = new Date()) {
  assertOpen(widget);
  if (!isPlausibleToken(input.token)) throw new WidgetError("session");
  await withTenant(widget.organizationId, async (tx) => {
    const conversation = await findConversation(tx, widget, input.token!);
    if (!conversation) throw new WidgetError("session");
    const reference = conversationReference(conversation.id);
    const body = `La cliente continue sur WhatsApp. Son premier message y mentionnera la référence ${reference}.`;
    const [already] = await tx
      .select({ id: messages.id })
      .from(messages)
      .where(and(eq(messages.conversationId, conversation.id), eq(messages.authorType, "SYSTEM"), eq(messages.body, body)))
      .limit(1);
    if (already) return;
    await tx.insert(messages).values({
      organizationId: widget.organizationId,
      conversationId: conversation.id,
      direction: "INBOUND",
      authorType: "SYSTEM",
      body,
      status: "RECEIVED",
      createdAt: now,
    });
    await notify(tx, {
      organizationId: widget.organizationId,
      type: "HUMAN_REQUESTED",
      title: "Une cliente du site continue sur WhatsApp",
      body: `Référence ${reference}`,
      linkUrl: `/inbox?conversation=${conversation.id}`,
      entityType: "conversation",
      entityId: conversation.id,
      recipients: "team",
    });
  });
}

// ─── Installation ───────────────────────────────────────────────────────────

const SEEN_REFRESH_MS = 60 * 60 * 1000;

/**
 * The widget loaded on a page of an allowed domain: that is the verified
 * installation that turns the channel "Connecté". Refreshed at most hourly.
 */
export async function recordWidgetSeen(widget: PublicWidget, origin: string | null, now = new Date()) {
  if (!widget.integrationId || !isWidgetOpen(widget) || !isOriginAllowed(origin, widget.settings.allowedDomains)) return;
  const hostname = new URL(origin!).hostname;
  const fresh = widget.integrationStatus === "CONNECTED" && widget.lastSeenAt && now.getTime() - widget.lastSeenAt.getTime() < SEEN_REFRESH_MS;
  if (fresh) return;
  await withTenant(widget.organizationId, async (tx) => {
    const [updated] = await tx
      .update(integrations)
      .set({
        status: "CONNECTED",
        displayName: hostname,
        connectedAt: sql`coalesce(${integrations.connectedAt}, ${now})`,
        lastHealthcheckAt: now,
        lastError: null,
        lastErrorAt: null,
        updatedAt: now,
      })
      .where(eq(integrations.id, widget.integrationId!))
      .returning({ id: integrations.id });
    if (updated && widget.integrationStatus !== "CONNECTED") {
      await recordEvent(tx, {
        organizationId: widget.organizationId,
        type: "SYSTEM",
        message: "Website widget installation verified",
        entityType: "integration",
        entityId: updated.id,
        details: { hostname },
      });
    }
  });
}
