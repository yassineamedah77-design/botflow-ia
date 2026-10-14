import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createdAt, primaryId, timestamptz, updatedAt } from "./columns";
import { attributionType, revenueSource, revenueStatus } from "./enums";
import { organizationId } from "./identity";
import { leads } from "./crm";
import { appointments } from "./appointments";

/**
 * Revenue attributed to SOFIA:
 *
 *   lead perdu récupéré + rendez-vous généré + no-show récupéré
 *   + ancienne cliente réactivée = revenu attribué à SOFIA
 *
 * At most one row per appointment, carrying the most specific reason
 * (no-show recovered > client reactivated > lead recovered > appointment
 * generated), so a sum never counts an appointment twice. A row is ESTIMATED
 * until the appointment takes place (CONFIRMED) or falls through (CANCELLED).
 * Dashboards never present ESTIMATED as earned revenue, and no row is created
 * when the service price is not configured.
 */
export const revenueAttributions = pgTable(
  "revenue_attributions",
  {
    id: primaryId(),
    organizationId: organizationId(),
    leadId: uuid()
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    appointmentId: uuid()
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    attributionType: attributionType().notNull(),
    revenueSource: revenueSource().notNull(),
    amountCents: integer().notNull(),
    currency: text().notNull().default("EUR"),
    status: revenueStatus().notNull().default("ESTIMATED"),
    /** attribution_date in the specification. */
    attributedAt: timestamptz().notNull().defaultNow(),
    confirmedAt: timestamptz(),
    cancelledAt: timestamptz(),
    notes: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // An appointment is attributed once, so revenue is never counted twice.
    uniqueIndex("revenue_attributions_appointment_unique").on(t.appointmentId),
    index("revenue_attributions_organization_date_idx").on(t.organizationId, t.attributedAt.desc()),
    index("revenue_attributions_organization_status_idx").on(t.organizationId, t.status),
    check("revenue_attributions_amount_positive", sql`${t.amountCents} >= 0`),
  ],
);
