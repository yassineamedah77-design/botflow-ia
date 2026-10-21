import { z } from "zod";

/*
 * The website widget (Phase 4), shared by the server, the settings screen and
 * the chat window: allowed domains, appearance, and the visitor-facing texts
 * in the three languages SOFIA speaks.
 */

export const WIDGET_LANGUAGES = ["fr", "pt", "en"] as const;
export type WidgetLanguage = (typeof WIDGET_LANGUAGES)[number];

export const MAX_ALLOWED_DOMAINS = 10;
export const VISITOR_MESSAGE_MAX_LENGTH = 1000;
export const DEFAULT_ACCENT_COLOR = "#d97757";

export interface WidgetSettings {
  /** Off: the launcher no longer shows on the website and the chat refuses new messages. */
  enabled: boolean;
  /** Hostnames where the widget may be shown. Each one also covers its subdomains (www…). */
  allowedDomains: string[];
  accentColor: string;
  position: "right" | "left";
  /** First message shown to visitors; a default greeting is used when empty. */
  greeting: string | null;
  /** "Continue on WhatsApp" button, when the establishment has a WhatsApp number. */
  whatsappButton: boolean;
  privacyUrl: string | null;
}

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  enabled: true,
  allowedDomains: [],
  accentColor: DEFAULT_ACCENT_COLOR,
  position: "right",
  greeting: null,
  whatsappButton: true,
  privacyUrl: null,
};

const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/;

/**
 * "https://www.Clinique.fr/contact" → "clinique.fr". Returns null for anything
 * that is not a public hostname (IP addresses, ports and wildcards included).
 */
export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || /\s/.test(trimmed) || trimmed.includes("*")) return null;
  let hostname: string;
  try {
    hostname = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`).hostname;
  } catch {
    return null;
  }
  hostname = hostname.replace(/\.$/, "").replace(/^www\./, "");
  if (hostname === "localhost") return hostname;
  return HOSTNAME.test(hostname) ? hostname : null;
}

/** Whether a page at `origin` may show the widget: the domain itself or one of its subdomains. */
export function isOriginAllowed(origin: string | null | undefined, allowedDomains: readonly string[]): boolean {
  if (!origin) return false;
  let hostname: string;
  try {
    hostname = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

/**
 * CSP `frame-ancestors` for the chat window: the browser itself refuses to
 * show it inside any other site. Scheme-less sources follow the page's own
 * scheme (https in production).
 */
export function frameAncestors(allowedDomains: readonly string[]): string {
  const sources = allowedDomains.filter((domain) => normalizeDomain(domain) === domain).flatMap((domain) => [domain, `*.${domain}`]);
  return ["'self'", ...sources].join(" ");
}

const storedSettings = z
  .object({
    enabled: z.boolean().catch(DEFAULT_WIDGET_SETTINGS.enabled),
    allowedDomains: z.array(z.string()).catch([]),
    accentColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .catch(DEFAULT_ACCENT_COLOR),
    position: z.enum(["right", "left"]).catch("right"),
    greeting: z.string().nullable().catch(null),
    whatsappButton: z.boolean().catch(true),
    privacyUrl: z.string().nullable().catch(null),
  })
  .partial();

/** Settings stored in `integrations.config`, completed with the defaults and cleaned. */
export function readWidgetSettings(config: unknown): WidgetSettings {
  const parsed = storedSettings.safeParse(config ?? {});
  const stored = parsed.success ? parsed.data : {};
  return {
    ...DEFAULT_WIDGET_SETTINGS,
    ...stored,
    allowedDomains: [...new Set((stored.allowedDomains ?? []).map(normalizeDomain).filter((domain): domain is string => domain !== null))].slice(
      0,
      MAX_ALLOWED_DOMAINS,
    ),
  };
}

/** The visitor's language among the establishment's, from the browser's preferences. */
export function pickWidgetLanguage(preferred: readonly string[], allowed: readonly string[], fallback: string): WidgetLanguage {
  const usable = WIDGET_LANGUAGES.filter((language) => allowed.includes(language));
  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    const match = usable.find((language) => language === base);
    if (match) return match;
  }
  return usable.find((language) => language === fallback) ?? usable[0] ?? "fr";
}

/** Short reference shown to the team, e.g. on a WhatsApp hand-over: "W-3F9A2C". */
export function conversationReference(conversationId: string) {
  return `W-${conversationId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export interface WidgetTexts {
  launcher: string;
  close: string;
  statusAi: string;
  statusTeam: string;
  placeholder: string;
  send: string;
  typing: string;
  greetingAi: string;
  greetingTeam: string;
  aiNotice: string;
  privacyNotice: string;
  privacyLink: string;
  team: string;
  you: string;
  leaveContact: string;
  contactTitle: string;
  contactIntro: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  phoneOrEmail: string;
  marketingConsent: string;
  contactSubmit: string;
  contactSaved: string;
  cancel: string;
  whatsapp: string;
  whatsappPrefill: string;
  poweredBy: string;
  rateLimited: string;
  failed: string;
  tooLong: string;
  stillAnswering: string;
  unavailable: string;
  notAllowed: string;
  retry: string;
}

/** Placeholders: {org} establishment, {assistant} assistant's first name, {ref} conversation reference. */
export const WIDGET_TEXTS: Record<WidgetLanguage, WidgetTexts> = {
  fr: {
    launcher: "Discuter avec nous",
    close: "Fermer",
    statusAi: "Assistante virtuelle · répond en quelques secondes",
    statusTeam: "L'équipe vous répond dès que possible",
    placeholder: "Écrivez votre message…",
    send: "Envoyer",
    typing: "{assistant} écrit…",
    greetingAi: "Bonjour ! Je suis {assistant}, l'assistante virtuelle de {org}. Comment puis-je vous aider ?",
    greetingTeam: "Bonjour ! Écrivez-nous, l'équipe de {org} vous répond dès que possible.",
    aiNotice: "Assistante virtuelle : les réponses sont générées automatiquement à partir des informations de {org}, et l'équipe prend le relais dès que nécessaire.",
    privacyNotice: "Vos messages sont traités par {org} pour répondre à votre demande.",
    privacyLink: "Confidentialité",
    team: "Équipe {org}",
    you: "Vous",
    leaveContact: "Être recontacté(e)",
    contactTitle: "Pour que l'équipe vous recontacte",
    contactIntro: "Laissez un numéro ou un email : l'équipe vous répond même si vous quittez le site.",
    firstName: "Prénom",
    lastName: "Nom",
    phone: "Téléphone",
    email: "Email",
    phoneOrEmail: "Indiquez un téléphone ou un email.",
    marketingConsent: "J'accepte de recevoir des offres et des rappels de {org}. Désinscription possible à tout moment.",
    contactSubmit: "Envoyer mes coordonnées",
    contactSaved: "Merci, l'équipe a bien vos coordonnées.",
    cancel: "Annuler",
    whatsapp: "Continuer sur WhatsApp",
    whatsappPrefill: "Bonjour, je vous écris depuis votre site (réf. {ref}).",
    poweredBy: "Propulsé par SOFIA",
    rateLimited: "Trop de messages d'un coup. Patientez un instant.",
    failed: "Le message n'est pas parti. Réessayez.",
    tooLong: "Votre message est trop long.",
    stillAnswering: "{assistant} répond encore à votre message précédent.",
    unavailable: "La conversation n'est pas disponible pour le moment.",
    notAllowed: "Ce widget n'est pas autorisé sur ce site.",
    retry: "Réessayer",
  },
  pt: {
    launcher: "Fale connosco",
    close: "Fechar",
    statusAi: "Assistente virtual · responde em segundos",
    statusTeam: "A equipa responde-lhe o mais brevemente possível",
    placeholder: "Escreva a sua mensagem…",
    send: "Enviar",
    typing: "{assistant} está a escrever…",
    greetingAi: "Olá! Sou a {assistant}, a assistente virtual. Em que posso ajudar?",
    greetingTeam: "Olá! Escreva-nos: a equipa responde-lhe o mais brevemente possível.",
    aiNotice: "Assistente virtual: as respostas são geradas automaticamente a partir das informações do estabelecimento, e a equipa intervém sempre que necessário.",
    privacyNotice: "As suas mensagens são tratadas por {org} para responder ao seu pedido.",
    privacyLink: "Privacidade",
    team: "Equipa {org}",
    you: "Você",
    leaveContact: "Deixar contacto",
    contactTitle: "Para a equipa entrar em contacto consigo",
    contactIntro: "Deixe um telemóvel ou um email: a equipa responde-lhe mesmo que saia do site.",
    firstName: "Nome",
    lastName: "Apelido",
    phone: "Telemóvel",
    email: "Email",
    phoneOrEmail: "Indique um telemóvel ou um email.",
    marketingConsent: "Aceito receber ofertas e lembretes de {org}. Pode cancelar a qualquer momento.",
    contactSubmit: "Enviar os meus contactos",
    contactSaved: "Obrigado, a equipa já tem os seus contactos.",
    cancel: "Cancelar",
    whatsapp: "Continuar no WhatsApp",
    whatsappPrefill: "Olá, escrevo-vos a partir do vosso site (ref. {ref}).",
    poweredBy: "Com tecnologia SOFIA",
    rateLimited: "Demasiadas mensagens seguidas. Aguarde um momento.",
    failed: "A mensagem não foi enviada. Tente novamente.",
    tooLong: "A sua mensagem é demasiado longa.",
    stillAnswering: "A {assistant} ainda está a responder à sua mensagem anterior.",
    unavailable: "A conversa não está disponível de momento.",
    notAllowed: "Este widget não está autorizado neste site.",
    retry: "Tentar novamente",
  },
  en: {
    launcher: "Chat with us",
    close: "Close",
    statusAi: "Virtual assistant · replies in seconds",
    statusTeam: "The team will reply as soon as possible",
    placeholder: "Write your message…",
    send: "Send",
    typing: "{assistant} is typing…",
    greetingAi: "Hi! I'm {assistant}, the virtual assistant for {org}. How can I help?",
    greetingTeam: "Hi! Write to us and the {org} team will reply as soon as possible.",
    aiNotice: "Virtual assistant: replies are generated automatically from {org}'s information, and the team steps in whenever needed.",
    privacyNotice: "Your messages are processed by {org} to answer your request.",
    privacyLink: "Privacy",
    team: "{org} team",
    you: "You",
    leaveContact: "Get a call back",
    contactTitle: "So the team can get back to you",
    contactIntro: "Leave a phone number or an email: the team will reply even if you leave the site.",
    firstName: "First name",
    lastName: "Last name",
    phone: "Phone",
    email: "Email",
    phoneOrEmail: "Enter a phone number or an email.",
    marketingConsent: "I agree to receive offers and reminders from {org}. I can unsubscribe at any time.",
    contactSubmit: "Send my details",
    contactSaved: "Thank you, the team has your details.",
    cancel: "Cancel",
    whatsapp: "Continue on WhatsApp",
    whatsappPrefill: "Hello, I'm writing from your website (ref. {ref}).",
    poweredBy: "Powered by SOFIA",
    rateLimited: "Too many messages at once. Please wait a moment.",
    failed: "The message wasn't sent. Please try again.",
    tooLong: "Your message is too long.",
    stillAnswering: "{assistant} is still answering your previous message.",
    unavailable: "The chat is not available right now.",
    notAllowed: "This widget is not allowed on this site.",
    retry: "Try again",
  },
};

export function fillText(template: string, values: { org?: string; assistant?: string; ref?: string }) {
  return template
    .replaceAll("{org}", values.org ?? "")
    .replaceAll("{assistant}", values.assistant ?? "")
    .replaceAll("{ref}", values.ref ?? "");
}

/** White or near-black text on the accent color, whichever reads better (WCAG relative luminance). */
export function readableTextColor(hex: string): "#ffffff" | "#161514" {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "#ffffff";
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  // Contrast with white is (1.05) / (L + 0.05); with #161514 (L ≈ 0.008) it is (L + 0.05) / 0.058.
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.058 ? "#ffffff" : "#161514";
}

/** wa.me link digits from a stored number ("+33 6 12 34 56 78" → "33612345678"), or null. */
export function whatsappDigits(number: string | null | undefined): string | null {
  const digits = number?.replace(/\D/g, "") ?? "";
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}
