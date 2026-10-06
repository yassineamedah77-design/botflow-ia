import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

/**
 * Phone numbers are stored in E.164 (+33612345678): the format WhatsApp uses
 * to identify a contact, and the key that merges duplicates on import.
 */

export const DEFAULT_PHONE_COUNTRY: CountryCode = "FR";

export function normalizePhone(input: string, defaultCountry: string = DEFAULT_PHONE_COUNTRY): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // "0033 6…" is common in client files: treat 00 as the international prefix.
  const candidate = trimmed.replace(/^00(?=\d)/, "+");
  const parsed = parsePhoneNumberFromString(candidate, defaultCountry.toUpperCase() as CountryCode);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/** "+33 6 39 98 00 12" for display; unknown formats are returned unchanged. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}
