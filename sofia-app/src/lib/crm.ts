/**
 * CRM vocabulary shared by server and client: pipeline order (specification
 * §5), labels and badge tones. Values match the PostgreSQL enums.
 */

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "HOT",
  "BOOKING_PENDING",
  "BOOKED",
  "SHOWED",
  "NO_SHOW",
  "CANCELLED",
  "COMPLETED",
  "LOST",
  "REACTIVATION",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type BadgeTone = "sofia" | "success" | "warning" | "destructive" | "info" | "muted" | "outline";

export const LEAD_STATUS_META: Record<LeadStatus, { label: string; description: string; tone: BadgeTone }> = {
  NEW: { label: "Nouveau", description: "Premier contact, pas encore traité.", tone: "info" },
  CONTACTED: { label: "Contacté", description: "SOFIA ou l'équipe a répondu.", tone: "outline" },
  QUALIFIED: { label: "Qualifié", description: "Besoin et prestation identifiés.", tone: "outline" },
  HOT: { label: "Chaud", description: "Forte intention de réserver.", tone: "sofia" },
  BOOKING_PENDING: { label: "Réservation en cours", description: "Créneau choisi, à finaliser.", tone: "warning" },
  BOOKED: { label: "RDV pris", description: "Rendez-vous réservé.", tone: "success" },
  SHOWED: { label: "Venu·e", description: "Présent·e au rendez-vous.", tone: "success" },
  NO_SHOW: { label: "No-show", description: "Absent·e au rendez-vous.", tone: "destructive" },
  CANCELLED: { label: "Annulé", description: "Rendez-vous annulé.", tone: "muted" },
  COMPLETED: { label: "Prestation réalisée", description: "Client·e de l'établissement.", tone: "success" },
  LOST: { label: "Perdu", description: "Ne donnera pas suite.", tone: "muted" },
  REACTIVATION: { label: "Réactivation", description: "Ancien·ne client·e relancé·e.", tone: "sofia" },
};

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}

export const LEAD_SOURCES = ["WHATSAPP", "INSTAGRAM", "WEBSITE", "MANUAL", "IMPORT", "REFERRAL", "OTHER"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  WEBSITE: "Site web",
  MANUAL: "Saisie manuelle",
  IMPORT: "Fichier clients",
  REFERRAL: "Recommandation",
  OTHER: "Autre",
};

/** Sources a team member can pick when creating a contact by hand. */
export const MANUAL_SOURCES = ["MANUAL", "REFERRAL", "WHATSAPP", "INSTAGRAM", "WEBSITE", "OTHER"] as const satisfies readonly LeadSource[];

export const CHANNELS = ["WHATSAPP", "INSTAGRAM", "WEBSITE"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  WEBSITE: "Site web",
};

export const INTENT_LEVEL_LABELS: Record<"LOW" | "MEDIUM" | "HIGH" | "READY_TO_BOOK", string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Forte",
  READY_TO_BOOK: "Prêt·e à réserver",
};

export const CONSENT_LABELS: Record<"UNKNOWN" | "GRANTED" | "DENIED" | "WITHDRAWN", string> = {
  UNKNOWN: "Non renseigné",
  GRANTED: "Accepté",
  DENIED: "Refusé",
  WITHDRAWN: "Retiré",
};

/** Sort keys accepted by the leads table (whitelisted, never raw SQL). */
export const LEAD_SORTS = ["recent", "created", "score", "value", "spent", "name", "followup"] as const;
export type LeadSort = (typeof LEAD_SORTS)[number];

export interface LeadNameParts {
  firstName: string | null;
  lastName: string | null;
  phone?: string | null;
  email?: string | null;
  instagramHandle?: string | null;
}

/** "Emma Bernard", or the best identifier available. */
export function leadDisplayName(lead: LeadNameParts) {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (lead.instagramHandle) return `@${lead.instagramHandle}`;
  return lead.phone ?? lead.email ?? "Contact sans nom";
}

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "RESCHEDULED" | "COMPLETED" | "NO_SHOW";

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "À confirmer", tone: "warning" },
  CONFIRMED: { label: "Confirmé", tone: "success" },
  CANCELLED: { label: "Annulé", tone: "muted" },
  RESCHEDULED: { label: "Reporté", tone: "muted" },
  COMPLETED: { label: "Honoré", tone: "success" },
  NO_SHOW: { label: "No-show", tone: "destructive" },
};

export type AttributionType = "APPOINTMENT_GENERATED" | "LEAD_RECOVERED" | "NO_SHOW_RECOVERED" | "CLIENT_REACTIVATED";

/** How SOFIA earned an appointment (specification §13). */
export const ATTRIBUTION_LABELS: Record<AttributionType, string> = {
  APPOINTMENT_GENERATED: "RDV généré par SOFIA",
  LEAD_RECOVERED: "Lead relancé par SOFIA",
  NO_SHOW_RECOVERED: "No-show récupéré",
  CLIENT_REACTIVATED: "Cliente réactivée",
};

/** Where a consent record comes from, in words. */
export const CONSENT_SOURCE_LABELS: Record<string, string> = {
  client_file_import: "Fichier clients importé",
  staff_manual: "Saisi par l'équipe",
  stop_keyword: "Réponse STOP",
  widget_checkbox: "Case cochée sur le widget",
  whatsapp_optin: "Accord donné sur WhatsApp",
};
