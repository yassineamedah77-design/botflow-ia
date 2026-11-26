import "server-only";

import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";

import { formatPhone, normalizePhone } from "@/lib/phone";
import { getLlmProvider } from "@/server/ai/config";
import { handleInboundMessage, type InboundOutcome } from "@/server/ai/orchestrator";
import type { LlmProvider } from "@/server/ai/provider";
import { ChannelDeliveryError, getChannelAdapter } from "@/server/channels";
import { withTenant, type Transaction } from "@/server/db/context";
import { conversations, leads, messages } from "@/server/db/schema";
import { isUniqueViolation } from "@/server/errors";
import { recordEvent } from "@/server/observability/audit";
import { logger } from "@/server/observability/logger";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { notify } from "@/server/services/notifications";

import type { WhatsappRoute } from "./connection";
import { describeInbound, isAnswerable, type InboundEvent, type StatusEvent } from "./webhook";

/*
 * What a WhatsApp message does in SOFIA. The webhook stores it at once (Meta
 * needs a quick 200), then SOFIA answers after the response is sent, like on
 * the website widget. A webhook replayed by Meta is recognised by the
 * message id and ignored.
 */

/** Customers often send several short messages in a row: SOFIA waits this long, then answers them together. */
export const BURST_WINDOW_MS = 2_500;

/** A delivery this late was retried by Meta: it is placed at the customer's own time. */
const LATE_DELIVERY_MS = 60_000;

export interface StoredInbound {
  conversationId: string;
  messageId: string;
  /** SOFIA should answer: words to read, SOFIA active, conversation not taken over, number able to send. */
  answer: boolean;
}

function splitName(name: string | null): { firstName: string | null; lastName: string | null } {
  if (!name) return { firstName: null, lastName: null };
  const [first, ...rest] = name.split(/\s+/);
  return { firstName: first?.slice(0, 80) || null, lastName: rest.join(" ").slice(0, 80) || null };
}

async function findOrOpenConversation(tx: Transaction, route: WhatsappRoute, event: InboundEvent, now: Date) {
  const [existing] = await tx
    .select()
    .from(conversations)
    .where(and(eq(conversations.organizationId, route.organizationId), eq(conversations.channel, "WHATSAPP"), eq(conversations.externalThreadId, event.waId)))
    .limit(1);
  if (existing) return { conversation: existing, created: false };

  // A customer the establishment already knows by her number keeps her file.
  const phone = normalizePhone(`+${event.waId}`);
  const [known] = phone
    ? await tx.select().from(leads).where(and(eq(leads.organizationId, route.organizationId), eq(leads.phone, phone))).limit(1)
    : [];
  let leadId = known?.id;
  if (known) {
    const name = splitName(event.profileName);
    const fill: Partial<typeof leads.$inferInsert> = { lastInteractionAt: now, updatedAt: now };
    if (!known.firstName && name.firstName) fill.firstName = name.firstName;
    if (!known.lastName && !known.firstName && name.lastName) fill.lastName = name.lastName;
    await tx.update(leads).set(fill).where(eq(leads.id, known.id));
  } else {
    const [lead] = await tx
      .insert(leads)
      .values({ organizationId: route.organizationId, source: "WHATSAPP", channel: "WHATSAPP", phone, ...splitName(event.profileName), lastInteractionAt: now })
      .returning({ id: leads.id });
    leadId = lead!.id;
    await recordEvent(tx, {
      organizationId: route.organizationId,
      type: "LEAD_CREATED",
      message: "Lead created from WhatsApp",
      entityType: "lead",
      entityId: leadId,
      details: { channel: "WHATSAPP" },
    });
  }

  const [conversation] = await tx
    .insert(conversations)
    .values({
      organizationId: route.organizationId,
      leadId: leadId!,
      channel: "WHATSAPP",
      integrationId: route.integrationId,
      externalThreadId: event.waId,
      createdAt: new Date(event.timestamp.getTime() - 1),
    })
    .returning();
  await tx.insert(messages).values({
    organizationId: route.organizationId,
    conversationId: conversation!.id,
    direction: "INBOUND",
    authorType: "SYSTEM",
    body: `Conversation ouverte sur WhatsApp depuis le ${formatPhone(phone) || `+${event.waId}`}${known ? ", une personne déjà connue de l'établissement" : ""}.`,
    status: "RECEIVED",
    createdAt: new Date(event.timestamp.getTime() - 1),
  });
  await notify(tx, {
    organizationId: route.organizationId,
    type: "NEW_LEAD",
    title: known ? "Nouvelle conversation WhatsApp" : "Nouveau contact sur WhatsApp",
    body: describeInbound(event).slice(0, 140),
    linkUrl: `/inbox?conversation=${conversation!.id}`,
    entityType: "conversation",
    entityId: conversation!.id,
    recipients: "team",
  });
  return { conversation: conversation!, created: true };
}

/** Stores a customer's message; null when Meta replays one already stored. */
export async function storeInboundMessage(route: WhatsappRoute, event: InboundEvent, now = new Date()): Promise<StoredInbound | null> {
  // Meta dates messages to the second, so a burst shares one timestamp: the
  // arrival time orders them. A delivery Meta retried long after keeps the
  // customer's own time, and a clock ahead of ours never passes SOFIA's answer.
  const sentAt = event.timestamp.getTime() > now.getTime() ? now : event.timestamp;
  const receivedAt = now.getTime() - sentAt.getTime() > LATE_DELIVERY_MS ? sentAt : now;
  try {
    return await withTenant(route.organizationId, async (tx) => {
      const [duplicate] = await tx
        .select({ id: messages.id })
        .from(messages)
        .where(and(eq(messages.organizationId, route.organizationId), eq(messages.externalMessageId, event.messageId)))
        .limit(1);
      if (duplicate) return null;

      const { conversation } = await findOrOpenConversation(tx, route, { ...event, timestamp: receivedAt }, now);
      const body = describeInbound(event);
      const [stored] = await tx
        .insert(messages)
        .values({
          organizationId: route.organizationId,
          conversationId: conversation.id,
          direction: "INBOUND",
          authorType: "CONTACT",
          contentType: event.contentType,
          body,
          attachments: event.media ? [{ type: event.media.type, mediaId: event.media.id, mimeType: event.media.mimeType }] : [],
          externalMessageId: event.messageId,
          status: "RECEIVED",
          createdAt: receivedAt,
        })
        .returning({ id: messages.id });

      const answerable = isAnswerable(event);
      const needsTeam = !answerable && !conversation.humanRequestedAt;
      await tx
        .update(conversations)
        .set({
          status: "OPEN",
          lastMessageAt: receivedAt,
          // The 24 h window counts from the customer's own message.
          lastInboundAt: sentAt,
          lastMessagePreview: body.slice(0, 160),
          unreadCount: sql`${conversations.unreadCount} + 1`,
          ...(needsTeam ? { humanRequestedAt: now } : {}),
          updatedAt: now,
        })
        .where(eq(conversations.id, conversation.id));
      await tx.update(leads).set({ lastInteractionAt: now, updatedAt: now }).where(eq(leads.id, conversation.leadId));
      if (needsTeam) {
        await notify(tx, {
          organizationId: route.organizationId,
          type: "HUMAN_REQUESTED",
          title: "Message WhatsApp à traiter par l'équipe",
          body: `${body.slice(0, 120)} SOFIA ne lit que les messages écrits.`,
          linkUrl: `/inbox?conversation=${conversation.id}`,
          entityType: "conversation",
          entityId: conversation.id,
          recipients: "team",
        });
      }
      await recordEvent(tx, {
        organizationId: route.organizationId,
        type: "MESSAGE_RECEIVED",
        message: "Message received on WhatsApp",
        entityType: "conversation",
        entityId: conversation.id,
        details: { channel: "WHATSAPP", contentType: event.contentType, length: body.length },
      });
      return {
        conversationId: conversation.id,
        messageId: stored!.id,
        answer:
          answerable &&
          route.status === "CONNECTED" &&
          route.sofiaStatus === "ACTIVE" &&
          conversation.handlingMode === "AI_ACTIVE",
      };
    });
  } catch (error) {
    // Two deliveries of the same message at the same instant: the other one stored it.
    if (isUniqueViolation(error, "messages_external_id_unique")) return null;
    throw error;
  }
}

const STATUS_RANK = { PENDING: 0, SENT: 1, DELIVERED: 2, READ: 3 } as const;

/** A delivery report: the message moves forward (sent → delivered → read) or fails, never backwards. */
export async function applyStatus(route: WhatsappRoute, event: StatusEvent, now = new Date()) {
  await withTenant(route.organizationId, async (tx) => {
    const [message] = await tx
      .select({ id: messages.id, status: messages.status, conversationId: messages.conversationId, authorType: messages.authorType })
      .from(messages)
      .where(and(eq(messages.organizationId, route.organizationId), eq(messages.externalMessageId, event.messageId), eq(messages.direction, "OUTBOUND")))
      .limit(1);
    if (!message || message.status === "FAILED") return;

    if (event.status === "FAILED") {
      await tx
        .update(messages)
        .set({ status: "FAILED", failedAt: event.timestamp, error: event.error ? `${event.error.title} (code ${event.error.code})` : "Échec signalé par WhatsApp" })
        .where(eq(messages.id, message.id));
      await tx.update(conversations).set({ humanRequestedAt: now, updatedAt: now }).where(eq(conversations.id, message.conversationId));
      await notify(tx, {
        organizationId: route.organizationId,
        type: "HUMAN_REQUESTED",
        title: "Message WhatsApp non remis",
        body: `${message.authorType === "AI" ? "La réponse de SOFIA" : "Votre message"} n'a pas pu être remis à la cliente${event.error ? ` : ${event.error.title}` : ""}.`,
        linkUrl: `/inbox?conversation=${message.conversationId}`,
        entityType: "conversation",
        entityId: message.conversationId,
        recipients: "team",
      });
      return;
    }

    const current = STATUS_RANK[message.status as keyof typeof STATUS_RANK] ?? 0;
    if (STATUS_RANK[event.status] <= current) return;
    await tx
      .update(messages)
      .set({
        status: event.status,
        ...(event.status === "SENT" ? { sentAt: event.timestamp } : {}),
        ...(event.status === "DELIVERED" ? { deliveredAt: event.timestamp } : {}),
        // Read implies delivered, even when Meta's "delivered" report never came.
        ...(event.status === "READ" ? { readAt: event.timestamp, deliveredAt: sql`coalesce(${messages.deliveredAt}, ${event.timestamp})` } : {}),
      })
      .where(eq(messages.id, message.id));
  });
}

/** Sends a stored outbound message on WhatsApp; it ends SENT with Meta's id, or FAILED with the reason. */
export async function deliverWhatsappMessage(organizationId: string, messageId: string, now = new Date()): Promise<boolean> {
  return withTenant(organizationId, async (tx) => {
    const [message] = await tx
      .select({ id: messages.id, body: messages.body, status: messages.status, conversationId: messages.conversationId, threadId: conversations.externalThreadId })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(and(eq(messages.id, messageId), eq(messages.organizationId, organizationId)))
      .limit(1);
    if (!message || message.status !== "PENDING" || !message.body) return false;
    try {
      const adapter = await getChannelAdapter(tx, { id: organizationId, isDemo: false }, "WHATSAPP");
      const receipt = await adapter.send({ organizationId, channel: "WHATSAPP", externalThreadId: message.threadId, body: message.body });
      await tx.update(messages).set({ status: "SENT", sentAt: now, externalMessageId: receipt.externalMessageId }).where(eq(messages.id, message.id));
      await recordEvent(tx, {
        organizationId,
        type: "MESSAGE_SENT",
        message: "SOFIA's answer sent on WhatsApp",
        entityType: "message",
        entityId: message.id,
        details: { channel: "WHATSAPP" },
      });
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Envoi impossible";
      await tx.update(messages).set({ status: "FAILED", failedAt: now, error: reason.slice(0, 300) }).where(eq(messages.id, message.id));
      await tx.update(conversations).set({ humanRequestedAt: now, updatedAt: now }).where(eq(conversations.id, message.conversationId));
      await notify(tx, {
        organizationId,
        type: "HUMAN_REQUESTED",
        title: "La réponse de SOFIA n'est pas partie sur WhatsApp",
        body: reason.slice(0, 200),
        linkUrl: `/inbox?conversation=${message.conversationId}`,
        entityType: "conversation",
        entityId: message.conversationId,
        recipients: "team",
      });
      if (!(error instanceof ChannelDeliveryError)) logger.error("WhatsApp delivery failed", { err: error, organizationId, messageId });
      return false;
    }
  });
}

/** Whether this message is still the one to answer: the latest from the customer, with nothing sent after it. */
async function isLatestUnanswered(tx: Transaction, conversationId: string, messageId: string) {
  const [latest] = await tx
    .select({ id: messages.id, createdAt: messages.createdAt })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.direction, "INBOUND"), eq(messages.authorType, "CONTACT")))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(1);
  if (latest?.id !== messageId) return false;
  const [answered] = await tx
    .select({ id: messages.id })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.direction, "OUTBOUND"), inArray(messages.authorType, ["AI", "USER"]), gt(messages.createdAt, latest.createdAt)))
    .limit(1);
  return !answered;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * SOFIA's answer to a customer's WhatsApp message, run after the webhook
 * answered Meta. Messages sent in a burst get one answer, to the last one;
 * over the daily budget, the team answers instead.
 */
export async function answerWhatsappMessage(
  route: WhatsappRoute,
  stored: StoredInbound,
  options: { provider?: LlmProvider | null; now?: Date; burstWindowMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<InboundOutcome | { status: "skipped"; reason: "superseded" }> {
  const wait = options.burstWindowMs ?? BURST_WINDOW_MS;
  if (wait > 0) await (options.sleep ?? defaultSleep)(wait);
  const { organizationId } = route;
  const current = await withTenant(organizationId, (tx) => isLatestUnanswered(tx, stored.conversationId, stored.messageId));
  if (!current) return { status: "skipped", reason: "superseded" };

  const now = options.now ?? new Date();
  const budget = await consumeRateLimit("whatsappAiRepliesByOrganization", organizationId, { now });
  if (!budget.allowed) {
    await withTenant(organizationId, async (tx) => {
      const [conversation] = await tx.select({ humanRequestedAt: conversations.humanRequestedAt }).from(conversations).where(eq(conversations.id, stored.conversationId)).limit(1);
      if (!conversation || conversation.humanRequestedAt) return;
      await tx.update(conversations).set({ humanRequestedAt: now, updatedAt: now }).where(eq(conversations.id, stored.conversationId));
      await notify(tx, {
        organizationId,
        type: "HUMAN_REQUESTED",
        title: "Limite quotidienne de SOFIA atteinte sur WhatsApp",
        body: "SOFIA a déjà répondu au maximum de messages WhatsApp pour aujourd'hui : répondez à cette cliente.",
        linkUrl: `/inbox?conversation=${stored.conversationId}`,
        entityType: "conversation",
        entityId: stored.conversationId,
        recipients: "team",
      });
    });
    logger.warn("WhatsApp AI budget reached", { organizationId });
    return { status: "skipped", reason: "nothing_to_answer" };
  }

  const provider = options.provider === undefined ? getLlmProvider() : options.provider;
  const outcome = await handleInboundMessage(organizationId, stored.conversationId, { provider, now });
  if (outcome.status === "answered") await deliverWhatsappMessage(organizationId, outcome.messageId);
  return outcome;
}
