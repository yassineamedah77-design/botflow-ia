/** Formatting helpers (French locale by default). Amounts are integer cents. */

/**
 * French formats group thousands with a narrow no-break space (U+202F),
 * which the heading font draws almost without width ("1485 €"). A regular
 * no-break space keeps "1 485 €" readable and on one line.
 */
function withNbsp(text: string) {
  return text.replace(/\u202f/g, "\u00a0");
}

/** "1 234", "24 %", "1,5 k€": Intl formatting with readable spaces. */
export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}, locale = "fr-FR") {
  return withNbsp(new Intl.NumberFormat(locale, options).format(value));
}

/** A ratio as a percentage: 0.24 → "24 %". */
export function formatPercent(ratio: number, maximumFractionDigits = 0, locale = "fr-FR") {
  return formatNumber(ratio, { style: "percent", maximumFractionDigits }, locale);
}

export function formatCurrency(cents: number, currency = "EUR", locale = "fr-FR") {
  const whole = cents % 100 === 0;
  return formatNumber(cents / 100, { style: "currency", currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }, locale);
}

export function formatDateTime(date: Date, options: { timeZone?: string; locale?: string } = {}) {
  return new Intl.DateTimeFormat(options.locale ?? "fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: options.timeZone,
  }).format(date);
}

export function formatDate(date: Date, options: { timeZone?: string; locale?: string } = {}) {
  return new Intl.DateTimeFormat(options.locale ?? "fr-FR", { dateStyle: "long", timeZone: options.timeZone }).format(date);
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "il y a 12 min", "dans 2 jours"… */
export function formatRelativeTime(date: Date, now = new Date(), locale = "fr-FR") {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) {
      // "il y a 35 min", "il y a 2 h", but "il y a 3 mois" (the short form of months reads "3 m.").
      const style = unit === "minute" || unit === "hour" ? "short" : "long";
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto", style }).format(Math.round(seconds / size), unit);
    }
  }
  return "à l'instant";
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/** "Camille Laurent" → "CL". */
export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
