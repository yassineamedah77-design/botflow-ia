import "server-only";

import { and, asc, count, desc, eq, gt, ilike, isNotNull, lt, lte, or, sql, type SQL } from "drizzle-orm";

import { leadDisplayName } from "@/lib/crm";
import type { InboxFilters } from "@/lib/inbox-filters";
import type { TenantContext } from "@/server/auth/context";
import { getChannelAdapter } from "@/server/channels";
import { withTenant, type Transaction } from "@/server/db/context";
import { appointments, conversations, leadNotes, leads, memberships, messages, services, users } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { recordAudit, recordEvent } from "@/server/observability/audit";
import type { RequestMeta } from "@/server/security/request";

import { requirePermission } from "./guards";

/*
 * Unified inbox (specification §6, §7, §18). The list never loads message
 * bodies (each conversation keeps a denormalised preview); a thread loads its
 * latest messages and pages backwards on demand.
 */

export const INBOX_PAGE_SIZE = 30;
export const THREAD_PAGE_SIZE = 60;
/** WhatsApp only allows free-form replies within 24 hours of the customer's last message. */
export const WHATSAPP_SESSION_MS = 24 * 60 * 60 * 1000;

const upcomingAppointment = (now: Date) => sql`exists (
  select 1 from ${appointments}
  where ${appointments.leadId} = ${conversations.leadId}
    and ${appointments.status} in ('PENDING', 'CONFIRMED')
    and ${appointments.startsAt} > ${now}
)`;

function listConditions(organizationId: string, filters: InboxFilters, now: Date): SQL[] {
  const conditions: SQL[] = [eq(conversations.organizationId, organizationId), isNotNull(conversations.lastMessageAt)];
  if (filters.channel) conditions.push(eq(conversations.channel, filters.channel));
  switch (filters.view) {
    case "unread":
      conditions.push(gt(conversations.unreadCount, 0));
      break;
    case "hot":
      conditions.push(or(eq(leads.status, "HOT"), eq(leads.status, "BOOKING_PENDING"))!);
      break;
    case "upcoming":
      conditions.push(upcomingAppointment(now));
      break;
    case "noshow":
      conditions.push(eq(leads.status, "NO_SHOW"));
      break;
    case "followup":
      conditions.push(lte(leads.nextFollowUpAt, now));
      break;
    case "human":
      conditions.push(isNotNull(conversations.humanRequestedAt), eq(conversations.handlingMode, "AI_ACTIVE"));
      break;
    case "mine":
      // Set by the caller with the user id.
      break;
  }
  if (filters.q) {
    const pattern = `%${filters.q.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
    const digits = filters.q.replace(/\D/g, "");
    const matches: SQL[] = [
      ilike(sql`coalesce(${leads.firstName}, '') || ' ' || coalesce(${leads.lastName}, '')`, pattern),
      ilike(leads.instagramHandle, pattern),
      ilike(conversations.lastMessagePreview, pattern),
    ];
    if (digits.length >= 4) matches.push(sql`${leads.phone} like ${`%${digits.replace(/^0/, "")}%`}`);
    conditions.push(or(...matches)!);
  }
  if (filters.before) conditions.push(lt(conversations.lastMessageAt, filters.before));
  return conditions;
}

export interface InboxItem {
  id: string;
  channel: (typeof conversations.$inferSelect)["channel"];
  leadId: string;
  name: string;
  leadStatus: (typeof leads.$inferSelect)["status"];
  preview: string | null;
  lastMessageAt: Date | null;
  lastAuthor: (typeof messages.$inferSelect)["authorType"] | null;
  unreadCount: number;
  handlingMode: (typeof conversations.$inferSelect)["handlingMode"];
  humanRequested: boolean;
}

export async function listConversations(
  tx: Transaction,
  organizationId: string,
  filters: InboxFilters,
  options: { userId: string; now?: Date; limit?: number },
): Promise<{ items: InboxItem[]; hasMore: boolean }> {
  const now = options.now ?? new Date();
  const limit = options.limit ?? INBOX_PAGE_SIZE;
  const conditions = listConditions(organizationId, filters, now);
  if (filters.view === "mine") conditions.push(eq(leads.assignedToUserId, options.userId));
  const rows = await tx
    .select({
      id: conversations.id,
      channel: conversations.channel,
      leadId: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      phone: leads.phone,
      email: leads.email,
      instagramHandle: leads.instagramHandle,
      leadStatus: leads.status,
      preview: conversations.lastMessagePreview,
      lastMessageAt: conversations.lastMessageAt,
      lastInboundAt: conversations.lastInboundAt,
      lastOutboundAt: conversations.lastOutboundAt,
      unreadCount: conversations.unreadCount,
      handlingMode: conversations.handlingMode,
      humanRequestedAt: conversations.humanRequestedAt,
      lastAuthor: sql<(typeof messages.$inferSelect)["authorType"] | null>`(
        select ${messages.authorType} from ${messages}
        where ${messages.conversationId} = ${conversations.id}
        order by ${messages.createdAt} desc limit 1
      )`,
    })
    .from(conversations)
    .innerJoin(leads, eq(leads.id, conversations.leadId))
    .where(and(...conditions))
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.id))
    .limit(limit + 1);

  return {
    hasMore: rows.length > limit,
    items: rows.slice(0, limit).map((row) => ({
      id: row.id,
      channel: row.channel,
      leadId: row.leadId,
      name: leadDisplayName(row),
      leadStatus: row.leadStatus,
      preview: row.preview,
      lastMessageAt: row.lastMessageAt,
      lastAuthor: row.lastAuthor,
      unreadCount: row.unreadCount,
      handlingMode: row.handlingMode,
      humanRequested: Boolean(row.humanRequestedAt) && row.handlingMode === "AI_ACTIVE",
    })),
  };
}

/** Badges of the inbox filters. */
export async function getInboxCounters(tx: Transaction, organizationId: string) {
  const [row] = await tx
    .select({
      unread: sql<number>`count(*) filter (where ${conversations.unreadCount} > 0)`.mapWith(Number),
      human: sql<number>`count(*) filter (where ${conversations.humanRequestedAt} is not null and ${conversations.handlingMode} = 'AI_ACTIVE')`.mapWith(Number),
      total: count(),
    })
    .from(conversations)
    .where(and(eq(conversations.organizationId, organizationId), isNotNull(conversations.lastMessageAt)));
  return { unread: row?.unread ?? 0, human: row?.human ?? 0, total: row?.total ?? 0 };
}

export async function getConversationThread(
  tx: Transaction,
  organizationId: string,
  conversationId: string,
  options: { before?: Date | null; now?: Date } = {},
) {
  const now = options.now ?? new Date();
  const [conversation] = await tx
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.organizationId, organizationId)))
    .limit(1);
  if (!conversation) return null;

  const [lead] = await tx.select().from(leads).where(eq(leads.id, conversation.leadId)).limit(1);
  if (!lead) return null;

  const page = await tx
    .select({
      id: messages.id,
      direction: messages.direction,
      authorType: messages.authorType,
      authorUserId: messages.authorUserId,
      contentType: messages.contentType,
      body: messages.body,
      status: messages.status,
      error: messages.error,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        options.before ? lt(messages.createdAt, options.before) : undefined,
      ),
    )
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(THREAD_PAGE_SIZE + 1);
  const hasOlder = page.length > THREAD_PAGE_SIZE;
  const ordered = page.slice(0, THREAD_PAGE_SIZE).reverse();

  const team = await tx
    .select({ id: users.id, name: users.name })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, organizationId))
    .orderBy(asc(users.name));
  const teamName = new Map(team.map((member) => [member.id, member.name]));

  const [nextAppointment] = await tx
    .select({ startsAt: appointments.startsAt, status: appointments.status, serviceName: services.name })
    .from(appointments)
    .leftJoin(services, eq(services.id, appointments.serviceId))
    .where(and(eq(appointments.leadId, lead.id), sql`${appointments.status} in ('PENDING', 'CONFIRMED')`, gt(appointments.startsAt, now)))
    .orderBy(asc(appointments.startsAt))
    .limit(1);

  const [service] = lead.interestedServiceId
    ? await tx.select({ name: services.name }).from(services).where(eq(services.id, lead.interestedServiceId))
    : [];

  const notes = await tx
    .select({ id: leadNotes.id, body: leadNotes.body, createdAt: leadNotes.createdAt, authorUserId: leadNotes.authorUserId })
    .from(leadNotes)
    .where(eq(leadNotes.leadId, lead.id))
    .orderBy(desc(leadNotes.createdAt))
    .limit(3);

  return {
    conversation,
    lead: { ...lead, name: leadDisplayName(lead) },
    messages: ordered.map((message) => ({
      ...message,
      authorName: message.authorUserId ? (teamName.get(message.authorUserId) ?? "Équipe") : null,
    })),
    hasOlder,
    team,
    takenOverByName: conversation.takenOverByUserId ? (teamName.get(conversation.takenOverByUserId) ?? "Équipe") : null,
    nextAppointment: nextAppointment ?? null,
    serviceName: service?.name ?? null,
    notes: notes.map((note) => ({ ...note, authorName: note.authorUserId ? (teamName.get(note.authorUserId) ?? "Équipe") : "SOFIA" })),
    /** WhatsApp free-form window: open, or closed (only an approved template could be sent). */
    whatsappWindowOpen:
      conversation.channel !== "WHATSAPP" ||
      (conversation.lastInboundAt !== null && now.getTime() - conversation.lastInboundAt.getTime() < WHATSAPP_SESSION_MS),
  };
}

export type ConversationThread = NonNullable<Awaited<ReturnType<typeof getConversationThread>>>;

// ─── Mutations ──────────────────────────────────────────────────────────────

async function lockConversation(tx: Transaction, organizationId: string, conversationId: string) {
  const [conversation] = await tx
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.organizationId, organizationId)))
    .for("update");
  if (!conversation) throw new AppError("NOT_FOUND", "Cette conversation n'existe plus.");
  return conversation;
}

/** "Prendre la conversation": SOFIA stops answering until the conversation is handed back. */
export async function takeOverConversation(ctx: TenantContext, conversationId: string, meta: RequestMeta) {
  requirePermission(ctx.can("conversations:takeover"));
  const organizationId = ctx.organization.id;
  await withTenant(organizationId, async (tx) => {
    const conversation = await lockConversation(tx, organizationId, conversationId);
    if (conversation.handlingMode === "HUMAN_ACTIVE" && conversation.takenOverByUserId === ctx.user.id) return;
    const now = new Date();
    await tx
      .update(conversations)
      .set({ handlingMode: "HUMAN_ACTIVE", takenOverByUserId: ctx.user.id, takenOverAt: now })
      .where(eq(conversations.id, conversationId));
    await tx.insert(messages).values({
      organizationId,
      conversationId,
      direction: "OUTBOUND",
      authorType: "SYSTEM",
      body: `${ctx.user.name} a pris la conversation. SOFIA ne répond plus automatiquement.`,
      status: "SENT",
      createdAt: now,
    });
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "conversation.taken_over",
      entityType: "conversation",
      entityId: conversationId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    await recordEvent(tx, {
      organizationId,
      type: "HUMAN_HANDOFF",
      message: "Conversation taken over by a team member",
      entityType: "conversation",
      entityId: conversationId,
      details: { mode: "HUMAN_ACTIVE" },
    });
  });
}

/** "Rendre la conversation à SOFIA". */
export async function releaseConversation(ctx: TenantContext, conversationId: string, meta: RequestMeta) {
  requirePermission(ctx.can("conversations:takeover"));
  const organizationId = ctx.organization.id;
  await withTenant(organizationId, async (tx) => {
    const conversation = await lockConversation(tx, organizationId, conversationId);
    if (conversation.handlingMode === "AI_ACTIVE" && !conversation.humanRequestedAt) return;
    const now = new Date();
    await tx
      .update(conversations)
      .set({ handlingMode: "AI_ACTIVE", takenOverByUserId: null, takenOverAt: null, humanRequestedAt: null })
      .where(eq(conversations.id, conversationId));
    await tx.insert(messages).values({
      organizationId,
      conversationId,
      direction: "OUTBOUND",
      authorType: "SYSTEM",
      body: `${ctx.user.name} a rendu la conversation à SOFIA.`,
      status: "SENT",
      createdAt: now,
    });
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "conversation.released",
      entityType: "conversation",
      entityId: conversationId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    await recordEvent(tx, {
      organizationId,
      type: "HUMAN_HANDOFF",
      message: "Conversation handed back to SOFIA",
      entityType: "conversation",
      entityId: conversationId,
      details: { mode: "AI_ACTIVE" },
    });
  });
}

export async function markConversationRead(ctx: TenantContext, conversationId: string) {
  requirePermission(ctx.can("conversations:read"));
  await withTenant(ctx.organization.id, (tx) =>
    tx
      .update(conversations)
      .set({ unreadCount: 0 })
      .where(and(eq(conversations.id, conversationId), eq(conversations.organizationId, ctx.organization.id), gt(conversations.unreadCount, 0))),
  );
}

/**
 * Manual reply from the team. Requires taking the conversation first (SOFIA
 * and a person never answer at the same time) and a channel able to deliver.
 */
export async function sendManualReply(ctx: TenantContext, input: { conversationId: string; body: string }, meta: RequestMeta) {
  requirePermission(ctx.can("conversations:reply"));
  const organizationId = ctx.organization.id;
  return withTenant(organizationId, async (tx) => {
    const conversation = await lockConversation(tx, organizationId, input.conversationId);
    if (conversation.handlingMode !== "HUMAN_ACTIVE") {
      throw new AppError("VALIDATION", "Prenez d'abord la conversation : SOFIA et l'équipe ne répondent jamais en même temps.");
    }
    const now = new Date();
    if (conversation.channel === "WHATSAPP" && (!conversation.lastInboundAt || now.getTime() - conversation.lastInboundAt.getTime() >= WHATSAPP_SESSION_MS)) {
      throw new AppError(
        "VALIDATION",
        "La dernière réponse de la cliente date de plus de 24 h : WhatsApp n'autorise alors que les modèles de messages approuvés par Meta.",
      );
    }
    const adapter = await getChannelAdapter(tx, { id: organizationId, isDemo: ctx.organization.isDemo }, conversation.channel);
    const receipt = await adapter.send({
      organizationId,
      channel: conversation.channel,
      externalThreadId: conversation.externalThreadId,
      body: input.body,
    });
    const [message] = await tx
      .insert(messages)
      .values({
        organizationId,
        conversationId: conversation.id,
        direction: "OUTBOUND",
        authorType: "USER",
        authorUserId: ctx.user.id,
        body: input.body,
        status: receipt.status,
        externalMessageId: receipt.externalMessageId,
        createdAt: now,
        sentAt: receipt.status === "SENT" ? now : null,
      })
      .returning({ id: messages.id });
    await tx
      .update(conversations)
      .set({ lastMessageAt: now, lastOutboundAt: now, lastMessagePreview: input.body.slice(0, 140), unreadCount: 0 })
      .where(eq(conversations.id, conversation.id));
    await tx.update(leads).set({ lastInteractionAt: now }).where(eq(leads.id, conversation.leadId));
    await recordEvent(tx, {
      organizationId,
      type: "MESSAGE_SENT",
      message: receipt.simulated ? "Manual reply recorded (demo, not delivered)" : "Manual reply sent",
      entityType: "message",
      entityId: message!.id,
      details: { channel: conversation.channel, simulated: receipt.simulated },
    });
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "message.sent",
      entityType: "conversation",
      entityId: conversation.id,
      metadata: { channel: conversation.channel, simulated: receipt.simulated },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return { messageId: message!.id, simulated: receipt.simulated };
  });
}
