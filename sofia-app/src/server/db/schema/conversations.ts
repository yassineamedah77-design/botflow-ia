import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createdAt, primaryId, timestamptz, updatedAt } from "./columns";
import {
  channel,
  conversationIntent,
  conversationStatus,
  handlingMode,
  intentLevel,
  messageAuthorType,
  messageContentType,
  messageDirection,
  messageStatus,
} from "./enums";
import { organizationId, users } from "./identity";
import { integrations } from "./integrations";
import { leads } from "./crm";

export const conversations = pgTable(
  "conversations",
  {
    id: primaryId(),
    organizationId: organizationId(),
    leadId: uuid()
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    channel: channel().notNull(),
    integrationId: uuid().references(() => integrations.id, { onDelete: "set null" }),
    /** Provider thread key: WhatsApp wa_id, Instagram thread id, widget session id. */
    externalThreadId: text(),
    status: conversationStatus().notNull().default("OPEN"),
    /** AI_ACTIVE: SOFIA answers. HUMAN_ACTIVE: a team member took over, SOFIA stays silent. */
    handlingMode: handlingMode().notNull().default("AI_ACTIVE"),
    takenOverByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    takenOverAt: timestamptz(),
    /** Set when SOFIA or the customer asks for a human ("Humain requis" inbox filter). */
    humanRequestedAt: timestamptz(),
    assignedToUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    intent: conversationIntent(),
    intentLevel: intentLevel(),
    language: text(),
    unreadCount: integer().notNull().default(0),
    lastMessageAt: timestamptz(),
    /** Denormalized for the inbox list, so it never loads message bodies. */
    lastMessagePreview: text(),
    /** WhatsApp only allows free-form replies within 24h of the last inbound message. */
    lastInboundAt: timestamptz(),
    lastOutboundAt: timestamptz(),
    summary: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("conversations_organization_last_message_idx").on(t.organizationId, t.lastMessageAt.desc()),
    index("conversations_organization_status_idx").on(t.organizationId, t.status, t.lastMessageAt.desc()),
    index("conversations_organization_handling_idx").on(t.organizationId, t.handlingMode),
    index("conversations_lead_idx").on(t.leadId),
    uniqueIndex("conversations_thread_unique")
      .on(t.organizationId, t.channel, t.externalThreadId)
      .where(sql`${t.externalThreadId} IS NOT NULL`),
    check("conversations_unread_positive", sql`${t.unreadCount} >= 0`),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: primaryId(),
    organizationId: organizationId(),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    direction: messageDirection().notNull(),
    authorType: messageAuthorType().notNull(),
    authorUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    contentType: messageContentType().notNull().default("TEXT"),
    body: text(),
    attachments: jsonb().$type<Array<Record<string, unknown>>>().notNull().default([]),
    /** Provider message id; unique per establishment so a replayed webhook is ignored. */
    externalMessageId: text(),
    status: messageStatus().notNull(),
    error: text(),
    /** Intent classified for this inbound message. */
    intent: conversationIntent(),
    /** Model, provider, token usage, latency, tool calls. Never API keys. */
    aiMetadata: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    sentAt: timestamptz(),
    deliveredAt: timestamptz(),
    readAt: timestamptz(),
    failedAt: timestamptz(),
  },
  (t) => [
    index("messages_conversation_created_idx").on(t.conversationId, t.createdAt.desc()),
    index("messages_organization_created_idx").on(t.organizationId, t.createdAt.desc()),
    uniqueIndex("messages_external_id_unique")
      .on(t.organizationId, t.externalMessageId)
      .where(sql`${t.externalMessageId} IS NOT NULL`),
  ],
);
