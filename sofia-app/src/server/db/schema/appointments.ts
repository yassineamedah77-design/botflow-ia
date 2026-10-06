import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

import { createdAt, primaryId, timestamptz, updatedAt } from "./columns";
import { actorType, appointmentSource, appointmentStatus, integrationProvider } from "./enums";
import { organizationId, users } from "./identity";
import { practitioners, services } from "./knowledge";
import { leads } from "./crm";
import { conversations } from "./conversations";

export const appointments = pgTable(
  "appointments",
  {
    id: primaryId(),
    organizationId: organizationId(),
    leadId: uuid()
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    serviceId: uuid().references(() => services.id, { onDelete: "set null" }),
    practitionerId: uuid().references(() => practitioners.id, { onDelete: "set null" }),
    conversationId: uuid().references(() => conversations.id, { onDelete: "set null" }),
    status: appointmentStatus().notNull().default("PENDING"),
    source: appointmentSource().notNull(),
    startsAt: timestamptz().notNull(),
    endsAt: timestamptz().notNull(),
    /** Service price frozen at booking time. NULL when the price was not configured. */
    priceCents: integer(),
    currency: text().notNull().default("EUR"),
    /** NULL = SOFIA's internal agenda. */
    calendarProvider: integrationProvider(),
    externalEventId: text(),
    notes: text(),
    confirmedAt: timestamptz(),
    cancelledAt: timestamptz(),
    cancellationReason: text(),
    completedAt: timestamptz(),
    noShowAt: timestamptz(),
    rescheduledFromId: uuid().references((): AnyPgColumn => appointments.id, { onDelete: "set null" }),
    createdByType: actorType().notNull(),
    createdByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("appointments_organization_starts_idx").on(t.organizationId, t.startsAt),
    index("appointments_organization_status_idx").on(t.organizationId, t.status, t.startsAt),
    index("appointments_lead_idx").on(t.leadId, t.startsAt.desc()),
    index("appointments_practitioner_idx").on(t.practitionerId, t.startsAt),
    check("appointments_range_valid", sql`${t.endsAt} > ${t.startsAt}`),
    check("appointments_price_positive", sql`${t.priceCents} IS NULL OR ${t.priceCents} >= 0`),
  ],
);
