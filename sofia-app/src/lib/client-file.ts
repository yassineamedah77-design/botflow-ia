import Papa from "papaparse";

import { parseAmountToCents } from "./money";
import { normalizePhone } from "./phone";

/*
 * Client file import, pure part (browser and server): decoding, CSV parsing,
 * column detection and row normalisation. Exports from booking and checkout
 * software are messy — semicolons, Windows encodings, "BERNARD Emma", phones
 * without their leading 0 — so every rule here is about tolerance, with a
 * reason recorded for anything left out.
 */

export const IMPORT_MAX_BYTES = 4 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 20_000;

export type ImportField =
  | "externalId"
  | "fullName"
  | "firstName"
  | "lastName"
  | "phone"
  | "email"
  | "lastVisitAt"
  | "firstVisitAt"
  | "visitCount"
  | "lifetimeValue"
  | "marketingConsent";

export type ImportMapping = Partial<Record<ImportField, string>>;

export const IMPORT_FIELDS: Array<{ key: ImportField; label: string; hint?: string; synonyms: string[] }> = [
  { key: "firstName", label: "Prénom", synonyms: ["prénom", "prenom", "first name", "firstname", "given name", "primeiro nome"] },
  {
    key: "lastName",
    label: "Nom",
    synonyms: ["nom", "nom de famille", "last name", "lastname", "surname", "family name", "apelido", "sobrenome", "apellido"],
  },
  {
    key: "fullName",
    label: "Nom complet",
    hint: "Si prénom et nom sont dans une seule colonne.",
    synonyms: ["nom complet", "nom et prénom", "nom prénom", "prénom nom", "client", "cliente", "full name", "name", "nome", "nome completo"],
  },
  {
    key: "phone",
    label: "Téléphone",
    synonyms: ["téléphone", "telephone", "tél", "tel", "portable", "mobile", "gsm", "phone", "téléphone portable", "numéro de téléphone", "telemóvel", "telemovel", "telefone", "whatsapp", "tel portable"],
  },
  { key: "email", label: "Email", synonyms: ["email", "e-mail", "mail", "adresse email", "adresse e-mail", "courriel"] },
  {
    key: "lastVisitAt",
    label: "Date de dernière visite",
    hint: "Indispensable pour cibler les clientes inactives.",
    synonyms: ["dernière visite", "derniere visite", "date dernière visite", "date de dernière visite", "dernier rdv", "dernier rendez-vous", "last visit", "last appointment", "última visita", "ultima visita"],
  },
  {
    key: "firstVisitAt",
    label: "Date de première visite",
    synonyms: ["première visite", "premiere visite", "date première visite", "date de première visite", "client depuis", "cliente depuis", "date de création", "date creation", "first visit", "primeira visita"],
  },
  {
    key: "visitCount",
    label: "Nombre de visites",
    synonyms: ["nb visites", "nombre de visites", "visites", "nb rdv", "nombre de rdv", "nombre de rendez-vous", "visits", "visit count", "número de visitas", "visitas"],
  },
  {
    key: "lifetimeValue",
    label: "Total dépensé",
    synonyms: ["ca total", "chiffre d'affaires", "total dépensé", "total depense", "montant total", "ca", "total spent", "revenue", "total gasto", "valor total"],
  },
  {
    key: "marketingConsent",
    label: "Consentement marketing",
    hint: "Oui / non. Vide = non renseigné.",
    synonyms: ["accepte sms/email", "consentement", "consentement marketing", "optin", "opt-in", "accepte les sms", "accepte marketing", "newsletter", "marketing", "consent", "aceita marketing"],
  },
  {
    key: "externalId",
    label: "N° client",
    hint: "Identifiant dans votre logiciel : un nouvel import met à jour au lieu de dupliquer.",
    synonyms: ["n° client", "numéro client", "numero client", "code client", "id client", "client id", "customer id", "id", "référence", "reference", "ref"],
  },
];

const normalizeHeader = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Proposes a column for each field from the headers' wording; the user confirms or changes it. */
export function guessMapping(headers: string[]): ImportMapping {
  const mapping: ImportMapping = {};
  const used = new Set<string>();
  const normalized = headers.map((header) => ({ header, key: normalizeHeader(header) }));
  // Exact matches first, then headers that contain a synonym ("Tél. portable").
  for (const pass of ["exact", "contains"] as const) {
    for (const field of IMPORT_FIELDS) {
      if (mapping[field.key]) continue;
      const synonyms = field.synonyms.map(normalizeHeader);
      const match = normalized.find(({ header, key }) => {
        if (used.has(header)) return false;
        return pass === "exact" ? synonyms.includes(key) : synonyms.some((synonym) => synonym.length >= 4 && key.includes(synonym));
      });
      if (match) {
        mapping[field.key] = match.header;
        used.add(match.header);
      }
    }
  }
  // A full name column is only useful when first and last names are not separate.
  if (mapping.firstName && mapping.lastName) delete mapping.fullName;
  return mapping;
}

/** UTF-8 when valid, otherwise Windows-1252 (Excel's default "CSV" on Windows). */
export function decodeFileBytes(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  return text.replace(/^﻿/, "");
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export class ClientFileError extends Error {}

export function parseClientFile(text: string): ParsedTable {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy", delimitersToGuess: [";", ",", "\t", "|"] });
  const [headerRow, ...rows] = result.data;
  if (!headerRow || headerRow.every((cell) => !cell.trim())) {
    throw new ClientFileError("Le fichier est vide ou sa première ligne ne contient pas les noms des colonnes.");
  }
  if (rows.length === 0) throw new ClientFileError("Le fichier ne contient aucune cliente sous la ligne des titres.");
  if (rows.length > IMPORT_MAX_ROWS) {
    throw new ClientFileError(`Le fichier contient ${rows.length.toLocaleString("fr-FR")} lignes : la limite est de ${IMPORT_MAX_ROWS.toLocaleString("fr-FR")}. Découpez-le en plusieurs fichiers.`);
  }
  const headers = headerRow.map((cell, index) => cell.trim() || `Colonne ${index + 1}`);
  // Duplicate titles would make the mapping ambiguous.
  const seen = new Map<string, number>();
  const unique = headers.map((header) => {
    const count = seen.get(header) ?? 0;
    seen.set(header, count + 1);
    return count ? `${header} (${count + 1})` : header;
  });
  return { headers: unique, rows };
}

// ─── Values ────────────────────────────────────────────────────────────────

/** Day-first dates as exported in France and Portugal; ISO dates too. */
export function parseDate(input: string): Date | null {
  const value = input.trim();
  if (!value) return null;
  let year: number, month: number, day: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/.exec(value);
  const dayFirst = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})(?:\s.*)?$/.exec(value);
  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (dayFirst) {
    [day, month, year] = [Number(dayFirst[1]), Number(dayFirst[2]), Number(dayFirst[3])];
    if (dayFirst[3]!.length === 2) year += year > (new Date().getFullYear() % 100) + 1 ? 1900 : 2000;
  } else {
    return null;
  }
  // Noon UTC: the calendar day stays the same in every European time zone.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null; // 31/02
  if (year < 1950 || date.getTime() > Date.now() + 24 * 60 * 60 * 1000) return null;
  return date;
}

export function parseVisitCount(input: string): number | null {
  const match = /\d+/.exec(input.replace(/\s/g, ""));
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isSafeInteger(value) && value >= 0 && value < 100_000 ? value : null;
}

const YES = new Set(["oui", "o", "yes", "y", "sim", "s", "true", "vrai", "1", "x", "✓", "✔", "ok", "accepte", "accepté", "acceptee", "acceptée", "opt-in", "optin"]);
const NO = new Set(["non", "n", "no", "nao", "não", "false", "faux", "0", "refuse", "refusé", "refusee", "refusée", "opt-out", "optout"]);

export function parseConsent(input: string): "GRANTED" | "DENIED" | "UNKNOWN" {
  const value = input.trim().toLowerCase();
  if (YES.has(value)) return "GRANTED";
  if (NO.has(value)) return "DENIED";
  return "UNKNOWN";
}

/** "EMMA" → "Emma", "jean-pierre" → "Jean-Pierre"; mixed-case names are kept as typed. */
function tidyName(value: string): string | null {
  const name = value.replace(/\s+/g, " ").trim();
  if (!name) return null;
  if (name !== name.toUpperCase() && name !== name.toLowerCase()) return name.slice(0, 60);
  return name
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_match, separator: string, letter: string) => separator + letter.toUpperCase())
    .slice(0, 60);
}

/** "BERNARD Emma" (French software style) or "Emma Bernard". */
export function splitFullName(value: string): { firstName: string | null; lastName: string | null } {
  const tokens = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (tokens.length === 0) return { firstName: null, lastName: null };
  if (tokens.length === 1) return { firstName: tidyName(tokens[0]!), lastName: null };
  const isUpper = (token: string) => token.length > 1 && token === token.toUpperCase() && token !== token.toLowerCase();
  const upper = tokens.filter(isUpper);
  if (upper.length > 0 && upper.length < tokens.length) {
    return { firstName: tidyName(tokens.filter((token) => !isUpper(token)).join(" ")), lastName: tidyName(upper.join(" ")) };
  }
  return { firstName: tidyName(tokens[0]!), lastName: tidyName(tokens.slice(1).join(" ")) };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ─── Rows ──────────────────────────────────────────────────────────────────

export interface NormalizedContact {
  /** 1-based line number in the file (header = line 1). */
  line: number;
  externalId: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  lastVisitAt: Date | null;
  firstVisitAt: Date | null;
  visitCount: number | null;
  lifetimeValueCents: number | null;
  marketingConsent: "GRANTED" | "DENIED" | "UNKNOWN";
  consentValue: string | null;
}

export type ImportWarning = "invalid_phone" | "invalid_email" | "unreadable_date" | "unreadable_number";

export const IMPORT_WARNING_LABELS: Record<ImportWarning, string> = {
  invalid_phone: "téléphone invalide ignoré",
  invalid_email: "email invalide ignoré",
  unreadable_date: "date illisible ignorée",
  unreadable_number: "nombre ou montant illisible ignoré",
};

export interface RowRejection {
  line: number;
  reason: string;
}

export interface AnalyzedFile {
  contacts: NormalizedContact[];
  rejected: RowRejection[];
  warnings: Partial<Record<ImportWarning, number>>;
  withoutLastVisit: number;
}

/** Normalises every row, drops unusable ones and duplicates (keeping the first occurrence). */
export function analyzeClientFile(table: ParsedTable, mapping: ImportMapping, country: string): AnalyzedFile {
  const column = (field: ImportField) => {
    const header = mapping[field];
    if (!header) return -1;
    return table.headers.indexOf(header);
  };
  const indexes = Object.fromEntries(IMPORT_FIELDS.map((field) => [field.key, column(field.key)])) as Record<ImportField, number>;
  const cell = (row: string[], field: ImportField) => (indexes[field] >= 0 ? (row[indexes[field]] ?? "").trim() : "");

  const contacts: NormalizedContact[] = [];
  const rejected: RowRejection[] = [];
  const warnings: Partial<Record<ImportWarning, number>> = {};
  const warn = (warning: ImportWarning) => (warnings[warning] = (warnings[warning] ?? 0) + 1);
  const seen = { externalId: new Map<string, number>(), phone: new Map<string, number>(), email: new Map<string, number>() };

  table.rows.forEach((row, index) => {
    const line = index + 2;
    const names = cell(row, "fullName") && !cell(row, "firstName") && !cell(row, "lastName")
      ? splitFullName(cell(row, "fullName"))
      : { firstName: tidyName(cell(row, "firstName")), lastName: tidyName(cell(row, "lastName")) };

    const rawPhone = cell(row, "phone");
    const phone = rawPhone ? normalizePhone(rawPhone, country) : null;
    if (rawPhone && !phone) warn("invalid_phone");
    const rawEmail = cell(row, "email").toLowerCase();
    const email = rawEmail && EMAIL_PATTERN.test(rawEmail) && rawEmail.length <= 254 ? rawEmail : null;
    if (rawEmail && !email) warn("invalid_email");

    if (!phone && !email) {
      rejected.push({ line, reason: rawPhone || rawEmail ? "Téléphone et email invalides" : "Ni téléphone ni email" });
      return;
    }

    const date = (field: "lastVisitAt" | "firstVisitAt") => {
      const raw = cell(row, field);
      const parsed = raw ? parseDate(raw) : null;
      if (raw && !parsed) warn("unreadable_date");
      return parsed;
    };
    const lastVisitAt = date("lastVisitAt");
    const firstVisitAt = date("firstVisitAt");
    const rawCount = cell(row, "visitCount");
    const visitCount = rawCount ? parseVisitCount(rawCount) : null;
    if (rawCount && visitCount === null) warn("unreadable_number");
    const rawValue = cell(row, "lifetimeValue");
    const parsedValue = rawValue ? parseAmountToCents(rawValue) : null;
    const lifetimeValueCents = parsedValue !== null && parsedValue >= 0 ? parsedValue : null;
    if (rawValue && lifetimeValueCents === null) warn("unreadable_number");
    const externalId = cell(row, "externalId").slice(0, 100) || null;
    const consentValue = cell(row, "marketingConsent") || null;

    // Duplicates inside the file: same client id, phone or email as an earlier line.
    const duplicateOf =
      (externalId && seen.externalId.get(externalId)) || (phone && seen.phone.get(phone)) || (email && seen.email.get(email));
    if (duplicateOf) {
      const what = externalId && seen.externalId.get(externalId) ? "même n° client" : phone && seen.phone.get(phone) ? "même téléphone" : "même email";
      rejected.push({ line, reason: `Doublon dans le fichier (${what} que la ligne ${duplicateOf})` });
      return;
    }
    if (externalId) seen.externalId.set(externalId, line);
    if (phone) seen.phone.set(phone, line);
    if (email) seen.email.set(email, line);

    contacts.push({
      line,
      externalId,
      firstName: names.firstName,
      lastName: names.lastName,
      phone,
      email,
      lastVisitAt,
      firstVisitAt: firstVisitAt && lastVisitAt && firstVisitAt > lastVisitAt ? lastVisitAt : firstVisitAt,
      visitCount: visitCount ?? (lastVisitAt ? 1 : null),
      lifetimeValueCents,
      marketingConsent: consentValue ? parseConsent(consentValue) : "UNKNOWN",
      consentValue,
    });
  });

  return { contacts, rejected, warnings, withoutLastVisit: contacts.filter((contact) => !contact.lastVisitAt).length };
}
