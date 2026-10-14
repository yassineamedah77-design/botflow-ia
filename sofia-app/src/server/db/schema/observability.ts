import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { createdAt, primaryId, timestamptz } from "./columns";
import { actorType, eventType, logLevel, notificationType } from "./enums";
import { organizations, organizationId, users } from "./identity";

/**
 * Who did what, for security reviews and GDPR accountability.
 * `organization_id` is NULL for platform-level events (only visible to system
 * context). Metadata must never contain secrets or message contents.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: primaryId(),
    organizationId: uuid().references(() => organizations.id, { onDelete: "set null" }),
    actorType: actorType().notNull(),
    actorUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    /** Dotted action name, e.g. `auth.login`, `member.invited`, `lead.exported`. */
    action: text().notNull(),
    entityType: text(),
    entityId: text(),
    metadata: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: text(),
    userAgent: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_logs_organization_created_idx").on(t.organizationId, t.createdAt.desc()),
    index("audit_logs_actor_created_idx").on(t.actorUserId, t.createdAt.desc()),
    index("audit_logs_action_idx").on(t.action),
  ],
);

/**
 * Operational events (messages, AI calls, integration errors) used to
 * diagnose a problem end to end through `correlation_id`.
 */
export const eventLogs = pgTable(
  "event_logs",
  {
    id: primaryId(),
    organizationId: uuid().references(() => organizations.id, { onDelete: "cascade" }),
    type: eventType().notNull(),
    level: logLevel().notNull().default("INFO"),
    message: text().notNull(),
    entityType: text(),
    entityId: text(),
    correlationId: text(),
    durationMs: integer(),
    details: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("event_logs_organization_created_idx").on(t.organizationId, t.createdAt.desc()),
    index("event_logs_type_created_idx").on(t.type, t.createdAt.desc()),
    index("event_logs_problems_idx")
      .on(t.organizationId, t.createdAt.desc())
      .where(sql`${t.level} IN ('WARN', 'ERROR')`),
    index("event_logs_correlation_idx").on(t.correlationId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: primaryId(),
    organizationId: organizationId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationType().notNull(),
    title: text().notNull(),
    body: text(),
    linkUrl: text(),
    entityType: text(),
    entityId: text(),
    readAt: timestamptz(),
    emailedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_user_unread_idx").on(t.userId, t.readAt, t.createdAt.desc()),
    index("notifications_organization_created_idx").on(t.organizationId, t.createdAt.desc()),
  ],
);
