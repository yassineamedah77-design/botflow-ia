import { zonedParts } from "@/lib/timezone";

/*
 * Calendar days of the knowledge base (closures, promotions), as
 * "YYYY-MM-DD" strings in the establishment's time zone.
 */

/** The establishment's calendar day containing `date`. */
export function isoDayInZone(date: Date, timeZone: string, addDays = 0): string {
  const { year, month, day } = zonedParts(date, timeZone);
  const shifted = new Date(Date.UTC(year, month - 1, day + addDays));
  return shifted.toISOString().slice(0, 10);
}

/** "12 octobre 2026" for "2026-10-12" (no time zone shift: it is already a local day). */
export function formatIsoDay(isoDay: string, locale = "fr-FR", options: Intl.DateTimeFormatOptions = { dateStyle: "long" }) {
  const [year, month, day] = isoDay.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** "du 24 décembre 2026 au 2 janvier 2027", "le 1 mai 2027", "à partir du …", "jusqu'au …". */
export function formatDayRange(startsOn: string | null, endsOn: string | null): string {
  if (startsOn && endsOn) return startsOn === endsOn ? `le ${formatIsoDay(startsOn)}` : `du ${formatIsoDay(startsOn)} au ${formatIsoDay(endsOn)}`;
  if (startsOn) return `à partir du ${formatIsoDay(startsOn)}`;
  if (endsOn) return `jusqu'au ${formatIsoDay(endsOn)}`;
  return "sans date de fin";
}

/** Where `today` stands relative to an inclusive range of days. */
export function dayRangeState(startsOn: string | null, endsOn: string | null, today: string): "upcoming" | "current" | "past" {
  if (endsOn && endsOn < today) return "past";
  if (startsOn && startsOn > today) return "upcoming";
  return "current";
}
