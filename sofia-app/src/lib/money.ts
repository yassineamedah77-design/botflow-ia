/**
 * Parses an amount typed by a person or exported by a spreadsheet into integer
 * cents: "180", "180,50", "1 234,56 €", "1.234,56", "1,234.56", "€95".
 * Returns null when the text is not an amount.
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[\s  €$£]|EUR/gi, "");
  if (!cleaned) return null;
  if (!/^-?[\d.,]+$/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    // Both separators: the last one is the decimal separator.
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalized = cleaned.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0 || lastDot >= 0) {
    const separator = lastComma >= 0 ? "," : ".";
    const parts = cleaned.split(separator);
    const tail = parts[parts.length - 1]!;
    // "1.234" or "12,500,000": groups of three digits are thousands, not decimals.
    const thousandsOnly = tail.length === 3 && (parts.length > 2 || parts[0]!.length <= 3) && parts.slice(1).every((part) => part.length === 3);
    normalized = thousandsOnly ? parts.join("") : `${parts.slice(0, -1).join("")}.${tail}`;
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}
