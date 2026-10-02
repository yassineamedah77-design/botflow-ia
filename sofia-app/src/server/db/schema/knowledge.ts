import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, primaryId, timestamptz, updatedAt } from "./columns";
import { knowledgeDocumentStatus, knowledgeDocumentType, priceType } from "./enums";
import { organizations, organizationId, users } from "./identity";

/*
 * Business context: everything SOFIA is allowed to say about an
 * establishment. SOFIA never invents a price, a schedule, a service or a
 * promotion — a NULL value here means "not configured" and SOFIA must say it
 * will check, or hand over to a human.
 */

export const businessProfiles = pgTable("business_profiles", {
  organizationId: uuid()
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  /** First name the assistant uses with customers. */
  assistantName: text().notNull().default("SOFIA"),
  description: text(),
  /** Free-form tone guidance, e.g. "chaleureux, vouvoiement, phrases courtes". */
  tone: text(),
  addressLine: text(),
  postalCode: text(),
  city: text(),
  country: text(),
  phone: text(),
  email: text(),
  websiteUrl: text(),
  instagramHandle: text(),
  whatsappNumber: text(),
  cancellationPolicy: text(),
  bookingPolicy: text(),
  importantInfo: text(),
  updatedAt: updatedAt(),
});

export const businessHours = pgTable(
  "business_hours",
  {
    id: primaryId(),
    organizationId: organizationId(),
    /** ISO weekday: 1 = Monday … 7 = Sunday. A day without rows is closed. */
    dayOfWeek: smallint().notNull(),
    opensAt: time().notNull(),
    closesAt: time().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("business_hours_organization_day_idx").on(t.organizationId, t.dayOfWeek),
    check("business_hours_day_valid", sql`${t.dayOfWeek} BETWEEN 1 AND 7`),
    check("business_hours_range_valid", sql`${t.closesAt} > ${t.opensAt}`),
  ],
);

export const businessClosures = pgTable(
  "business_closures",
  {
    id: primaryId(),
    organizationId: organizationId(),
    startsOn: date().notNull(),
    endsOn: date().notNull(),
    reason: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("business_closures_organization_idx").on(t.organizationId, t.startsOn),
    check("business_closures_range_valid", sql`${t.endsOn} >= ${t.startsOn}`),
  ],
);

export const services = pgTable(
  "services",
  {
    id: primaryId(),
    organizationId: organizationId(),
    name: text().notNull(),
    /** Stable identifier used by SOFIA's tools (unique per establishment). */
    slug: text().notNull(),
    category: text(),
    description: text(),
    priceType: priceType().notNull().default("FIXED"),
    /** NULL = price not configured: SOFIA must not quote one. */
    priceCents: integer(),
    durationMinutes: integer(),
    preparation: text(),
    contraindications: text(),
    aftercare: text(),
    requiresConsultation: boolean().notNull().default(false),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("services_organization_slug_unique").on(t.organizationId, t.slug),
    index("services_organization_active_idx").on(t.organizationId, t.isActive, t.sortOrder),
    check("services_price_positive", sql`${t.priceCents} IS NULL OR ${t.priceCents} >= 0`),
    check("services_duration_positive", sql`${t.durationMinutes} IS NULL OR ${t.durationMinutes} > 0`),
  ],
);

export const practitioners = pgTable(
  "practitioners",
  {
    id: primaryId(),
    organizationId: organizationId(),
    name: text().notNull(),
    title: text(),
    bio: text(),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("practitioners_organization_idx").on(t.organizationId)],
);

export const practitionerServices = pgTable(
  "practitioner_services",
  {
    organizationId: organizationId(),
    practitionerId: uuid()
      .notNull()
      .references(() => practitioners.id, { onDelete: "cascade" }),
    serviceId: uuid()
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.practitionerId, t.serviceId] }),
    index("practitioner_services_service_idx").on(t.serviceId),
  ],
);

export const faqs = pgTable(
  "faqs",
  {
    id: primaryId(),
    organizationId: organizationId(),
    /** Optional: FAQ attached to a specific service. */
    serviceId: uuid().references(() => services.id, { onDelete: "cascade" }),
    question: text().notNull(),
    answer: text().notNull(),
    language: text().notNull().default("fr"),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("faqs_organization_idx").on(t.organizationId, t.isActive),
    index("faqs_service_idx").on(t.serviceId),
  ],
);

export const promotions = pgTable(
  "promotions",
  {
    id: primaryId(),
    organizationId: organizationId(),
    serviceId: uuid().references(() => services.id, { onDelete: "set null" }),
    title: text().notNull(),
    description: text(),
    startsAt: timestamptz(),
    endsAt: timestamptz(),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("promotions_organization_active_idx").on(t.organizationId, t.isActive),
    check("promotions_range_valid", sql`${t.endsAt} IS NULL OR ${t.startsAt} IS NULL OR ${t.endsAt} > ${t.startsAt}`),
  ],
);

/** Source documents for the knowledge base. Chunks and embeddings (RAG) arrive in Phase 3. */
export const knowledgeDocuments = pgTable(
  "knowledge_documents",
  {
    id: primaryId(),
    organizationId: organizationId(),
    type: knowledgeDocumentType().notNull(),
    title: text().notNull(),
    sourceUrl: text(),
    content: text(),
    status: knowledgeDocumentStatus().notNull().default("PENDING"),
    error: text(),
    createdByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("knowledge_documents_organization_idx").on(t.organizationId, t.status)],
);
