import type { KnowledgeSnapshot, SearchHit } from "./knowledge";
import type { HandoffAction, ReplyLanguage, SofiaTurn } from "./reply";

/*
 * Deterministic checks on every answer, after the model and before anything
 * is sent. A prompt asks; these guarantee. An answer quoting a price, a phone
 * number, an email or a link that the establishment never gave is not sent:
 * it is replaced by a neutral message and the conversation goes to the team,
 * with the original kept for review. Medical questions always reach a human,
 * and a booking request must name a real service.
 */

export type GuardViolationKind = "unknown_amount" | "unknown_phone" | "unknown_email" | "unknown_link" | "empty_reply";

export interface GuardViolation {
  kind: GuardViolationKind;
  /** The offending fragment, as written. */
  value: string;
}

export interface GuardContext {
  snapshot: KnowledgeSnapshot;
  /** Passages the search tool returned during this answer: SOFIA may quote them. */
  searchHits: SearchHit[];
  /** What the customer told about herself (she may be reminded of her own email). */
  customerEmail: string | null;
  /** The customer's own messages: an email or number she typed may be repeated back. */
  customerText: string;
}

export interface GuardResult {
  turn: SofiaTurn;
  violations: GuardViolation[];
  /** True when the reply was replaced by the neutral message. */
  replaced: boolean;
  originalReply: string | null;
  /** Corrections that did not need replacing the reply (medical hand-over added…). */
  adjustments: string[];
}

// ─── Extraction ─────────────────────────────────────────────────────────────

const AMOUNT_AFTER = /(\d{1,3}(?:[\s  .]\d{3})+|\d+)(?:[,.](\d{1,2}))?\s*(?:€|eur(?:os?)?\b)/giu;
const AMOUNT_BEFORE = /€\s*(\d{1,3}(?:[\s  ,.]\d{3})+|\d+)(?:[.,](\d{1,2}))?/giu;

function toCents(integer: string, decimals: string | undefined) {
  const whole = Number(integer.replace(/[\s  .,]/g, ""));
  const fraction = decimals ? Number(decimals.padEnd(2, "0")) : 0;
  return whole * 100 + fraction;
}

/** Every amount in euros written in `text`, in cents, with the fragment that wrote it. */
export function extractAmounts(text: string): Array<{ cents: number; value: string }> {
  const found: Array<{ cents: number; value: string }> = [];
  for (const pattern of [AMOUNT_AFTER, AMOUNT_BEFORE]) {
    for (const match of text.matchAll(pattern)) {
      found.push({ cents: toCents(match[1]!, match[2]), value: match[0].trim() });
    }
  }
  return found;
}

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/giu;

export function extractEmails(text: string): string[] {
  return [...text.matchAll(EMAIL)].map((match) => match[0].toLowerCase());
}

const PHONE_CANDIDATE = /\+?\d[\d\s.\-()  ]{7,}\d/gu;

/** Digit sequences long enough to be a phone number (9 to 15 digits). */
export function extractPhones(text: string): Array<{ digits: string; value: string }> {
  return [...text.replace(EMAIL, " ").matchAll(PHONE_CANDIDATE)]
    .map((match) => ({ digits: match[0].replace(/\D/g, ""), value: match[0].trim() }))
    .filter((phone) => phone.digits.length >= 9 && phone.digits.length <= 15);
}

const LINK = /\bhttps?:\/\/[^\s<>"')]+|\bwww\.[^\s<>"')]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:fr|pt|com|net|org|eu|be|ch|io|co|shop|beauty|me)\b(?:\/[^\s<>"')]*)?/giu;

export function extractHosts(text: string): Array<{ host: string; value: string }> {
  return [...text.replace(EMAIL, " ").matchAll(LINK)].map((match) => {
    const value = match[0].replace(/[.,;:!?]+$/, "");
    const host = value
      .replace(/^https?:\/\//i, "")
      .split(/[/?#]/)[0]!
      .toLowerCase()
      .replace(/^www\./, "");
    return { host, value };
  });
}

/** "+33 6 12 34 56 78" and "06 12 34 56 78" are the same number: compare the last nine digits. */
const phoneKey = (digits: string) => digits.slice(-9);

// ─── What the establishment wrote ───────────────────────────────────────────

function knowledgeTexts(snapshot: KnowledgeSnapshot, hits: SearchHit[]): string[] {
  const profile = snapshot.profile;
  return [
    profile?.description,
    profile?.bookingPolicy,
    profile?.cancellationPolicy,
    profile?.importantInfo,
    profile?.address,
    ...snapshot.services.flatMap((service) => [service.name, service.description, service.preparation, service.aftercare]),
    ...snapshot.faqs.flatMap((faq) => [faq.question, faq.answer]),
    ...snapshot.promotions.flatMap((promotion) => [promotion.title, promotion.description]),
    ...snapshot.practitioners.map((practitioner) => practitioner.bio),
    ...snapshot.closures.map((closure) => closure.reason),
    ...hits.map((hit) => hit.content),
  ].filter((text): text is string => Boolean(text));
}

interface Allowed {
  amounts: Set<number>;
  phones: Set<string>;
  emails: Set<string>;
  hosts: Set<string>;
}

function allowedValues(context: GuardContext, turn: SofiaTurn): Allowed {
  const { snapshot } = context;
  const texts = knowledgeTexts(snapshot, context.searchHits);
  const profile = snapshot.profile;
  const amounts = new Set<number>(snapshot.services.map((service) => service.priceCents).filter((cents): cents is number => cents !== null));
  const phones = new Set<string>();
  const emails = new Set<string>();
  const hosts = new Set<string>(["instagram.com", "wa.me"]);

  for (const text of [...texts, context.customerText]) {
    for (const amount of extractAmounts(text)) if (text !== context.customerText) amounts.add(amount.cents);
    for (const phone of extractPhones(text)) phones.add(phoneKey(phone.digits));
    for (const email of extractEmails(text)) emails.add(email);
    for (const { host } of extractHosts(text)) if (text !== context.customerText) hosts.add(host);
  }
  for (const phone of [profile?.phone, profile?.whatsappNumber]) {
    const digits = phone?.replace(/\D/g, "");
    if (digits && digits.length >= 9) phones.add(phoneKey(digits));
  }
  for (const email of [profile?.email, context.customerEmail, turn.action.type === "booking_request" ? turn.action.email : null]) {
    if (email) emails.add(email.toLowerCase());
  }
  if (profile?.websiteUrl) {
    try {
      hosts.add(new URL(profile.websiteUrl).hostname.toLowerCase().replace(/^www\./, ""));
    } catch {
      // An invalid stored URL simply allows nothing.
    }
  }
  return { amounts, phones, emails, hosts };
}

export function findViolations(reply: string, allowed: Allowed): GuardViolation[] {
  const violations: GuardViolation[] = [];
  if (!reply.trim()) violations.push({ kind: "empty_reply", value: "" });
  for (const amount of extractAmounts(reply)) {
    if (!allowed.amounts.has(amount.cents)) violations.push({ kind: "unknown_amount", value: amount.value });
  }
  for (const phone of extractPhones(reply)) {
    if (!allowed.phones.has(phoneKey(phone.digits))) violations.push({ kind: "unknown_phone", value: phone.value });
  }
  for (const email of extractEmails(reply)) {
    if (!allowed.emails.has(email)) violations.push({ kind: "unknown_email", value: email });
  }
  for (const { host, value } of extractHosts(reply)) {
    const known = [...allowed.hosts].some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
    if (!known) violations.push({ kind: "unknown_link", value });
  }
  return violations;
}

// ─── Corrections ────────────────────────────────────────────────────────────

const NEUTRAL_REPLY: Record<ReplyLanguage, string> = {
  fr: "Je préfère vérifier ce point avec l'équipe pour vous donner une information exacte. Elle revient vers vous très vite.",
  pt: "Prefiro confirmar este ponto com a equipa para lhe dar uma informação exata. Entraremos em contacto consigo muito em breve.",
  en: "I'd rather check this with the team so I can give you accurate information. They will get back to you very soon.",
};

const VIOLATION_LABELS: Record<GuardViolationKind, string> = {
  unknown_amount: "un prix absent de la Knowledge Base",
  unknown_phone: "un numéro absent de la fiche",
  unknown_email: "un email absent de la fiche",
  unknown_link: "un lien absent de la fiche",
  empty_reply: "une réponse vide",
};

export function describeViolation(violation: GuardViolation) {
  return violation.value ? `${VIOLATION_LABELS[violation.kind]} (« ${violation.value} »)` : VIOLATION_LABELS[violation.kind];
}

function handoff(reason: HandoffAction["reason"], summary: string, urgency: HandoffAction["urgency"] = "normal"): HandoffAction {
  return { type: "handoff", reason, urgency, summary };
}

export function applyGuards(input: SofiaTurn, context: GuardContext): GuardResult {
  // The label marking the team's past replies is for the model only: never echoed to the customer.
  let turn: SofiaTurn = { ...input, reply: input.reply.replace(/^\s*\[Message écrit par l'équipe de l'établissement\]\s*/u, "").trim() };
  const adjustments: string[] = [];
  const { snapshot } = context;

  // Reported, not blocked: the prompt already asks for one of the establishment's languages.
  if (!snapshot.organization.allowedLanguages.includes(turn.language)) {
    adjustments.push(`réponse en « ${turn.language} », hors des langues de l'établissement`);
  }

  // Medical questions always reach a human, whatever the model chose.
  const medicalHandoff = turn.action.type === "handoff" && turn.action.reason === "medical";
  if (turn.intent === "MEDICAL_QUESTION" && !medicalHandoff) {
    turn = { ...turn, action: handoff("medical", `Question de santé posée par la cliente, à traiter par ${snapshot.profile?.medicalReferent ?? "l'équipe"}.`) };
    adjustments.push("question médicale transmise à l'équipe");
  } else if (medicalHandoff && turn.intent !== "MEDICAL_QUESTION") {
    turn = { ...turn, intent: "MEDICAL_QUESTION" };
  }

  // A booking request names an active service of this establishment, and a person.
  if (turn.action.type === "booking_request") {
    const action = turn.action;
    const service = snapshot.services.find((candidate) => candidate.slug === action.serviceSlug);
    const email = action.email && extractEmails(action.email)[0] ? action.email.trim().toLowerCase() : null;
    if (!service || !action.firstName.trim()) {
      turn = {
        ...turn,
        action: handoff(
          "other",
          `Demande de rendez-vous à reprendre : ${service ? "nom de la cliente manquant" : `prestation inconnue (« ${action.serviceSlug} »)`}.`,
        ),
      };
      adjustments.push("demande de rendez-vous incomplète transmise à l'équipe");
    } else if (email !== action.email) {
      turn = { ...turn, action: { ...action, email } };
    }
  }

  const violations = findViolations(turn.reply, allowedValues(context, turn));
  if (violations.length === 0) return { turn, violations, replaced: false, originalReply: null, adjustments };

  const language: ReplyLanguage = snapshot.organization.allowedLanguages.includes(turn.language)
    ? turn.language
    : ((["fr", "pt", "en"] as const).find((code) => code === snapshot.organization.defaultLanguage) ?? "fr");
  const reason = violations.some((violation) => violation.kind === "unknown_amount") ? "price_unknown" : "other";
  return {
    turn: {
      ...turn,
      reply: NEUTRAL_REPLY[language],
      language,
      // A medical hand-over stays one; anything else becomes a hand-over to check the answer.
      action:
        turn.action.type === "handoff" && turn.action.reason === "medical"
          ? turn.action
          : handoff(reason, `Réponse de SOFIA bloquée : elle contenait ${violations.map(describeViolation).join(", ")}. À vérifier et à compléter.`),
    },
    violations,
    replaced: true,
    originalReply: input.reply,
    adjustments,
  };
}
