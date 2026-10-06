/**
 * Onboarding (specification §15): ten steps, and the checklist computed from
 * the establishment's real configuration. Steps whose feature ships in a
 * later phase say so instead of pretending to work.
 */

export const ONBOARDING_STEPS = [
  { slug: "welcome", title: "Bienvenue sur SOFIA" },
  { slug: "establishment", title: "Votre établissement" },
  { slug: "services", title: "Vos prestations" },
  { slug: "hours", title: "Vos horaires" },
  { slug: "calendar", title: "Votre calendrier" },
  { slug: "whatsapp", title: "Connecter WhatsApp" },
  { slug: "instagram", title: "Connecter Instagram" },
  { slug: "widget", title: "Installer le widget site" },
  { slug: "test", title: "Tester SOFIA" },
  { slug: "activation", title: "Activer SOFIA" },
] as const;

export type OnboardingSlug = (typeof ONBOARDING_STEPS)[number]["slug"];

export function isOnboardingSlug(value: string): value is OnboardingSlug {
  return ONBOARDING_STEPS.some((step) => step.slug === value);
}

export type SetupCheckKey = "profile" | "services" | "hours" | "calendar" | "whatsapp" | "instagram" | "widget" | "sofiaActive";
export type SetupChecklistState = Record<SetupCheckKey, boolean>;

export interface SetupItem {
  key: SetupCheckKey;
  label: string;
  description: string;
  step: OnboardingSlug;
  /** Delivery phase of the feature that completes this item, when it is not built yet. */
  phase?: number;
}

export const SETUP_ITEMS: SetupItem[] = [
  { key: "profile", label: "Profil", description: "Adresse, téléphone et présentation que SOFIA communique à vos clientes.", step: "establishment" },
  { key: "services", label: "Prestations", description: "SOFIA ne donne que les prix et durées que vous avez renseignés.", step: "services" },
  { key: "hours", label: "Horaires", description: "Utilisés pour proposer des créneaux réels, jamais inventés.", step: "hours" },
  { key: "calendar", label: "Calendrier", description: "Agenda SOFIA, Google Calendar ou Calendly pour réserver sans double réservation.", step: "calendar", phase: 7 },
  { key: "whatsapp", label: "WhatsApp", description: "Connexion officielle WhatsApp Business Platform (Meta).", step: "whatsapp", phase: 5 },
  { key: "instagram", label: "Instagram", description: "Messages privés Instagram via l'API officielle de Meta.", step: "instagram", phase: 6 },
  { key: "widget", label: "Widget", description: "Une ligne de code à ajouter sur votre site.", step: "widget", phase: 4 },
  { key: "sofiaActive", label: "SOFIA activée", description: "SOFIA commence à répondre à vos clientes, 24 h/24.", step: "activation", phase: 3 },
];

export function setupProgress(state: SetupChecklistState) {
  const done = SETUP_ITEMS.filter((item) => state[item.key]).length;
  // The next thing to do: an item available today first, then the rest.
  const next = SETUP_ITEMS.find((item) => !state[item.key] && !item.phase) ?? SETUP_ITEMS.find((item) => !state[item.key]) ?? null;
  return { done, total: SETUP_ITEMS.length, complete: done === SETUP_ITEMS.length, next };
}
