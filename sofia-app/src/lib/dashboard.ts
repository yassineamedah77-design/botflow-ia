import { formatNumber } from "@/lib/format";
import { zonedMonthRange, zonedParts } from "@/lib/timezone";

/**
 * Dashboard periods (specification §12). The revenue card, the indicators,
 * the funnel and the channel table follow the selected period and compare
 * it with the period just before, of the same length.
 */

export const DASHBOARD_PERIODS = ["month", "last-month", "30d", "90d"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const DASHBOARD_PERIOD_LABELS: Record<DashboardPeriod, string> = {
  month: "Ce mois-ci",
  "last-month": "Mois dernier",
  "30d": "30 jours",
  "90d": "90 jours",
};

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ResolvedPeriod {
  period: DashboardPeriod;
  current: DateRange;
  previous: DateRange;
  /** "Du 1er au 6 octobre", "Septembre 2026", "30 derniers jours". */
  label: string;
  /** "vs du 1er au 6 septembre". */
  comparison: string;
}

const DAY_MS = 24 * 3600 * 1000;

export function parseDashboardPeriod(value: string | string[] | undefined): DashboardPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  return (DASHBOARD_PERIODS as readonly string[]).includes(raw ?? "") ? (raw as DashboardPeriod) : "month";
}

function monthName(date: Date, timeZone: string, withYear = false) {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", ...(withYear ? { year: "numeric" } : {}), timeZone }).format(date);
}

function dayOfMonth(date: Date, timeZone: string) {
  const { day } = zonedParts(date, timeZone);
  return day === 1 ? "1er" : String(day);
}

/** "du 1er au 6 octobre" (or "le 1er octobre" on the first day). */
function monthToDate(from: Date, last: Date, timeZone: string) {
  const end = dayOfMonth(last, timeZone);
  return end === "1er" ? `le 1er ${monthName(from, timeZone)}` : `du 1er au ${end} ${monthName(from, timeZone)}`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function resolveDashboardPeriod(period: DashboardPeriod, now: Date, timeZone: string): ResolvedPeriod {
  switch (period) {
    case "month": {
      // Month to date, against the same days of the previous month.
      const current = { from: zonedMonthRange(now, timeZone).from, to: now };
      const previousMonth = zonedMonthRange(now, timeZone, -1);
      const elapsed = now.getTime() - current.from.getTime();
      const previous = { from: previousMonth.from, to: new Date(Math.min(previousMonth.from.getTime() + elapsed, previousMonth.to.getTime())) };
      const previousLast = new Date(previous.to.getTime() - 1);
      return {
        period,
        current,
        previous,
        label: capitalize(monthToDate(current.from, now, timeZone)),
        comparison: `vs ${monthToDate(previous.from, previousLast, timeZone)}`,
      };
    }
    case "last-month": {
      const current = zonedMonthRange(now, timeZone, -1);
      const previous = zonedMonthRange(now, timeZone, -2);
      return {
        period,
        current,
        previous,
        label: capitalize(monthName(current.from, timeZone, true)),
        comparison: `vs ${monthName(previous.from, timeZone, true)}`,
      };
    }
    case "30d":
    case "90d": {
      const days = period === "30d" ? 30 : 90;
      const current = { from: new Date(now.getTime() - days * DAY_MS), to: now };
      const previous = { from: new Date(now.getTime() - 2 * days * DAY_MS), to: current.from };
      return { period, current, previous, label: `${days} derniers jours`, comparison: `vs les ${days} jours précédents` };
    }
  }
}

/** Relative change; null when the previous value was zero (anything else would be infinite). */
export function relativeChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

/** "18 s", "4 min", "1 h 05". */
export function formatResponseTime(seconds: number) {
  if (seconds < 90) return `${Math.max(1, Math.round(seconds))} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

export interface Delta {
  /** Relative change (0.18 = +18 %), or a difference in points for rates (0.05 = +5 pts). */
  value: number | null;
  unit: "percent" | "points";
  /** Whether a rise is good news (fewer no-shows, a faster reply: down is good). */
  goodWhen: "up" | "down";
  /** Nothing in the previous period: no ratio to show, but something new to say. */
  fromZero?: boolean;
}

export type DeltaTone = "good" | "bad" | "neutral" | "none";

export function deltaTone(delta: Delta): DeltaTone {
  if (delta.value === null) return "none";
  // Under half a percent (or half a point): stable.
  if (Math.abs(delta.value) < 0.005) return "neutral";
  return delta.value > 0 === (delta.goodWhen === "up") ? "good" : "bad";
}

/** "+18,4 %", "−3 pts", "stable". */
export function formatDelta(delta: Delta): string {
  if (delta.value === null) return "";
  if (deltaTone(delta) === "neutral") return "stable";
  const sign = delta.value > 0 ? "+" : "−";
  const magnitude = Math.abs(delta.value) * 100;
  const digits = magnitude < 10 ? 1 : 0;
  const number = formatNumber(magnitude, { maximumFractionDigits: digits });
  return delta.unit === "points" ? `${sign}${number} pt${magnitude >= 2 ? "s" : ""}` : `${sign}${number} %`;
}
