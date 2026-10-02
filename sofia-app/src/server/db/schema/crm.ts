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
  actorType,
  channel,
  consentPurpose,
  consentStatus,
  intentLevel,
  leadSource,
  leadStatus,
} from "./enums";
import { organizationId, users } from "./identity";
import { services } from "./knowledge";

/**
 * A lead is a person in an establishment's CRM, from first contact to loyal
 * client. Its conversation history, appointments and revenue live in their
 * own tables and point back here.
 */
export const leads = pgTable(
  "leads",
  {
    id: primaryId(),
    organizationId: organizationId(),
    firstName: text(),
    lastName: text(),
    /** E.164 format, e.g. +33612345678. */
    phone: text(),
    email: text(),
    instagramHandle: text(),
    /** Instagram-scoped user id (IGSID) used to reply through the Messaging API. */
    instagramUserId: text(),
    /** WhatsApp id (wa_id) as sent by the Cloud API. */
    whatsappId: text(),
    source: leadSource().notNull().default("MANUAL"),
    channel: channel(),
    interestedServiceId: uuid().references(() => services.id, { onDelete: "set null" }),
    status: leadStatus().notNull().default("NEW"),
    /** Lead score 0-100 computed from intent, engagement and profile. */
    score: smallint().notNull().default(0),
    intentLevel: intentLevel().notNull().default("LOW"),
    potentialValueCents: integer(),
    generatedValueCents: integer().notNull().default(0),
    language: text(),
    isExistingClient: boolean().notNull().default(false),
    assignedToUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    lastInteractionAt: timestamptz(),
    nextFollowUpAt: timestamptz(),
    lastAppointmentAt: timestamptz(),
    marketingConsent: consentStatus().notNull().default("UNKNOWN"),
    marketingConsentUpdatedAt: timestamptz(),
    /** Set when the person asked to stop receiving messages (STOP). No outbound marketing after this. */
    optedOutAt: timestamptz(),
    tags: text().array().notNull().default(sql`ARRAY[]::text[]`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("leads_organization_status_idx").on(t.organizationId, t.status),
    index("leads_organization_last_interaction_idx").on(t.organizationId, t.lastInteractionAt.desc()),
    index("leads_organization_next_follow_up_idx")
      .on(t.organizationId, t.nextFollowUpAt)
      .where(sql`${t.nextFollowUpAt} IS NOT NULL`),
    index("leads_organization_last_appointment_idx").on(t.organizationId, t.lastAppointmentAt),
    uniqueIndex("leads_organization_phone_unique")
      .on(t.organizationId, t.phone)
      .where(sql`${t.phone} IS NOT NULL`),
    uniqueIndex("leads_organization_email_unique")
      .on(t.organizationId, t.email)
      .where(sql`${t.email} IS NOT NULL`),
    uniqueIndex("leads_organization_instagram_unique")
      .on(t.organizationId, t.instagramUserId)
      .where(sql`${t.instagramUserId} IS NOT NULL`),
    uniqueIndex("leads_organization_whatsapp_unique")
      .on(t.organizationId, t.whatsappId)
      .where(sql`${t.whatsappId} IS NOT NULL`),
    check("leads_score_range", sql`${t.score} BETWEEN 0 AND 100`),
    check("leads_values_positive", sql`${t.generatedValueCents} >= 0 AND (${t.potentialValueCents} IS NULL OR ${t.potentialValueCents} >= 0)`),
  ],
);

export const leadNotes = pgTable(
  "lead_notes",
  {
    id: primaryId(),
    organizationId: organizationId(),
    leadId: uuid()
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    authorUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    body: text().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("lead_notes_lead_idx").on(t.leadId, t.createdAt.desc())],
);

/** Pipeline history: powers funnel analytics and "lost lead recovered" attribution. */
export const leadStatusChanges = pgTable(
  "lead_status_changes",
  {
    id: primaryId(),
    organizationId: organizationId(),
    leadId: uuid()
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    fromStatus: leadStatus(),
    toStatus: leadStatus().notNull(),
    actorType: actorType().notNull(),
    actorUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    reason: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("lead_status_changes_lead_idx").on(t.leadId, t.createdAt.desc()),
    index("lead_status_changes_organization_idx").on(t.organizationId, t.createdAt.desc()),
  ],
);

/** Append-only proof of consent (GDPR): what was accepted or withdrawn, when, and how. */
export const consentRecords = pgTable(
  "consent_records",
  {
    id: primaryId(),
    organizationId: organizationId(),
    leadId: uuid()
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    purpose: consentPurpose().notNull(),
    status: consentStatus().notNull(),
    channel: channel(),
    /** e.g. widget_checkbox, whatsapp_optin, stop_keyword, staff_manual. */
    source: text().notNull(),
    /** Evidence: wording shown, message id… Never health data. */
    proof: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    recordedByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("consent_records_lead_idx").on(t.leadId, t.createdAt.desc())],
);
