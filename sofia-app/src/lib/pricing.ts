import { formatCurrency } from "./format";

export type PriceType = "FIXED" | "FROM" | "ON_CONSULTATION" | "FREE";

/**
 * How a service price is presented — and therefore what SOFIA may say.
 * A missing price is shown as such: SOFIA never quotes an unconfigured price.
 */
export function describePrice(priceType: PriceType, priceCents: number | null, currency = "EUR") {
  switch (priceType) {
    case "FREE":
      return { label: "Offert", configured: true };
    case "ON_CONSULTATION":
      return { label: "Sur consultation", configured: true };
    case "FROM":
      return priceCents === null
        ? { label: "Non renseigné", configured: false }
        : { label: `À partir de ${formatCurrency(priceCents, currency)}`, configured: true };
    case "FIXED":
      return priceCents === null
        ? { label: "Non renseigné", configured: false }
        : { label: formatCurrency(priceCents, currency), configured: true };
  }
}

export const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

/** "10:00:00" → "10 h", "09:30:00" → "9 h 30". */
export function formatClockTime(value: string) {
  const [hours = "0", minutes = "00"] = value.split(":");
  const h = Number(hours);
  return minutes === "00" ? `${h} h` : `${h} h ${minutes}`;
}
