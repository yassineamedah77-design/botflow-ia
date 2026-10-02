import "server-only";

import { and, count, eq, gte, lt, sql, sum } from "drizzle-orm";

import type { Transaction } from "@/server/db/context";
import { revenueAttributions } from "@/server/db/schema";

export interface RevenueSummary {
  /** Appointments that took place: shown as recovered revenue. */
  confirmedCents: number;
  /** Booked but not yet honoured: shown separately, never as earned. */
  estimatedCents: number;
  attributedAppointments: number;
}

/** Revenue attributed to SOFIA over [from, to). */
export async function getRevenueSummary(
  tx: Transaction,
  organizationId: string,
  range: { from: Date; to: Date },
): Promise<RevenueSummary> {
  const rows = await tx
    .select({
      status: revenueAttributions.status,
      amount: sum(revenueAttributions.amountCents).mapWith(Number),
      appointments: count(sql`DISTINCT ${revenueAttributions.appointmentId}`),
    })
    .from(revenueAttributions)
    .where(
      and(
        eq(revenueAttributions.organizationId, organizationId),
        gte(revenueAttributions.attributedAt, range.from),
        lt(revenueAttributions.attributedAt, range.to),
      ),
    )
    .groupBy(revenueAttributions.status);

  const byStatus = (status: "CONFIRMED" | "ESTIMATED") => rows.find((row) => row.status === status);
  return {
    confirmedCents: byStatus("CONFIRMED")?.amount ?? 0,
    estimatedCents: byStatus("ESTIMATED")?.amount ?? 0,
    attributedAppointments: rows
      .filter((row) => row.status !== "CANCELLED")
      .reduce((total, row) => total + Number(row.appointments), 0),
  };
}

/** Wall-clock time of `date` in `timeZone`, read back as if it were UTC (epoch ms). */
function zonedWallClock(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
}

/** Calendar month containing `date` in the establishment's time zone, as UTC instants [from, to). */
export function monthRange(date: Date, timeZone: string) {
  const wallClock = new Date(zonedWallClock(date, timeZone));
  const year = wallClock.getUTCFullYear();
  const month = wallClock.getUTCMonth();
  // Local midnight on the 1st → UTC instant, using the zone offset at that moment.
  const startOfMonth = (y: number, m: number) => {
    const naive = Date.UTC(y, m, 1);
    const offset = zonedWallClock(new Date(naive), timeZone) - naive;
    return new Date(naive - offset);
  };
  return { from: startOfMonth(year, month), to: startOfMonth(year, month + 1) };
}
