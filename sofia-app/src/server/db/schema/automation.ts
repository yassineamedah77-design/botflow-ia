import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, primaryId, timestamptz, updatedAt } from "./columns";
import {
  automationType,
  campaignRecipientStatus,
  campaignStatus,
  channel,
  followupStatus,
} from "./enums";
import { organizationId, users } from "./identity";
import { leads } from "./crm";
import { conversations, messages } from "./conversations";
import { appointments } from "./appointments";

/**
 * Per-establishment automation settings. `config` is validated by a Zod
 * schema per type (delays, message templates, channels, quiet hours), so
 * every delay stays configurable without a migration.
 */
export const automations = pgTable(
  "automations",
  {
    id: primaryId(),
    organizationId: organizationId(),
    type: automationType().notNull(),
    isEnabled: boolean().notNull().default(false),
    config: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    updatedByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("automations_organization_type_unique").on(t.organizationId, t.type)],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: primaryId(),
    organizationId: organizationId(),
    name: text().notNull(),
    status: campaignStatus().notNull().default("DRAFT"),
    channel: channel().notNull(),
    /** Clients without an appointment for at least this many days (60 / 90 / 120…). */
    inactivityDays: integer(),
    /** Segment filters: services, tags, last visit range. */
    segment: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    messageTemplate: text().notNull(),
    scheduledAt: timestamptz(),
    startedAt: timestamptz(),
    completedAt: timestamptz(),
    createdByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("campaigns_organization_status_idx").on(t.organizationId, t.status),
    check("campaigns_inactivity_positive", sql`${t.inactivityDays} IS NULL OR ${t.inactivityDays} > 0`),
  ],
);

export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: primaryId(),
    organizationId: organizationId(),
    campaignId: uuid()
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    leadId: uuid()
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    status: campaignRecipientStatus().notNull().default("PENDING"),
    messageId: uuid().references(() => messages.id, { onDelete: "set null" }),
    bookedAppointmentId: uuid().references(() => appointments.id, { onDelete: "set null" }),
    sentAt: timestamptz(),
    repliedAt: timestamptz(),
    error: text(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("campaign_recipients_campaign_lead_unique").on(t.campaignId, t.leadId),
    index("campaign_recipients_status_idx").on(t.campaignId, t.status),
  ],
);

/**
 * Scheduled outbound messages: lead recovery steps, appointment reminders,
 * no-show recovery and reactivation sends. Processed by the job runner
 * (Phase 8) with `FOR UPDATE SKIP LOCKED`.
 */
export const followups = pgTable(
  "followups",
  {
    id: primaryId(),
    organizationId: organizationId(),
    automationType: automationType().notNull(),
    leadId: uuid()
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    conversationId: uuid().references(() => conversations.id, { onDelete: "set null" }),
    appointmentId: uuid().references(() => appointments.id, { onDelete: "cascade" }),
    campaignId: uuid().references(() => campaigns.id, { onDelete: "set null" }),
    step: smallint().notNull().default(1),
    channel: channel(),
    scheduledAt: timestamptz().notNull(),
    status: followupStatus().notNull().default("SCHEDULED"),
    attempts: smallint().notNull().default(0),
    lastError: text(),
    messageId: uuid().references(() => messages.id, { onDelete: "set null" }),
    processedAt: timestamptz(),
    cancelledReason: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("followups_due_idx").on(t.scheduledAt).where(sql`${t.status} = 'SCHEDULED'`),
    index("followups_organization_lead_idx").on(t.organizationId, t.leadId),
    index("followups_appointment_idx").on(t.appointmentId),
    check("followups_step_positive", sql`${t.step} > 0`),
  ],
);
