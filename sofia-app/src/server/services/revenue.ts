import "server-only";

import { and, count, eq, gte, lt, sum } from "drizzle-orm";

import type { AttributionType } from "@/lib/crm";
import type { DateRange } from "@/lib/dashboard";
import type { Transaction } from "@/server/db/context";
import { revenueAttributions } from "@/server/db/schema";

/*
 * Revenue attributed to SOFIA (specification §13):
 *
 *   lead perdu récupéré + rendez-vous généré + no-show récupéré
 *   + ancienne cliente réactivée = revenu attribué à SOFIA
 *
 * Each appointment carries at most one attribution, under its most specific
 * reason, so sums never count an appointment twice. Only CONFIRMED rows (the
 * appointment took place) are recovered revenue, dated by `confirmedAt`;
 * ESTIMATED rows are shown apart and never presented as earned.
 */

export const ATTRIBUTION_TYPES: AttributionType[] = ["APPOINTMENT_GENERATED", "LEAD_RECOVERED", "NO_SHOW_RECOVERED", "CLIENT_REACTIVATED"];

export interface RecoveredRevenue {
  totalCents: number;
  appointments: number;
  byType: Record<AttributionType, { amountCents: number; appointments: number }>;
}

/** Revenue SOFIA recovered over [from, to): attributed appointments honoured in the range. */
export async function getRecoveredRevenue(tx: Transaction, organizationId: string, range: DateRange): Promise<RecoveredRevenue> {
  const rows = await tx
    .select({
      type: revenueAttributions.attributionType,
      amount: sum(revenueAttributions.amountCents).mapWith(Number),
      appointments: count(),
    })
    .from(revenueAttributions)
    .where(
      and(
        eq(revenueAttributions.organizationId, organizationId),
        eq(revenueAttributions.status, "CONFIRMED"),
        gte(revenueAttributions.confirmedAt, range.from),
        lt(revenueAttributions.confirmedAt, range.to),
      ),
    )
    .groupBy(revenueAttributions.attributionType);

  const byType = Object.fromEntries(
    ATTRIBUTION_TYPES.map((type) => {
      const row = rows.find((candidate) => candidate.type === type);
      return [type, { amountCents: row?.amount ?? 0, appointments: row?.appointments ?? 0 }];
    }),
  ) as RecoveredRevenue["byType"];
  return {
    totalCents: rows.reduce((total, row) => total + (row.amount ?? 0), 0),
    appointments: rows.reduce((total, row) => total + row.appointments, 0),
    byType,
  };
}

export interface PendingRevenue {
  amountCents: number;
  appointments: number;
}

/** Booked by SOFIA and not honoured yet: an estimate, shown apart from recovered revenue. */
export async function getPendingRevenue(tx: Transaction, organizationId: string): Promise<PendingRevenue> {
  const [row] = await tx
    .select({ amount: sum(revenueAttributions.amountCents).mapWith(Number), appointments: count() })
    .from(revenueAttributions)
    .where(and(eq(revenueAttributions.organizationId, organizationId), eq(revenueAttributions.status, "ESTIMATED")));
  return { amountCents: row?.amount ?? 0, appointments: row?.appointments ?? 0 };
}
