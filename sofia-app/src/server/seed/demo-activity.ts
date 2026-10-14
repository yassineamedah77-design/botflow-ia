import "server-only";

import { randomUUID } from "node:crypto";

import { IMPORT_DECLARATION } from "@/lib/contacts";
import { zonedParts, zonedTimeToUtc } from "@/lib/timezone";
import type { Transaction } from "@/server/db/context";
import {
  appointments,
  campaignRecipients,
  campaigns,
  consentRecords,
  contactImports,
  conversations,
  followups,
  leadNotes,
  leadStatusChanges,
  leads,
  messages,
  notifications,
  revenueAttributions,
} from "@/server/db/schema";

/*
 * Living demo data for Maison Éclat (specification §32): three months of
 * leads, conversations, appointments and attributed revenue, plus an imported
 * client file feeding the reactivation segments. Everything is fictional:
 * phone numbers come from the range ARCEP reserves for fiction (06 39 98 …),
 * emails use example.com. Generation is deterministic for a given day.
 */

type LeadInsert = typeof leads.$inferInsert;
type ConversationInsert = typeof conversations.$inferInsert;
type MessageInsert = typeof messages.$inferInsert;
type AppointmentInsert = typeof appointments.$inferInsert;
type AttributionInsert = typeof revenueAttributions.$inferInsert;
type StatusChangeInsert = typeof leadStatusChanges.$inferInsert;
type FollowupInsert = typeof followups.$inferInsert;
type LeadStatus = NonNullable<LeadInsert["status"]>;
type Channel = NonNullable<ConversationInsert["channel"]>;
type Language = "fr" | "pt" | "en";
type AttributionType = AttributionInsert["attributionType"];

export interface DemoService {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  priceCents: number | null;
  durationMinutes: number | null;
}

export interface DemoSeedContext {
  organizationId: string;
  timeZone: string;
  now: Date;
  team: { ownerId: string; adminId: string; staffId: string };
  services: DemoService[];
  practitioners: Array<{ id: string; categories: string[] }>;
}

export interface DemoSeedSummary {
  leads: number;
  conversations: number;
  messages: number;
  appointments: number;
  followups: number;
  importedClients: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// ─── Deterministic randomness ───────────────────────────────────────────────

function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    chance: (probability: number) => next() < probability,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!,
    weighted: <T>(entries: ReadonlyArray<readonly [T, number]>): T => {
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = next() * total;
      for (const [value, weight] of entries) {
        roll -= weight;
        if (roll < 0) return value;
      }
      return entries[entries.length - 1]![0];
    },
  };
}
type Random = ReturnType<typeof createRandom>;

// ─── People ─────────────────────────────────────────────────────────────────

const FIRST_NAMES_FR = [
  "Emma", "Jade", "Louise", "Alice", "Lina", "Rose", "Anna", "Mila", "Julia", "Ambre", "Agathe", "Juliette",
  "Margaux", "Clara", "Zoé", "Charlotte", "Lucie", "Pauline", "Mathilde", "Élise", "Victoire", "Salomé", "Nora",
  "Yasmine", "Lou", "Romane", "Maëlys", "Anaïs", "Laura", "Céline", "Sophie", "Nathalie", "Isabelle", "Sandrine",
  "Valérie", "Aurélie", "Émilie", "Mélanie", "Marion", "Justine", "Océane", "Sabrina", "Leïla", "Amira", "Kenza",
  "Hana", "Chloé", "Eva", "Capucine", "Héloïse", "Thomas", "Nicolas", "Julien", "Karim", "Maxime", "Hugo",
];
const FIRST_NAMES_PT = ["Beatriz", "Mariana", "Leonor", "Matilde", "Carolina", "Rita", "Joana", "Sofia"];
const FIRST_NAMES_EN = ["Emily", "Olivia", "Grace", "Hannah"];
const LAST_NAMES = [
  "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Durand", "Leroy", "Simon", "Lefebvre", "Michel", "Garcia",
  "David", "Bertrand", "Roux", "Vincent", "Fournier", "Morel", "Girard", "André", "Mercier", "Dupont", "Lambert",
  "Bonnet", "François", "Martinez", "Legrand", "Garnier", "Faure", "Blanc", "Guérin", "Muller", "Henry", "Roussel",
  "Perrin", "Morin", "Mathieu", "Clément", "Gauthier", "Dumont", "Lopez", "Fontaine", "Chevalier", "Robin",
  "Masson", "Sanchez", "Nguyen", "Boyer", "Denis", "Lemaire", "Duval", "Joly", "Roche", "Noël", "Meyer", "Lucas",
  "Meunier", "Perez", "Marchand", "Dufour", "Blanchard", "Barbier", "Brun", "Dumas", "Brunet", "Schmitt",
  "Leroux", "Colin", "Fernandez", "Haddad", "Mansouri", "Diallo", "Traoré",
];
const LAST_NAMES_PT = ["Silva", "Santos", "Ferreira", "Pereira", "Costa", "Oliveira", "Rodrigues"];
const LAST_NAMES_EN = ["Smith", "Taylor", "Brown", "Wilson"];

const asciiSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

class PeopleFactory {
  private phoneIndex = 0;
  private readonly emails = new Set<string>();
  private igIndex = 0;

  constructor(private readonly rng: Random) {}

  person(language: Language) {
    const firstName =
      language === "pt" ? this.rng.pick(FIRST_NAMES_PT) : language === "en" ? this.rng.pick(FIRST_NAMES_EN) : this.rng.pick(FIRST_NAMES_FR);
    const lastName =
      language === "pt" ? this.rng.pick(LAST_NAMES_PT) : language === "en" ? this.rng.pick(LAST_NAMES_EN) : this.rng.pick(LAST_NAMES);
    return { firstName, lastName };
  }

  /** E.164 numbers from 06 39 98 00 00 – 06 39 98 99 99, reserved by ARCEP for fiction. */
  phone() {
    const suffix = String(this.phoneIndex++).padStart(4, "0");
    return `+3363998${suffix}`;
  }

  email(firstName: string, lastName: string) {
    const base = `${asciiSlug(firstName)}.${asciiSlug(lastName)}`;
    let candidate = `${base}@example.com`;
    for (let n = 2; this.emails.has(candidate); n++) candidate = `${base}${n}@example.com`;
    this.emails.add(candidate);
    return candidate;
  }

  instagram(firstName: string, lastName: string) {
    this.igIndex++;
    return {
      handle: `${asciiSlug(firstName)}.${asciiSlug(lastName).slice(0, 6)}${this.igIndex % 10 === 0 ? "" : this.igIndex}`,
      userId: `178414000${String(1_000_000 + this.igIndex)}`,
    };
  }
}

// ─── Services and wording ───────────────────────────────────────────────────

const SERVICE_WEIGHTS: Record<string, number> = {
  "hydrafacial-signature": 18,
  "soin-visage-eclat": 14,
  "peeling-doux": 8,
  microneedling: 7,
  "led-therapie": 6,
  "epilation-laser-aisselles": 9,
  "epilation-laser-jambes-completes": 10,
  "massage-drainant": 8,
  "consultation-medecine-esthetique": 6,
  "injections-d-acide-hyaluronique": 7,
  "toxine-botulique": 7,
};

const SERVICE_PHRASES: Record<string, Record<Language, string>> = {
  "hydrafacial-signature": { fr: "l'Hydrafacial", pt: "o Hydrafacial", en: "the Hydrafacial" },
  "soin-visage-eclat": { fr: "le soin visage Éclat", pt: "o tratamento de rosto Éclat", en: "the Éclat facial" },
  "peeling-doux": { fr: "le peeling doux", pt: "o peeling suave", en: "the gentle peel" },
  microneedling: { fr: "le microneedling", pt: "o microneedling", en: "microneedling" },
  "led-therapie": { fr: "la LED thérapie", pt: "a terapia LED", en: "LED therapy" },
  "epilation-laser-aisselles": {
    fr: "l'épilation laser des aisselles",
    pt: "a depilação a laser das axilas",
    en: "underarm laser hair removal",
  },
  "epilation-laser-jambes-completes": {
    fr: "l'épilation laser des jambes",
    pt: "a depilação a laser das pernas",
    en: "full-leg laser hair removal",
  },
  "massage-drainant": { fr: "le massage drainant", pt: "a massagem drenante", en: "the lymphatic drainage massage" },
  "consultation-medecine-esthetique": {
    fr: "une consultation de médecine esthétique",
    pt: "uma consulta de medicina estética",
    en: "an aesthetic medicine consultation",
  },
  "injections-d-acide-hyaluronique": {
    fr: "les injections d'acide hyaluronique",
    pt: "as injeções de ácido hialurónico",
    en: "hyaluronic acid injections",
  },
  "toxine-botulique": { fr: "la toxine botulique", pt: "a toxina botulínica", en: "botulinum toxin" },
};

const euroText = (cents: number, language: Language) =>
  language === "en" ? `€${cents / 100}` : `${(cents / 100).toLocaleString("fr-FR")} €`;

function durationText(minutes: number, language: Language) {
  if (language !== "fr") return `${minutes} min`;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest}` : `${hours} h`;
}

// ─── Clock: business days and slots in the establishment's time zone ───────

const SLOT_TIMES = ["10:00", "11:00", "12:30", "14:00", "15:30", "17:00", "18:30"];
const OPEN_WEEKDAYS = new Set([2, 3, 4, 5, 6]); // Tuesday → Saturday

class Clock {
  constructor(
    readonly now: Date,
    readonly timeZone: string,
  ) {}

  /** A local wall-clock time `dayOffset` days from today. */
  at(dayOffset: number, hour: number, minute = 0) {
    const today = zonedParts(this.now, this.timeZone);
    return zonedTimeToUtc({ year: today.year, month: today.month, day: today.day + dayOffset, hour, minute }, this.timeZone);
  }

  /** Nearest opening day from `dayOffset`, searching forward or backward, at a bookable time. */
  slot(rng: Random, dayOffset: number, direction: 1 | -1): Date {
    let offset = dayOffset;
    for (let guard = 0; guard < 7; guard++, offset += direction) {
      const weekday = zonedParts(this.at(offset, 12), this.timeZone).weekday;
      if (!OPEN_WEEKDAYS.has(weekday)) continue;
      const times = weekday === 6 ? SLOT_TIMES.filter((time) => time <= "16:30") : SLOT_TIMES;
      const [hour, minute] = rng.pick(times).split(":").map(Number) as [number, number];
      return this.at(offset, hour, minute);
    }
    return this.at(dayOffset, 14);
  }

  /** A plausible moment for a customer message, `daysAgo` days back (never in the future). */
  contactMoment(rng: Random, daysAgo: number) {
    const candidate = this.at(-daysAgo, rng.int(8, 21), rng.pick([0, 5, 12, 18, 24, 33, 41, 47, 52]));
    if (candidate.getTime() < this.now.getTime() - 20 * MINUTE) return candidate;
    return new Date(this.now.getTime() - rng.int(25, 240) * MINUTE);
  }

  slotLabel(date: Date, language: Language) {
    const locale = language === "pt" ? "pt-PT" : language === "en" ? "en-GB" : "fr-FR";
    const day = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: this.timeZone }).format(date);
    const { hour, minute } = zonedParts(date, this.timeZone);
    if (language === "en") {
      return `${day} at ${new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: this.timeZone }).format(date)}`;
    }
    if (language === "pt") return `${day} às ${hour}h${minute ? String(minute).padStart(2, "0") : "00"}`;
    return `${day} à ${hour} h${minute ? ` ${String(minute).padStart(2, "0")}` : ""}`;
  }
}

// ─── Conversation copy ──────────────────────────────────────────────────────

interface ServiceCopy {
  serviceId: string;
  phrase: string;
  name: string;
  priceCents: number | null;
  durationMinutes: number;
  bookable: DemoService;
}

interface BookingCopy {
  opener: (s: ServiceCopy) => string[];
  answer: (first: string, s: ServiceCopy) => string;
  wantsSlot: string[];
  propose: (a: string, b: string) => string;
  pick: (slot: string) => string[];
  confirm: (s: ServiceCopy, slot: string) => string;
}

const COPY = {
  fr: {
    opener: (s: ServiceCopy) => [
      `Bonjour, quel est le tarif pour ${s.phrase} ?`,
      `Bonjour ! Je voudrais des informations sur ${s.phrase} svp`,
      `Bonsoir, vous avez des disponibilités pour ${s.phrase} ?`,
      `Hello, c'est combien ${s.phrase} chez vous ?`,
      `Bonjour, je m'intéresse à ${s.phrase}, comment ça se passe ?`,
    ],
    answer: (first: string, s: ServiceCopy) =>
      s.priceCents === null
        ? `Bonjour ${first} ! Pour ${s.phrase}, le protocole et le tarif sont définis lors d'une consultation avec la Dre Rousseau (50 €, déduite du premier acte). Souhaitez-vous que je vous propose un créneau de consultation ?`
        : `Bonjour ${first} ! ${capitalize(s.phrase)} est à ${euroText(s.priceCents, "fr")} pour une séance de ${durationText(s.durationMinutes, "fr")}. Souhaitez-vous que je vous propose un créneau ?`,
    wantsSlot: [
      "Oui avec plaisir, plutôt en fin de journée si possible",
      "Oui ! Samedi ce serait idéal",
      "Oui, en semaine après 17h ?",
      "Pourquoi pas, vous avez quoi la semaine prochaine ?",
      "Oui je veux bien",
    ],
    propose: (a: string, b: string) => `Je peux vous proposer ${a} ou ${b}. Lequel vous conviendrait le mieux ?`,
    pick: (slot: string) => [`${capitalize(slot)}, parfait !`, "Le premier c'est parfait", "Le deuxième me va très bien", `Va pour ${slot}`],
    confirm: (s: ServiceCopy, slot: string) =>
      `C'est réservé : ${s.name}, ${slot}. Vous recevrez un rappel la veille. À très bientôt chez Maison Éclat !`,
    thinking: ["Je regarde mon agenda et je reviens vers vous", "Je dois vérifier avec mon travail, je vous redis vite", "Super, je vous confirme demain"],
    pendingDetail: (slot: string) =>
      `Parfait, je bloque ${slot}. Pour finaliser, pouvez-vous me confirmer votre nom et prénom ?`,
    reminder: (s: ServiceCopy, slot: string) =>
      `Petit rappel : votre rendez-vous ${s.name} est prévu ${slot}. Répondez OUI pour le confirmer, ou dites-moi si vous souhaitez le déplacer.`,
    reminderYes: ["OUI", "Oui merci !", "Oui c'est bon pour moi", "Oui à demain"],
    reminderThanks: "Merci, c'est confirmé. À demain !",
    afterVisit: "Merci pour votre visite aujourd'hui ! Si vous avez la moindre question après votre soin, je reste disponible ici.",
    followUp: (first: string, s: ServiceCopy) =>
      `Bonjour ${first}, je reviens vers vous au sujet de ${s.phrase} : il me reste quelques créneaux cette semaine. Souhaitez-vous que je vous en réserve un ?`,
    lastFollowUp: (first: string) =>
      `Bonjour ${first}, je ne veux pas vous déranger : je reste disponible si vous souhaitez réserver plus tard. Belle journée !`,
    recoveredReply: ["Ah oui pardon j'avais complètement oublié ! Vous avez quelque chose vendredi ?", "Merci de la relance ! Oui je suis toujours intéressée", "Oui désolée, semaine chargée. Toujours partante !"],
    tooExpensive: ["Merci, c'est un peu au-dessus de mon budget pour le moment", "D'accord merci, je vais réfléchir"],
    tooExpensiveAnswer:
      "Je comprends tout à fait. Si vous le souhaitez, je peux vous prévenir lors de nos prochaines offres. Belle journée !",
    noShow: (first: string) =>
      `Bonjour ${first}, nous ne vous avons pas vue à votre rendez-vous aujourd'hui. J'espère que tout va bien ! Souhaitez-vous que je vous propose un nouveau créneau ?`,
    noShowSorry: ["Oh je suis vraiment désolée, j'ai eu un empêchement de dernière minute. On peut reporter ?", "Désolée !! Imprévu avec mon fils. Je peux revenir la semaine prochaine ?"],
    cancel: ["Bonjour, je dois malheureusement annuler mon rendez-vous, un imprévu", "Bonjour, je ne vais pas pouvoir venir, je suis malade"],
    cancelAnswer: "C'est noté, votre rendez-vous est annulé. Souhaitez-vous que je vous propose une autre date ?",
    cancelLater: "Je vous redis plus tard, merci",
  },
  pt: {
    opener: (s: ServiceCopy) => [`Olá! Quanto custa ${s.phrase}?`, `Bom dia, gostaria de informações sobre ${s.phrase}`],
    answer: (first: string, s: ServiceCopy) =>
      s.priceCents === null
        ? `Olá ${first}! Para ${s.phrase}, o protocolo e o preço são definidos numa consulta com a Dra. Rousseau (50 €). Quer que lhe proponha um horário?`
        : `Olá ${first}! ${capitalize(s.phrase)} custa ${euroText(s.priceCents, "pt")} por sessão (${durationText(s.durationMinutes, "pt")}). Quer que lhe proponha um horário?`,
    wantsSlot: ["Sim, por favor! De preferência ao fim da tarde", "Sim, sábado de manhã seria ótimo"],
    propose: (a: string, b: string) => `Posso propor-lhe ${a} ou ${b}. Qual prefere?`,
    pick: (_slot: string) => ["O primeiro, obrigada!", "O segundo é perfeito"],
    confirm: (s: ServiceCopy, slot: string) => `Está marcado: ${s.name}, ${slot}. Receberá um lembrete na véspera. Até breve!`,
  },
  en: {
    opener: (s: ServiceCopy) => [`Hi! How much is ${s.phrase}?`, `Hello, do you have any availability for ${s.phrase} this week?`],
    answer: (first: string, s: ServiceCopy) =>
      s.priceCents === null
        ? `Hi ${first}! For ${s.phrase}, the treatment plan and price are set during a consultation with Dr Rousseau (€50). Shall I suggest a time?`
        : `Hi ${first}! ${capitalize(s.phrase)} is ${euroText(s.priceCents, "en")} for a ${durationText(s.durationMinutes, "en")} session. Shall I suggest a time?`,
    wantsSlot: ["Yes please, ideally in the evening", "Yes, Saturday would be great"],
    propose: (a: string, b: string) => `I can offer ${a} or ${b}. Which suits you best?`,
    pick: (_slot: string) => ["The first one, thanks!", "The second one works for me"],
    confirm: (s: ServiceCopy, slot: string) => `You're booked: ${s.name}, ${slot}. You'll get a reminder the day before. See you soon!`,
  },
};

const BOOKING_COPY: Record<Language, BookingCopy> = COPY;

const MULTILINGUAL_STATUSES = new Set<LeadStatus>(["CONTACTED", "QUALIFIED", "BOOKED", "COMPLETED"]);

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// ─── Lead journey builder ───────────────────────────────────────────────────

const STATUS_PATHS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["NEW"],
  CONTACTED: ["NEW", "CONTACTED"],
  QUALIFIED: ["NEW", "CONTACTED", "QUALIFIED"],
  HOT: ["NEW", "CONTACTED", "QUALIFIED", "HOT"],
  BOOKING_PENDING: ["NEW", "CONTACTED", "HOT", "BOOKING_PENDING"],
  BOOKED: ["NEW", "CONTACTED", "HOT", "BOOKED"],
  SHOWED: ["NEW", "CONTACTED", "HOT", "BOOKED", "SHOWED"],
  NO_SHOW: ["NEW", "CONTACTED", "HOT", "BOOKED", "NO_SHOW"],
  CANCELLED: ["NEW", "CONTACTED", "HOT", "BOOKED", "CANCELLED"],
  COMPLETED: ["NEW", "CONTACTED", "HOT", "BOOKED", "SHOWED", "COMPLETED"],
  LOST: ["NEW", "CONTACTED", "QUALIFIED", "LOST"],
  REACTIVATION: ["COMPLETED", "REACTIVATION"],
};

const SCORES: Record<LeadStatus, [number, number]> = {
  NEW: [15, 30],
  CONTACTED: [30, 45],
  QUALIFIED: [50, 65],
  HOT: [75, 88],
  BOOKING_PENDING: [82, 92],
  BOOKED: [88, 96],
  SHOWED: [92, 98],
  NO_SHOW: [35, 50],
  CANCELLED: [25, 40],
  COMPLETED: [92, 99],
  LOST: [5, 15],
  REACTIVATION: [45, 60],
};

const INTENT_LEVELS: Record<LeadStatus, LeadInsert["intentLevel"]> = {
  NEW: "LOW",
  CONTACTED: "MEDIUM",
  QUALIFIED: "MEDIUM",
  HOT: "HIGH",
  BOOKING_PENDING: "READY_TO_BOOK",
  BOOKED: "READY_TO_BOOK",
  SHOWED: "READY_TO_BOOK",
  NO_SHOW: "MEDIUM",
  CANCELLED: "LOW",
  COMPLETED: "READY_TO_BOOK",
  LOST: "LOW",
  REACTIVATION: "MEDIUM",
};

interface Bundle {
  leads: LeadInsert[];
  conversations: ConversationInsert[];
  messages: MessageInsert[];
  appointments: AppointmentInsert[];
  attributions: AttributionInsert[];
  followups: FollowupInsert[];
  statusChanges: StatusChangeInsert[];
  notes: Array<typeof leadNotes.$inferInsert>;
  consents: Array<typeof consentRecords.$inferInsert>;
}

interface Thread {
  lead: LeadInsert & { id: string };
  conversation: ConversationInsert & { id: string };
  language: Language;
  service: ServiceCopy;
  messages: MessageInsert[];
}

class DemoBuilder {
  readonly bundle: Bundle = {
    leads: [],
    conversations: [],
    messages: [],
    appointments: [],
    attributions: [],
    followups: [],
    statusChanges: [],
    notes: [],
    consents: [],
  };
  readonly people: PeopleFactory;
  readonly clock: Clock;
  private readonly weightedServices: Array<readonly [DemoService, number]>;
  private readonly consultation: DemoService;

  constructor(
    readonly ctx: DemoSeedContext,
    readonly rng: Random,
  ) {
    this.people = new PeopleFactory(rng);
    this.clock = new Clock(ctx.now, ctx.timeZone);
    this.weightedServices = ctx.services.map((service) => [service, SERVICE_WEIGHTS[service.slug] ?? 5] as const);
    this.consultation =
      ctx.services.find((service) => service.slug === "consultation-medecine-esthetique") ?? ctx.services[0]!;
  }

  get now() {
    return this.ctx.now;
  }

  pickService(): ServiceCopy {
    const service = this.rng.weighted(this.weightedServices);
    // Services priced during a consultation are booked as the consultation itself.
    const bookable = service.priceCents === null ? this.consultation : service;
    return {
      serviceId: service.id,
      phrase: SERVICE_PHRASES[service.slug]?.fr ?? service.name,
      name: service.name,
      priceCents: service.priceCents,
      durationMinutes: service.durationMinutes ?? 60,
      bookable,
    };
  }

  servicePhrase(service: ServiceCopy, language: Language) {
    const slug = this.ctx.services.find((candidate) => candidate.name === service.name)?.slug ?? "";
    return SERVICE_PHRASES[slug]?.[language] ?? service.name;
  }

  practitionerFor(service: DemoService) {
    return this.ctx.practitioners.find((practitioner) => practitioner.categories.includes(service.category ?? ""))?.id ?? null;
  }

  /** Creates a lead with an optional conversation; messages are added by the scenario. */
  startThread(options: {
    status: LeadStatus;
    createdAt: Date;
    channel: Channel | null;
    language: Language;
    service: ServiceCopy;
    intent?: ConversationInsert["intent"];
    existing?: Partial<LeadInsert> & { id?: string };
  }): Thread {
    const { status, createdAt, channel, language, service } = options;
    const person = options.existing?.firstName
      ? { firstName: options.existing.firstName, lastName: options.existing.lastName ?? "" }
      : this.people.person(language);
    const leadId = options.existing?.id ?? randomUUID();
    const instagram = channel === "INSTAGRAM" ? this.people.instagram(person.firstName, person.lastName) : null;
    const phone = options.existing?.phone ?? (channel === "INSTAGRAM" && this.rng.chance(0.6) ? null : this.people.phone());
    const [scoreMin, scoreMax] = SCORES[status];
    const lead: LeadInsert & { id: string } = {
      id: leadId,
      organizationId: this.ctx.organizationId,
      firstName: person.firstName,
      lastName: person.lastName,
      phone,
      email: options.existing?.email ?? (this.rng.chance(channel === "WEBSITE" ? 0.85 : 0.35) ? this.people.email(person.firstName, person.lastName) : null),
      instagramHandle: instagram?.handle ?? null,
      instagramUserId: instagram?.userId ?? null,
      whatsappId: channel === "WHATSAPP" && phone ? phone.slice(1) : null,
      source: options.existing?.source ?? (channel ?? "MANUAL"),
      channel,
      interestedServiceId: service.serviceId,
      status,
      score: this.rng.int(scoreMin, scoreMax),
      intentLevel: INTENT_LEVELS[status],
      potentialValueCents: service.priceCents ?? service.bookable.priceCents,
      language,
      isExistingClient: options.existing?.isExistingClient ?? false,
      marketingConsent: options.existing?.marketingConsent ?? (this.rng.chance(0.3) ? "GRANTED" : "UNKNOWN"),
      createdAt: options.existing?.createdAt ?? createdAt,
      updatedAt: createdAt,
      ...options.existing,
    };
    lead.status = status;
    const conversation: ConversationInsert & { id: string } = {
      id: randomUUID(),
      organizationId: this.ctx.organizationId,
      leadId,
      channel: channel ?? "WEBSITE",
      status: "OPEN",
      handlingMode: "AI_ACTIVE",
      intent: options.intent ?? (service.priceCents === null ? "SERVICE_INFORMATION" : "PRICE_REQUEST"),
      intentLevel: INTENT_LEVELS[status],
      language,
      createdAt,
    };
    return { lead, conversation, language, service, messages: [] };
  }

  say(thread: Thread, at: Date, author: "CONTACT" | "AI" | "USER", body: string, options: { template?: boolean; userId?: string } = {}) {
    const inbound = author === "CONTACT";
    const age = this.now.getTime() - at.getTime();
    const outboundStatus = age > 6 * HOUR ? "READ" : age > 20 * MINUTE ? "DELIVERED" : "SENT";
    const id = randomUUID();
    thread.messages.push({
      id,
      organizationId: this.ctx.organizationId,
      conversationId: thread.conversation.id,
      direction: inbound ? "INBOUND" : "OUTBOUND",
      authorType: author,
      authorUserId: author === "USER" ? (options.userId ?? this.ctx.team.staffId) : null,
      contentType: options.template ? "TEMPLATE" : "TEXT",
      body,
      status: inbound ? "RECEIVED" : outboundStatus,
      aiMetadata: author === "AI" ? { demo: true } : null,
      createdAt: at,
      sentAt: inbound ? null : at,
      deliveredAt: inbound || outboundStatus === "SENT" ? null : new Date(at.getTime() + 2_000),
      readAt: inbound || outboundStatus !== "READ" ? null : new Date(at.getTime() + this.rng.int(1, 90) * MINUTE),
    });
    return id;
  }

  /**
   * Records an automated message as a sent follow-up (lead recovery, reminder,
   * no-show recovery), as the automation engine will. Future messages are
   * dropped by `finish`, so only past ones are recorded.
   */
  followup(
    thread: Thread,
    options: { type: FollowupInsert["automationType"]; step: number; at: Date; messageId: string; plannedAt: Date; appointmentId?: string },
  ) {
    if (options.at > this.now) return;
    this.bundle.followups.push({
      organizationId: this.ctx.organizationId,
      automationType: options.type,
      leadId: thread.lead.id,
      conversationId: thread.conversation.id,
      appointmentId: options.appointmentId ?? null,
      step: options.step,
      channel: thread.conversation.channel,
      scheduledAt: options.at,
      status: "SENT",
      attempts: 1,
      messageId: options.messageId,
      processedAt: options.at,
      createdAt: options.plannedAt,
      updatedAt: options.at,
    });
  }

  /** SOFIA answers within seconds. */
  aiDelay(at: Date) {
    return new Date(at.getTime() + this.rng.int(8, 40) * 1000);
  }

  customerDelay(at: Date, minMinutes = 2, maxMinutes = 90) {
    return new Date(at.getTime() + this.rng.int(minMinutes, maxMinutes) * MINUTE);
  }

  history(lead: LeadInsert & { id: string }, path: LeadStatus[], start: Date, end: Date, reasons: Partial<Record<LeadStatus, string>> = {}) {
    const span = Math.max(end.getTime() - start.getTime(), MINUTE);
    path.forEach((status, index) => {
      const at = new Date(start.getTime() + (span * index) / Math.max(path.length - 1, 1));
      this.bundle.statusChanges.push({
        organizationId: this.ctx.organizationId,
        leadId: lead.id,
        fromStatus: index === 0 ? null : path[index - 1]!,
        toStatus: status,
        actorType: status === "NEW" ? "SYSTEM" : "AI",
        reason: reasons[status] ?? null,
        createdAt: at,
      });
    });
  }

  appointment(
    thread: Thread,
    options: {
      startsAt: Date;
      createdAt: Date;
      status: AppointmentInsert["status"];
      source?: AppointmentInsert["source"];
      rescheduledFromId?: string;
    },
  ) {
    const service = thread.service.bookable;
    const duration = service.durationMinutes ?? 60;
    const endsAt = new Date(options.startsAt.getTime() + duration * MINUTE);
    const appointment: AppointmentInsert & { id: string } = {
      id: randomUUID(),
      organizationId: this.ctx.organizationId,
      leadId: thread.lead.id,
      serviceId: service.id,
      practitionerId: this.practitionerFor(service),
      conversationId: thread.conversation.id,
      status: options.status,
      source: options.source ?? "AI",
      startsAt: options.startsAt,
      endsAt,
      priceCents: service.priceCents,
      confirmedAt: null,
      completedAt: options.status === "COMPLETED" ? endsAt : null,
      noShowAt: options.status === "NO_SHOW" ? new Date(options.startsAt.getTime() + 30 * MINUTE) : null,
      rescheduledFromId: options.rescheduledFromId ?? null,
      createdByType: options.source === "STAFF" ? "USER" : "AI",
      createdByUserId: options.source === "STAFF" ? this.ctx.team.staffId : null,
      createdAt: options.createdAt,
    };
    this.bundle.appointments.push(appointment);
    return appointment;
  }

  attribute(thread: Thread, appointment: AppointmentInsert & { id: string }, type: AttributionType) {
    if (appointment.priceCents === null || appointment.priceCents === undefined || appointment.source !== "AI") return;
    const status =
      appointment.status === "COMPLETED"
        ? "CONFIRMED"
        : appointment.status === "CANCELLED" || appointment.status === "NO_SHOW"
          ? "CANCELLED"
          : "ESTIMATED";
    const source: Record<AttributionType, AttributionInsert["revenueSource"]> = {
      APPOINTMENT_GENERATED: "AI_CONVERSATION",
      LEAD_RECOVERED: "LEAD_FOLLOWUP",
      NO_SHOW_RECOVERED: "NO_SHOW_FLOW",
      CLIENT_REACTIVATED: "REACTIVATION_CAMPAIGN",
    };
    this.bundle.attributions.push({
      organizationId: this.ctx.organizationId,
      leadId: thread.lead.id,
      appointmentId: appointment.id,
      attributionType: type,
      revenueSource: source[type],
      amountCents: appointment.priceCents,
      status,
      attributedAt: appointment.createdAt ?? this.now,
      confirmedAt: status === "CONFIRMED" ? (appointment.completedAt ?? null) : null,
      cancelledAt: status === "CANCELLED" ? (appointment.noShowAt ?? appointment.startsAt) : null,
    });
  }

  /** Opening exchange: question → SOFIA's answer. Returns the time of the answer. */
  opening(thread: Thread, start: Date) {
    const copy = BOOKING_COPY[thread.language];
    const service = { ...thread.service, phrase: this.servicePhrase(thread.service, thread.language) };
    this.say(thread, start, "CONTACT", this.rng.pick(copy.opener(service)));
    const answeredAt = this.aiDelay(start);
    this.say(thread, answeredAt, "AI", copy.answer(thread.lead.firstName ?? "", service));
    return answeredAt;
  }

  /** Slot proposal → choice → confirmation. Returns the confirmation time. */
  booking(thread: Thread, after: Date, chosenSlot: Date, options: { stopAt?: "proposal" | "choice" } = {}) {
    const copy = BOOKING_COPY[thread.language];
    const asked = this.customerDelay(after, 2, 120);
    this.say(thread, asked, "CONTACT", this.rng.pick(copy.wantsSlot));
    const proposedAt = this.aiDelay(asked);
    const alternative = new Date(chosenSlot.getTime() + this.rng.pick([1, 2, 3]) * DAY + this.rng.pick([-2, 1, 3]) * HOUR);
    const [first, second] = this.rng.chance(0.5) ? [chosenSlot, alternative] : [alternative, chosenSlot];
    this.say(thread, proposedAt, "AI", copy.propose(this.clock.slotLabel(first, thread.language), this.clock.slotLabel(second, thread.language)));
    if (options.stopAt === "proposal") return proposedAt;
    const chose = this.customerDelay(proposedAt, 1, 45);
    this.say(thread, chose, "CONTACT", this.rng.pick(copy.pick(this.clock.slotLabel(chosenSlot, thread.language))));
    if (options.stopAt === "choice") return chose;
    const confirmedAt = this.aiDelay(chose);
    this.say(thread, confirmedAt, "AI", copy.confirm(thread.service, this.clock.slotLabel(chosenSlot, thread.language)));
    return confirmedAt;
  }

  /** Reminder the day before, usually confirmed by the customer. Returns the confirmation time, if any. */
  reminder(thread: Thread, appointment: AppointmentInsert & { id: string }) {
    const startsAt = appointment.startsAt;
    const reminderAt = new Date(startsAt.getTime() - DAY);
    if (reminderAt > this.now || thread.language !== "fr") return null;
    const messageId = this.say(thread, reminderAt, "AI", COPY.fr.reminder(thread.service, this.clock.slotLabel(startsAt, "fr")));
    this.followup(thread, {
      type: "APPOINTMENT_REMINDER",
      step: 1,
      at: reminderAt,
      messageId,
      plannedAt: (appointment.createdAt as Date | undefined) ?? reminderAt,
      appointmentId: appointment.id,
    });
    if (!this.rng.chance(0.75)) return null;
    const replyAt = this.customerDelay(reminderAt, 5, 180);
    if (replyAt > this.now) return null;
    this.say(thread, replyAt, "CONTACT", this.rng.pick(COPY.fr.reminderYes));
    this.say(thread, this.aiDelay(replyAt), "AI", COPY.fr.reminderThanks);
    return replyAt;
  }

  finish(thread: Thread, options: { nextFollowUpAt?: Date | null; unreadIfRecent?: boolean; humanRequestedAt?: Date | null; humanActiveBy?: string | null } = {}) {
    const visible = thread.messages.filter((message) => (message.createdAt as Date) <= this.now);
    visible.sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime());
    const last = visible[visible.length - 1];
    const lastInbound = [...visible].reverse().find((message) => message.direction === "INBOUND");
    const lastOutbound = [...visible].reverse().find((message) => message.direction === "OUTBOUND");
    let unread = 0;
    for (let index = visible.length - 1; index >= 0 && visible[index]!.direction === "INBOUND"; index--) unread++;
    const recent = last && this.now.getTime() - (last.createdAt as Date).getTime() < 2 * DAY;

    if (visible.length > 0) {
      Object.assign(thread.conversation, {
        lastMessageAt: last!.createdAt,
        lastMessagePreview: (last!.body ?? "").slice(0, 140),
        lastInboundAt: lastInbound?.createdAt ?? null,
        lastOutboundAt: lastOutbound?.createdAt ?? null,
        unreadCount: recent && (options.unreadIfRecent ?? true) ? unread : 0,
        humanRequestedAt: options.humanRequestedAt ?? null,
        handlingMode: options.humanActiveBy ? "HUMAN_ACTIVE" : "AI_ACTIVE",
        takenOverByUserId: options.humanActiveBy ?? null,
        takenOverAt: options.humanActiveBy ? (lastOutbound?.createdAt ?? null) : null,
        updatedAt: last!.createdAt,
      });
      this.bundle.conversations.push(thread.conversation);
      this.bundle.messages.push(...visible);
    }
    Object.assign(thread.lead, {
      lastInteractionAt: last?.createdAt ?? thread.lead.createdAt,
      nextFollowUpAt: options.nextFollowUpAt ?? null,
      updatedAt: last?.createdAt ?? thread.lead.createdAt,
    });
    this.bundle.leads.push(thread.lead);
  }
}

// ─── Scenarios ──────────────────────────────────────────────────────────────

/** Final pipeline status of the inbound leads of the last three months. */
const INBOUND_PLAN: Array<[LeadStatus, number]> = [
  ["CONTACTED", 4],
  ["QUALIFIED", 6],
  ["HOT", 3],
  ["BOOKING_PENDING", 2],
  ["BOOKED", 12],
  ["SHOWED", 3],
  ["NO_SHOW", 7],
  ["CANCELLED", 5],
  ["COMPLETED", 88],
  ["LOST", 40],
];

const CHANNEL_WEIGHTS: Array<readonly [Channel, number]> = [
  ["WHATSAPP", 38],
  ["INSTAGRAM", 37],
  ["WEBSITE", 25],
];

/** Slightly skewed towards recent days, so the activity grows month after month. */
function recentDaysAgo(rng: Random, maxDays: number, minDays = 0) {
  return Math.round(minDays + Math.pow(rng.next(), 1.15) * (maxDays - minDays));
}

function runInboundLead(builder: DemoBuilder, status: LeadStatus, variant: { recovery?: "LEAD" | "NO_SHOW"; staffBooked?: boolean }) {
  const { rng, clock } = builder;
  const channel = rng.weighted(CHANNEL_WEIGHTS);
  const language: Language =
    MULTILINGUAL_STATUSES.has(status) && !variant.recovery ? rng.weighted([["fr", 88], ["pt", 8], ["en", 4]] as const) : "fr";
  const service = builder.pickService();
  const fr = COPY.fr;

  // Appointment-driven statuses are anchored on the appointment date.
  if (status === "COMPLETED" || status === "SHOWED" || status === "NO_SHOW" || status === "CANCELLED" || status === "BOOKED") {
    const startsAt =
      status === "BOOKED"
        ? clock.slot(rng, variant.recovery === "NO_SHOW" ? rng.int(1, 5) : rng.int(1, 18), 1)
        : status === "SHOWED"
          ? clock.slot(rng, -rng.int(1, 2), -1)
          : status === "CANCELLED" && rng.chance(0.5)
            ? clock.slot(rng, rng.int(2, 10), 1)
            : clock.slot(rng, -recentDaysAgo(rng, 85, 2), -1);
    // Days between the first message and the appointment; recoveries need room
    // for the silence and the follow-up (or the missed first appointment).
    const leadDays =
      variant.recovery === "NO_SHOW"
        ? rng.int(10, 16)
        : variant.recovery === "LEAD"
          ? rng.int(3, 8)
          : status === "CANCELLED"
            ? rng.int(4, 12)
            : rng.int(1, status === "BOOKED" ? 14 : 12);
    const minimumAge = variant.recovery ? 2 * DAY : status === "CANCELLED" ? 3 * DAY : 6 * HOUR;
    let createdAt = new Date(startsAt.getTime() - leadDays * DAY - rng.int(1, 9) * HOUR);
    if (createdAt.getTime() > builder.now.getTime() - minimumAge) {
      // Spread over the last days rather than piling everything up yesterday.
      createdAt = new Date(builder.now.getTime() - minimumAge - rng.int(0, 9) * DAY - rng.int(0, 23) * HOUR);
    }
    const thread = builder.startThread({ status, createdAt, channel, language, service });

    let bookedAt: Date;
    let previousNoShow: (AppointmentInsert & { id: string }) | null = null;
    const answeredAt = builder.opening(thread, createdAt);
    if (variant.recovery === "LEAD" && language === "fr") {
      // Silence after the answer, recovered by the 24 h follow-up.
      const followUpAt = new Date(answeredAt.getTime() + DAY);
      const messageId = builder.say(thread, followUpAt, "AI", fr.followUp(thread.lead.firstName ?? "", { ...service, phrase: service.phrase }));
      builder.followup(thread, { type: "LEAD_RECOVERY", step: 2, at: followUpAt, messageId, plannedAt: answeredAt });
      const reply = builder.customerDelay(followUpAt, 20, 300);
      builder.say(thread, reply, "CONTACT", rng.pick(fr.recoveredReply));
      bookedAt = builder.booking(thread, reply, startsAt);
    } else if (variant.recovery === "NO_SHOW" && language === "fr") {
      // First appointment missed, rebooked after SOFIA's message.
      const firstSlot = clock.slot(rng, Math.round((createdAt.getTime() - builder.now.getTime()) / DAY) + rng.int(2, 3), 1);
      const firstBooking = builder.booking(thread, answeredAt, firstSlot);
      previousNoShow = builder.appointment(thread, { startsAt: firstSlot, createdAt: firstBooking, status: "NO_SHOW" });
      const noShowMessage = new Date(firstSlot.getTime() + 75 * MINUTE);
      const messageId = builder.say(thread, noShowMessage, "AI", fr.noShow(thread.lead.firstName ?? ""));
      builder.followup(thread, { type: "NO_SHOW_RECOVERY", step: 1, at: noShowMessage, messageId, plannedAt: firstSlot, appointmentId: previousNoShow.id });
      const sorry = builder.customerDelay(noShowMessage, 30, 300);
      builder.say(thread, sorry, "CONTACT", rng.pick(fr.noShowSorry));
      bookedAt = builder.booking(thread, sorry, startsAt);
    } else {
      // Many clients think it over for a day or more before booking.
      const thinkDays = rng.chance(0.45) ? rng.int(1, 3) : 0;
      const resumeAt = new Date(answeredAt.getTime() + thinkDays * DAY + rng.int(0, 6) * HOUR);
      const latest = Math.min(startsAt.getTime(), builder.now.getTime()) - 12 * HOUR;
      bookedAt = builder.booking(thread, resumeAt.getTime() < latest ? resumeAt : answeredAt, startsAt);
    }

    const appointmentStatus: AppointmentInsert["status"] =
      status === "BOOKED" ? "PENDING" : status === "NO_SHOW" ? "NO_SHOW" : status === "CANCELLED" ? "CANCELLED" : "COMPLETED";
    const appointment = builder.appointment(thread, {
      startsAt,
      createdAt: bookedAt,
      status: appointmentStatus,
      source: variant.staffBooked ? "STAFF" : "AI",
      rescheduledFromId: previousNoShow?.id,
    });

    if (status === "CANCELLED") {
      const cancelAt = new Date(
        Math.max(bookedAt.getTime() + HOUR, Math.min(startsAt.getTime() - rng.int(4, 40) * HOUR, builder.now.getTime() - 30 * MINUTE)),
      );
      builder.say(thread, cancelAt, "CONTACT", rng.pick(fr.cancel));
      builder.say(thread, builder.aiDelay(cancelAt), "AI", fr.cancelAnswer);
      builder.say(thread, builder.customerDelay(cancelAt, 3, 40), "CONTACT", fr.cancelLater);
      Object.assign(appointment, { cancelledAt: cancelAt, cancellationReason: "Annulé par la cliente" });
    } else {
      const confirmed = builder.reminder(thread, appointment);
      if (confirmed) appointment.confirmedAt = confirmed;
      if (confirmed && appointment.status === "PENDING") appointment.status = "CONFIRMED";
      if (status === "NO_SHOW") {
        const message = new Date(startsAt.getTime() + 75 * MINUTE);
        if (message < builder.now) {
          const messageId = builder.say(thread, message, "AI", fr.noShow(thread.lead.firstName ?? ""));
          builder.followup(thread, { type: "NO_SHOW_RECOVERY", step: 1, at: message, messageId, plannedAt: startsAt, appointmentId: appointment.id });
        }
      }
      if (status === "COMPLETED" && language === "fr" && rng.chance(0.35)) {
        builder.say(thread, new Date(startsAt.getTime() + 4 * HOUR), "AI", fr.afterVisit);
      }
    }

    const attribution: AttributionType =
      variant.recovery === "NO_SHOW" ? "NO_SHOW_RECOVERED" : variant.recovery === "LEAD" ? "LEAD_RECOVERED" : "APPOINTMENT_GENERATED";
    builder.attribute(thread, appointment, attribution);

    const path = [...STATUS_PATHS[status]];
    builder.history(thread.lead, path, createdAt, status === "BOOKED" ? bookedAt : (appointment.completedAt as Date | null) ?? startsAt, {
      BOOKED: variant.recovery === "LEAD" ? "Réservé après la relance de 24 h" : variant.recovery === "NO_SHOW" ? "Nouveau rendez-vous après un no-show" : undefined,
    });
    if (status === "COMPLETED" || status === "SHOWED") {
      Object.assign(thread.lead, {
        isExistingClient: true,
        visitCount: 1,
        firstVisitAt: startsAt,
        lastAppointmentAt: startsAt,
        generatedValueCents: appointment.source === "AI" ? (appointment.priceCents ?? 0) : 0,
      });
    }
    if (status === "NO_SHOW") thread.lead.nextFollowUpAt = new Date(startsAt.getTime() + DAY);
    builder.finish(thread, { nextFollowUpAt: status === "NO_SHOW" ? new Date(startsAt.getTime() + DAY) : null });
    return;
  }

  // Conversation-only statuses.
  const daysAgo =
    status === "LOST"
      ? rng.int(8, 88)
      : status === "BOOKING_PENDING"
        ? rng.int(0, 2)
        : status === "HOT"
          ? rng.int(0, 6)
          : status === "QUALIFIED"
            ? rng.int(1, 20)
            : rng.int(0, 3);
  const createdAt = clock.contactMoment(rng, daysAgo);
  const thread = builder.startThread({ status, createdAt, channel, language, service });
  const answeredAt = builder.opening(thread, createdAt);
  let lastAt = answeredAt;
  let nextFollowUpAt: Date | null = null;
  let path = STATUS_PATHS[status];

  if (status === "CONTACTED") {
    // No reply yet: SOFIA's follow-ups are scheduled (+2 h, +24 h, +72 h).
    const steps = [2 * HOUR, DAY, 3 * DAY];
    const sent = steps.filter((delay) => new Date(answeredAt.getTime() + delay) < builder.now);
    if (sent.length >= 1 && language === "fr") {
      const step = Math.min(sent.length, 2);
      lastAt = new Date(answeredAt.getTime() + steps[step - 1]!);
      const messageId = builder.say(thread, lastAt, "AI", fr.followUp(thread.lead.firstName ?? "", service));
      builder.followup(thread, { type: "LEAD_RECOVERY", step, at: lastAt, messageId, plannedAt: answeredAt });
    }
    const nextStep = steps[sent.length];
    nextFollowUpAt = nextStep ? new Date(answeredAt.getTime() + nextStep) : null;
  } else if (status === "QUALIFIED") {
    lastAt = builder.booking(thread, answeredAt, clock.slot(rng, rng.int(2, 8), 1), { stopAt: "proposal" });
    nextFollowUpAt = new Date(lastAt.getTime() + (rng.chance(0.5) ? 2 * HOUR : DAY));
  } else if (status === "HOT") {
    const proposal = builder.booking(thread, answeredAt, clock.slot(rng, rng.int(2, 8), 1), { stopAt: "proposal" });
    lastAt = builder.customerDelay(proposal, 2, 60);
    builder.say(thread, lastAt, "CONTACT", rng.pick(fr.thinking));
    nextFollowUpAt = new Date(lastAt.getTime() + DAY);
  } else if (status === "BOOKING_PENDING") {
    const slot = clock.slot(rng, rng.int(2, 9), 1);
    const choice = builder.booking(thread, answeredAt, slot, { stopAt: "choice" });
    lastAt = builder.aiDelay(choice);
    builder.say(thread, lastAt, "AI", fr.pendingDetail(clock.slotLabel(slot, "fr")));
    nextFollowUpAt = new Date(lastAt.getTime() + 2 * HOUR);
  } else if (status === "LOST") {
    if (rng.chance(0.5)) {
      lastAt = builder.customerDelay(answeredAt, 5, 240);
      builder.say(thread, lastAt, "CONTACT", rng.pick(fr.tooExpensive));
      lastAt = builder.aiDelay(lastAt);
      builder.say(thread, lastAt, "AI", fr.tooExpensiveAnswer);
    } else {
      // Never answered: SOFIA could not qualify the request.
      path = ["NEW", "CONTACTED", "LOST"];
      [2 * HOUR, DAY, 3 * DAY].forEach((delay, index) => {
        lastAt = new Date(answeredAt.getTime() + delay);
        const messageId = builder.say(thread, lastAt, "AI", delay === 3 * DAY ? fr.lastFollowUp(thread.lead.firstName ?? "") : fr.followUp(thread.lead.firstName ?? "", service));
        builder.followup(thread, { type: "LEAD_RECOVERY", step: index + 1, at: lastAt, messageId, plannedAt: answeredAt });
      });
    }
  }

  builder.history(thread.lead, path, createdAt, lastAt, {
    LOST: status === "LOST" ? (path.includes("QUALIFIED") ? "Budget insuffisant pour le moment" : "Pas de réponse après trois relances") : undefined,
  });
  builder.finish(thread, { nextFollowUpAt });
}

/** Conversations where a person from the team is needed (medical question, special request). */
function runHumanRequests(builder: DemoBuilder) {
  const { rng, clock, ctx } = builder;
  const service = builder.pickService();

  // 1. Former client with a post-treatment question, answered by the team (HUMAN_ACTIVE).
  {
    const createdAt = clock.contactMoment(rng, 1);
    const thread = builder.startThread({ status: "COMPLETED", createdAt, channel: "WHATSAPP", language: "fr", service, existing: { isExistingClient: true, visitCount: 3, source: "WHATSAPP" } });
    const first = thread.lead.firstName ?? "";
    builder.say(thread, createdAt, "CONTACT", "Bonjour, j'ai fait mes injections il y a 10 jours et j'ai encore une petite rougeur, est-ce que c'est normal ?");
    const handoff = builder.aiDelay(createdAt);
    builder.say(thread, handoff, "AI", `Merci pour votre message ${first}. Pour toute question médicale, je préfère que la Dre Rousseau vous réponde elle-même : je transmets votre message à l'équipe, quelqu'un vous recontacte très vite.`);
    const human = new Date(handoff.getTime() + 25 * MINUTE);
    builder.say(thread, human, "USER", `Bonjour ${first}, ici Camille de Maison Éclat. La Dre Rousseau peut vous appeler aujourd'hui à 17 h, cela vous convient-il ?`, { userId: ctx.team.ownerId });
    const reply = builder.customerDelay(human, 3, 30);
    builder.say(thread, reply, "CONTACT", "Oui parfait, merci beaucoup !");
    Object.assign(thread.lead, { visitCount: 3, firstVisitAt: new Date(createdAt.getTime() - 200 * DAY), lastAppointmentAt: new Date(createdAt.getTime() - 10 * DAY) });
    thread.conversation.intent = "MEDICAL_QUESTION";
    builder.history(thread.lead, ["NEW", "CONTACTED", "BOOKED", "SHOWED", "COMPLETED"], new Date(createdAt.getTime() - 220 * DAY), new Date(createdAt.getTime() - 10 * DAY));
    builder.finish(thread, { humanActiveBy: ctx.team.ownerId, unreadIfRecent: true });
  }

  // 2. Same kind of question, still waiting for the team.
  {
    const createdAt = new Date(builder.now.getTime() - rng.int(15, 70) * MINUTE);
    const thread = builder.startThread({ status: "COMPLETED", createdAt, channel: "INSTAGRAM", language: "fr", service, existing: { isExistingClient: true, source: "INSTAGRAM" } });
    const first = thread.lead.firstName ?? "";
    builder.say(thread, createdAt, "CONTACT", "Bonsoir, je suis enceinte de 3 mois, est-ce que je peux quand même faire un peeling ?");
    builder.say(thread, builder.aiDelay(createdAt), "AI", `Félicitations ${first} ! Pour une question liée à la grossesse, je préfère qu'un membre de l'équipe vous réponde directement. Je lui transmets votre message.`);
    Object.assign(thread.lead, { visitCount: 2, firstVisitAt: new Date(createdAt.getTime() - 300 * DAY), lastAppointmentAt: new Date(createdAt.getTime() - 75 * DAY) });
    thread.conversation.intent = "MEDICAL_QUESTION";
    builder.history(thread.lead, ["NEW", "CONTACTED", "BOOKED", "SHOWED", "COMPLETED"], new Date(createdAt.getTime() - 300 * DAY), new Date(createdAt.getTime() - 75 * DAY));
    builder.finish(thread, { humanRequestedAt: createdAt });
  }

  // 3. New prospect with a special request (group booking).
  {
    const createdAt = new Date(builder.now.getTime() - rng.int(2, 5) * HOUR);
    const thread = builder.startThread({ status: "NEW", createdAt, channel: "WEBSITE", language: "fr", service });
    builder.say(thread, createdAt, "CONTACT", "Bonjour, je voudrais organiser un moment soin pour 5 personnes avant un mariage en juin. Je peux parler à quelqu'un ?");
    builder.say(thread, builder.aiDelay(createdAt), "AI", "Avec plaisir ! Pour un groupe, je transmets votre demande à l'équipe qui vous recontacte pour construire une proposition sur mesure. Pouvez-vous m'indiquer la date envisagée ?");
    const reply = builder.customerDelay(createdAt, 2, 10);
    builder.say(thread, reply, "CONTACT", "Le samedi 13 juin, en matinée idéalement");
    thread.conversation.intent = "HUMAN_REQUEST";
    builder.history(thread.lead, ["NEW"], createdAt, createdAt);
    builder.finish(thread, { humanRequestedAt: reply });
  }
}

/** Leads entered by the team (phone calls, referrals): no conversation yet. */
function runManualLeads(builder: DemoBuilder) {
  const { rng, clock, ctx } = builder;
  const entries = [
    { source: "MANUAL" as const, note: "Appel téléphonique : souhaite des infos sur l'épilation laser des jambes, rappeler après 18 h." },
    { source: "REFERRAL" as const, note: "Recommandée par une cliente fidèle. Intéressée par un soin visage pour son anniversaire." },
    { source: "MANUAL" as const, note: "Passée à l'institut sans rendez-vous, a pris la plaquette des soins visage." },
    { source: "REFERRAL" as const, note: "Collègue d'une cliente, veut tester l'Hydrafacial." },
  ];
  for (const entry of entries) {
    const createdAt = clock.contactMoment(rng, rng.int(0, 4));
    const service = builder.pickService();
    const thread = builder.startThread({ status: "NEW", createdAt, channel: null, language: "fr", service, existing: { source: entry.source } });
    thread.lead.assignedToUserId = rng.pick([ctx.team.staffId, ctx.team.ownerId]);
    builder.bundle.notes.push({ organizationId: ctx.organizationId, leadId: thread.lead.id, authorUserId: ctx.team.staffId, body: entry.note, createdAt });
    builder.history(thread.lead, ["NEW"], createdAt, createdAt);
    builder.finish(thread, { nextFollowUpAt: new Date(createdAt.getTime() + DAY) });
  }
}

// ─── Imported client file and reactivation ─────────────────────────────────

const IMPORT_SIZE = 260;

function runClientFile(builder: DemoBuilder) {
  const { rng, ctx } = builder;
  const importedAt = builder.clock.at(-21, 10, 12);
  const importId = randomUUID();
  const imported: Array<LeadInsert & { id: string }> = [];
  const averageBasket = [4500, 5900, 9000, 9500, 12000, 18000, 18900, 25000];

  for (let index = 0; index < IMPORT_SIZE; index++) {
    const { firstName, lastName } = builder.people.person(rng.chance(0.06) ? "pt" : "fr");
    const visitCount = rng.weighted([[1, 35], [rng.int(2, 3), 30], [rng.int(4, 8), 25], [rng.int(9, 20), 10]] as const);
    // 40 % came recently, the others are spread over two years.
    const lastVisitDays = rng.chance(0.4) ? rng.int(5, 59) : rng.int(60, 720);
    const lastVisit = builder.clock.at(-lastVisitDays, rng.int(10, 18), rng.pick([0, 30]));
    const firstVisit = new Date(lastVisit.getTime() - (visitCount - 1) * rng.int(25, 80) * DAY);
    const consent = rng.weighted([["GRANTED", 52], ["UNKNOWN", 38], ["DENIED", 10]] as const);
    const lead: LeadInsert & { id: string } = {
      id: randomUUID(),
      organizationId: ctx.organizationId,
      firstName,
      lastName,
      phone: builder.people.phone(),
      email: rng.chance(0.7) ? builder.people.email(firstName, lastName) : null,
      source: "IMPORT",
      status: "COMPLETED",
      score: rng.int(40, 70),
      intentLevel: "MEDIUM",
      isExistingClient: true,
      visitCount,
      firstVisitAt: firstVisit,
      lastAppointmentAt: lastVisit,
      lifetimeValueCents: visitCount * rng.pick(averageBasket),
      externalId: `C-${10_000 + index * 7}`,
      importId,
      language: "fr",
      marketingConsent: consent,
      marketingConsentUpdatedAt: consent === "UNKNOWN" ? null : importedAt,
      optedOutAt: consent === "DENIED" && rng.chance(0.3) ? importedAt : null,
      tags: visitCount >= 9 ? ["VIP"] : [],
      lastInteractionAt: lastVisit,
      createdAt: importedAt,
      updatedAt: importedAt,
    };
    imported.push(lead);
    builder.bundle.statusChanges.push({
      organizationId: ctx.organizationId,
      leadId: lead.id,
      fromStatus: null,
      toStatus: "COMPLETED",
      actorType: "USER",
      actorUserId: ctx.team.ownerId,
      reason: "Import du fichier clients",
      createdAt: importedAt,
    });
    if (consent !== "UNKNOWN") {
      builder.bundle.consents.push({
        organizationId: ctx.organizationId,
        leadId: lead.id,
        purpose: "MARKETING",
        status: consent,
        source: "client_file_import",
        proof: { importId, column: "Accepte SMS/email", value: consent === "GRANTED" ? "oui" : "non" },
        recordedByUserId: ctx.team.ownerId,
        createdAt: importedAt,
      });
    }
  }

  // Reactivation campaign (WhatsApp template) sent 12 days ago to consenting, inactive clients.
  const campaignId = randomUUID();
  const sentAt = builder.clock.at(-12, 11, 0);
  const targets = imported
    .filter(
      (lead) =>
        lead.marketingConsent === "GRANTED" &&
        !lead.optedOutAt &&
        (lead.lastAppointmentAt as Date).getTime() < sentAt.getTime() - 90 * DAY,
    )
    .slice(0, 34);
  const recipients: Array<typeof campaignRecipients.$inferInsert> = [];

  targets.forEach((lead, index) => {
    const outcome = index < 5 ? "COMPLETED" : index < 9 ? "BOOKED" : index < 12 ? "REACTIVATION" : index < 14 ? "OPTED_OUT" : "SENT";
    const service = builder.pickService();
    const thread = builder.startThread({
      status: outcome === "COMPLETED" ? "COMPLETED" : outcome === "BOOKED" ? "BOOKED" : outcome === "REACTIVATION" ? "REACTIVATION" : "COMPLETED",
      createdAt: sentAt,
      channel: "WHATSAPP",
      language: "fr",
      service,
      intent: "FOLLOW_UP",
      existing: { ...lead },
    });
    const first = lead.firstName ?? "";
    const sendTime = new Date(sentAt.getTime() + index * 40_000);
    const messageId = builder.say(
      thread,
      sendTime,
      "AI",
      `Bonjour ${first}, cela fait un moment que nous ne vous avons pas vue chez Maison Éclat. Envie de prendre un moment pour vous ? Je peux vous proposer un créneau dès cette semaine. Répondez STOP pour ne plus recevoir nos messages.`,
      { template: true },
    );
    const recipient: typeof campaignRecipients.$inferInsert = {
      organizationId: ctx.organizationId,
      campaignId,
      leadId: lead.id,
      status: "SENT",
      messageId,
      sentAt: sendTime,
      createdAt: sentAt,
    };

    if (outcome === "OPTED_OUT") {
      const reply = builder.customerDelay(sendTime, 30, 600);
      builder.say(thread, reply, "CONTACT", "STOP");
      builder.say(thread, builder.aiDelay(reply), "AI", "C'est noté, vous ne recevrez plus de messages de notre part. Belle journée !");
      Object.assign(thread.lead, { optedOutAt: reply, marketingConsent: "WITHDRAWN", marketingConsentUpdatedAt: reply });
      builder.bundle.consents.push({ organizationId: ctx.organizationId, leadId: lead.id, purpose: "MARKETING", status: "WITHDRAWN", channel: "WHATSAPP", source: "stop_keyword", proof: { keyword: "STOP" }, createdAt: reply });
      Object.assign(recipient, { status: "OPTED_OUT", repliedAt: reply });
    } else if (outcome === "COMPLETED" || outcome === "BOOKED") {
      const reply = builder.customerDelay(sendTime, 20, 900);
      builder.say(thread, reply, "CONTACT", rng.pick(["Oh oui ça me ferait du bien ! Vous avez quoi la semaine prochaine ?", "Avec plaisir, j'avais justement envie de revenir", "Oui ! Plutôt un samedi si possible"]));
      const startsAt = outcome === "COMPLETED" ? builder.clock.slot(rng, -rng.int(1, 8), -1) : builder.clock.slot(rng, rng.int(1, 10), 1);
      const proposal = builder.aiDelay(reply);
      builder.say(thread, proposal, "AI", COPY.fr.propose(builder.clock.slotLabel(startsAt, "fr"), builder.clock.slotLabel(new Date(startsAt.getTime() + DAY + 2 * HOUR), "fr")));
      const choice = builder.customerDelay(proposal, 2, 60);
      builder.say(thread, choice, "CONTACT", "Le premier c'est parfait");
      const confirmed = builder.aiDelay(choice);
      builder.say(thread, confirmed, "AI", COPY.fr.confirm(service, builder.clock.slotLabel(startsAt, "fr")));
      const appointment = builder.appointment(thread, { startsAt, createdAt: confirmed, status: outcome === "COMPLETED" ? "COMPLETED" : "PENDING" });
      const reminder = builder.reminder(thread, appointment);
      if (reminder) {
        appointment.confirmedAt = reminder;
        if (appointment.status === "PENDING") appointment.status = "CONFIRMED";
      }
      builder.attribute(thread, appointment, "CLIENT_REACTIVATED");
      if (outcome === "COMPLETED") {
        Object.assign(thread.lead, {
          visitCount: (lead.visitCount ?? 0) + 1,
          lastAppointmentAt: startsAt,
          generatedValueCents: appointment.priceCents ?? 0,
          lifetimeValueCents: (lead.lifetimeValueCents ?? 0) + (appointment.priceCents ?? 0),
        });
      }
      Object.assign(recipient, { status: "BOOKED", repliedAt: reply, bookedAppointmentId: appointment.id });
      builder.history(thread.lead, outcome === "COMPLETED" ? ["REACTIVATION", "BOOKED", "SHOWED", "COMPLETED"] : ["REACTIVATION", "BOOKED"], sendTime, outcome === "COMPLETED" ? startsAt : confirmed, {
        REACTIVATION: "Campagne de réactivation — inactives depuis 90 jours",
      });
    } else if (outcome === "REACTIVATION") {
      builder.history(thread.lead, ["REACTIVATION"], sendTime, sendTime, { REACTIVATION: "Campagne de réactivation — inactives depuis 90 jours" });
    }

    recipients.push(recipient);
    builder.finish(thread, { nextFollowUpAt: outcome === "REACTIVATION" ? new Date(sendTime.getTime() + 15 * DAY) : null });
    imported[imported.indexOf(lead)] = thread.lead;
  });

  // Clients outside the campaign keep their imported state (no conversation).
  const contacted = new Set(targets.map((lead) => lead.id));
  for (const lead of imported) {
    if (!contacted.has(lead.id)) builder.bundle.leads.push(lead);
  }

  const skipped = [
    { row: 14, reason: "Ni téléphone ni email" },
    { row: 57, reason: "Téléphone invalide" },
    { row: 103, reason: "Doublon dans le fichier (même téléphone que la ligne 88)" },
    { row: 142, reason: "Ni téléphone ni email" },
    { row: 188, reason: "Téléphone et email invalides" },
    { row: 201, reason: "Téléphone invalide" },
    { row: 236, reason: "Doublon dans le fichier (même email que la ligne 12)" },
    { row: 262, reason: "Ni téléphone ni email" },
  ];

  return {
    contactImport: {
      id: importId,
      organizationId: ctx.organizationId,
      fileName: "fichier-clients-maison-eclat.csv",
      status: "COMPLETED" as const,
      totalRows: IMPORT_SIZE + skipped.length,
      createdCount: IMPORT_SIZE,
      updatedCount: 0,
      skippedCount: skipped.length,
      mapping: {
        externalId: "N° client",
        firstName: "Prénom",
        lastName: "Nom",
        phone: "Portable",
        email: "Email",
        lastVisitAt: "Dernière visite",
        firstVisitAt: "Première visite",
        visitCount: "Nb visites",
        lifetimeValue: "CA total",
        marketingConsent: "Accepte SMS/email",
      },
      errors: skipped,
      declaration: IMPORT_DECLARATION,
      createdByUserId: ctx.team.ownerId,
      createdAt: importedAt,
      completedAt: new Date(importedAt.getTime() + 4_000),
    },
    campaign: {
      id: campaignId,
      organizationId: ctx.organizationId,
      name: "Réactivation — inactives depuis 90 jours",
      status: "COMPLETED" as const,
      channel: "WHATSAPP" as const,
      inactivityDays: 90,
      segment: { consent: "GRANTED", inactivityDays: 90 },
      messageTemplate:
        "Bonjour {prénom}, cela fait un moment que nous ne vous avons pas vue chez Maison Éclat. Envie de prendre un moment pour vous ? Je peux vous proposer un créneau dès cette semaine. Répondez STOP pour ne plus recevoir nos messages.",
      scheduledAt: sentAt,
      startedAt: sentAt,
      completedAt: new Date(sentAt.getTime() + 30 * MINUTE),
      createdByUserId: ctx.team.ownerId,
      createdAt: new Date(sentAt.getTime() - DAY),
    },
    recipients,
  };
}

// ─── Entry point ────────────────────────────────────────────────────────────

async function insertInChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>, size = 400) {
  for (let index = 0; index < rows.length; index += size) {
    await insert(rows.slice(index, index + size));
  }
}

export async function seedDemoActivity(tx: Transaction, ctx: DemoSeedContext): Promise<DemoSeedSummary> {
  const rng = createRandom(20_260_314);
  const builder = new DemoBuilder(ctx, rng);

  // Share of each journey recovered by SOFIA (follow-up after silence, rebooking after a no-show).
  const recoveries: Partial<Record<LeadStatus, { lead: number; noShow: number }>> = {
    COMPLETED: { lead: 15, noShow: 6 },
    BOOKED: { lead: 4, noShow: 2 },
  };
  for (const [status, count] of INBOUND_PLAN) {
    const plan = recoveries[status] ?? { lead: 0, noShow: 0 };
    for (let index = 0; index < count; index++) {
      const recovery = index < plan.lead ? "LEAD" : index < plan.lead + plan.noShow ? "NO_SHOW" : undefined;
      // A few clients still book by phone with the team: not attributed to SOFIA.
      const staffBooked = status === "COMPLETED" && index >= count - 6;
      runInboundLead(builder, status, { recovery, staffBooked });
    }
  }
  runHumanRequests(builder);
  runManualLeads(builder);
  const clientFile = runClientFile(builder);

  const { bundle } = builder;
  // A few notes written by the team.
  const notes = [
    "Préfère être contactée par WhatsApp après 18 h.",
    "Peau sensible : prévoir un test en début de séance.",
    "Cliente fidèle, lui proposer le programme anniversaire.",
    "Souhaite venir avec sa sœur, prévoir deux cabines.",
  ];
  bundle.leads
    .filter((lead) => lead.source !== "IMPORT" && lead.status !== "NEW")
    .slice(0, notes.length)
    .forEach((lead, index) => {
      bundle.notes.push({
        organizationId: ctx.organizationId,
        leadId: lead.id!,
        authorUserId: index % 2 ? ctx.team.staffId : ctx.team.ownerId,
        body: notes[index]!,
        createdAt: lead.lastInteractionAt ?? ctx.now,
      });
    });
  // Some leads are assigned to the staff member.
  bundle.leads
    .filter((lead) => ["HOT", "BOOKING_PENDING", "QUALIFIED"].includes(lead.status ?? ""))
    .forEach((lead, index) => {
      if (index % 2 === 0) lead.assignedToUserId = ctx.team.staffId;
    });

  await tx.insert(contactImports).values(clientFile.contactImport);
  await insertInChunks(bundle.leads, (chunk) => tx.insert(leads).values(chunk));
  await insertInChunks(bundle.conversations, (chunk) => tx.insert(conversations).values(chunk));
  await insertInChunks(bundle.messages, (chunk) => tx.insert(messages).values(chunk));
  // Rebooked appointments point to the missed one: insert the missed ones first.
  const ordered = [...bundle.appointments].sort((a, b) => Number(Boolean(a.rescheduledFromId)) - Number(Boolean(b.rescheduledFromId)));
  await insertInChunks(ordered, (chunk) => tx.insert(appointments).values(chunk));
  await insertInChunks(bundle.attributions, (chunk) => tx.insert(revenueAttributions).values(chunk));
  await insertInChunks(bundle.followups, (chunk) => tx.insert(followups).values(chunk));
  await insertInChunks(bundle.statusChanges, (chunk) => tx.insert(leadStatusChanges).values(chunk));
  await insertInChunks(bundle.notes, (chunk) => tx.insert(leadNotes).values(chunk));
  await insertInChunks(bundle.consents, (chunk) => tx.insert(consentRecords).values(chunk));
  await tx.insert(campaigns).values(clientFile.campaign);
  await insertInChunks(clientFile.recipients, (chunk) => tx.insert(campaignRecipients).values(chunk));

  // Recent notifications for each member of the team.
  const humanRequested = bundle.conversations.find((conversation) => conversation.humanRequestedAt && conversation.handlingMode === "AI_ACTIVE");
  const hotLead = bundle.leads.find((lead) => lead.status === "HOT");
  const bookedLead = bundle.leads.find((lead) => lead.status === "BOOKED");
  const noShowLead = bundle.leads.find((lead) => lead.status === "NO_SHOW");
  const name = (lead?: LeadInsert) => [lead?.firstName, lead?.lastName].filter(Boolean).join(" ");
  const items = [
    humanRequested && {
      type: "HUMAN_REQUESTED" as const,
      title: "Une cliente attend une réponse de l'équipe",
      body: "Question liée à une grossesse : SOFIA a transmis la conversation.",
      linkUrl: `/inbox?conversation=${humanRequested.id}`,
      createdAt: humanRequested.humanRequestedAt as Date,
      read: false,
    },
    hotLead && {
      type: "HOT_LEAD" as const,
      title: `${name(hotLead)} est prête à réserver`,
      body: "Lead chaud : un rappel rapide augmente les chances de réservation.",
      linkUrl: `/leads/${hotLead.id}`,
      createdAt: hotLead.lastInteractionAt as Date,
      read: false,
    },
    bookedLead && {
      type: "NEW_APPOINTMENT" as const,
      title: `Nouveau rendez-vous : ${name(bookedLead)}`,
      body: "Réservé par SOFIA depuis la conversation.",
      linkUrl: `/leads/${bookedLead.id}`,
      createdAt: bookedLead.lastInteractionAt as Date,
      read: true,
    },
    noShowLead && {
      type: "NO_SHOW" as const,
      title: `No-show : ${name(noShowLead)}`,
      body: "SOFIA a proposé un nouveau créneau.",
      linkUrl: `/leads/${noShowLead.id}`,
      createdAt: noShowLead.lastInteractionAt as Date,
      read: true,
    },
    {
      type: "CAMPAIGN_COMPLETED" as const,
      title: "Campagne de réactivation terminée",
      body: `${clientFile.recipients.length} clientes contactées, ${clientFile.recipients.filter((recipient) => recipient.status === "BOOKED").length} rendez-vous pris.`,
      linkUrl: "/reactivation",
      createdAt: clientFile.campaign.completedAt,
      read: true,
    },
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const team = [ctx.team.ownerId, ctx.team.adminId, ctx.team.staffId];
  await tx.insert(notifications).values(
    items.flatMap((item) =>
      team.map((userId) => ({
        organizationId: ctx.organizationId,
        userId,
        type: item.type,
        title: item.title,
        body: item.body,
        linkUrl: item.linkUrl,
        readAt: item.read ? new Date(Math.min(item.createdAt.getTime() + HOUR, ctx.now.getTime())) : null,
        createdAt: item.createdAt,
      })),
    ),
  );

  return {
    leads: bundle.leads.length,
    conversations: bundle.conversations.length,
    messages: bundle.messages.length,
    appointments: bundle.appointments.length,
    followups: bundle.followups.length,
    importedClients: IMPORT_SIZE,
  };
}
