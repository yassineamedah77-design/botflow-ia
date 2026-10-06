import { pgEnum } from "drizzle-orm/pg-core";

// Business states are PostgreSQL enums: the database rejects any value the
// application does not know about. drizzle-kit generates `ALTER TYPE ... ADD
// VALUE` migrations when a value is added here.

export const memberRole = pgEnum("member_role", ["OWNER", "ADMIN", "STAFF"]);

export const organizationStatus = pgEnum("organization_status", ["ACTIVE", "SUSPENDED"]);

export const plan = pgEnum("plan", ["STARTER", "GROWTH", "PRO"]);

/** Whether SOFIA answers customers for this establishment (onboarding step 10). */
export const sofiaStatus = pgEnum("sofia_status", ["INACTIVE", "ACTIVE", "PAUSED"]);

export const authTokenType = pgEnum("auth_token_type", ["PASSWORD_RESET", "EMAIL_VERIFICATION"]);

export const channel = pgEnum("channel", ["WHATSAPP", "INSTAGRAM", "WEBSITE"]);

export const integrationProvider = pgEnum("integration_provider", [
  "WHATSAPP_CLOUD",
  "INSTAGRAM_MESSAGING",
  "WEBSITE_WIDGET",
  "GOOGLE_CALENDAR",
  "CALENDLY",
]);

/** CONNECTED is only ever set after a real, verified connection. */
export const integrationStatus = pgEnum("integration_status", [
  "NOT_CONNECTED",
  "PENDING",
  "CONNECTED",
  "ERROR",
  "DISCONNECTED",
]);

export const leadSource = pgEnum("lead_source", [
  "WHATSAPP",
  "INSTAGRAM",
  "WEBSITE",
  "MANUAL",
  "IMPORT",
  "REFERRAL",
  "OTHER",
]);

export const leadStatus = pgEnum("lead_status", [
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
]);

export const intentLevel = pgEnum("intent_level", ["LOW", "MEDIUM", "HIGH", "READY_TO_BOOK"]);

export const conversationIntent = pgEnum("conversation_intent", [
  "NEW_LEAD",
  "PRICE_REQUEST",
  "SERVICE_INFORMATION",
  "BOOKING_REQUEST",
  "RESCHEDULE",
  "CANCELLATION",
  "FOLLOW_UP",
  "NO_SHOW",
  "COMPLAINT",
  "HUMAN_REQUEST",
  "EXISTING_CLIENT",
  "GENERAL_INFORMATION",
  // Health questions always go to a human professional (no medical advice).
  "MEDICAL_QUESTION",
]);

export const conversationStatus = pgEnum("conversation_status", ["OPEN", "CLOSED", "ARCHIVED"]);

export const handlingMode = pgEnum("handling_mode", ["AI_ACTIVE", "HUMAN_ACTIVE"]);

export const messageDirection = pgEnum("message_direction", ["INBOUND", "OUTBOUND"]);

export const messageAuthorType = pgEnum("message_author_type", ["CONTACT", "AI", "USER", "SYSTEM"]);

export const messageStatus = pgEnum("message_status", [
  "RECEIVED",
  "PENDING",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
]);

export const messageContentType = pgEnum("message_content_type", [
  "TEXT",
  "IMAGE",
  "AUDIO",
  "VIDEO",
  "DOCUMENT",
  "TEMPLATE",
  "INTERACTIVE",
  "OTHER",
]);

export const appointmentStatus = pgEnum("appointment_status", [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "RESCHEDULED",
  "COMPLETED",
  "NO_SHOW",
]);

export const appointmentSource = pgEnum("appointment_source", [
  "AI",
  "STAFF",
  "WIDGET",
  "EXTERNAL_CALENDAR",
  "IMPORT",
]);

export const actorType = pgEnum("actor_type", ["USER", "AI", "SYSTEM", "CONTACT", "PLATFORM_ADMIN"]);

/** FROM = "à partir de". ON_CONSULTATION = price set during a consultation. */
export const priceType = pgEnum("price_type", ["FIXED", "FROM", "ON_CONSULTATION", "FREE"]);

export const consentStatus = pgEnum("consent_status", ["UNKNOWN", "GRANTED", "DENIED", "WITHDRAWN"]);

/** Import of an establishment's existing client file (CSV export of its previous software). */
export const contactImportStatus = pgEnum("contact_import_status", ["PROCESSING", "COMPLETED", "FAILED"]);

export const consentPurpose = pgEnum("consent_purpose", ["MARKETING", "REMINDERS", "DATA_PROCESSING"]);

export const automationType = pgEnum("automation_type", [
  "LEAD_RECOVERY",
  "APPOINTMENT_REMINDER",
  "NO_SHOW_RECOVERY",
  "REACTIVATION",
]);

export const followupStatus = pgEnum("followup_status", [
  "SCHEDULED",
  "PROCESSING",
  "SENT",
  "CANCELLED",
  "FAILED",
  "SKIPPED",
]);

export const campaignStatus = pgEnum("campaign_status", [
  "DRAFT",
  "SCHEDULED",
  "RUNNING",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
]);

export const campaignRecipientStatus = pgEnum("campaign_recipient_status", [
  "PENDING",
  "SENT",
  "FAILED",
  "REPLIED",
  "BOOKED",
  "OPTED_OUT",
  "SKIPPED",
]);

export const attributionType = pgEnum("attribution_type", [
  "LEAD_RECOVERED",
  "APPOINTMENT_GENERATED",
  "NO_SHOW_RECOVERED",
  "CLIENT_REACTIVATED",
]);

export const revenueSource = pgEnum("revenue_source", [
  "AI_CONVERSATION",
  "LEAD_FOLLOWUP",
  "NO_SHOW_FLOW",
  "REACTIVATION_CAMPAIGN",
  "MANUAL",
]);

/** ESTIMATED until the appointment happens; only CONFIRMED is shown as earned revenue. */
export const revenueStatus = pgEnum("revenue_status", ["ESTIMATED", "CONFIRMED", "CANCELLED"]);

export const notificationType = pgEnum("notification_type", [
  "NEW_LEAD",
  "HOT_LEAD",
  "HUMAN_REQUESTED",
  "NEW_APPOINTMENT",
  "APPOINTMENT_CANCELLED",
  "NO_SHOW",
  "INTEGRATION_ERROR",
  "CAMPAIGN_COMPLETED",
  "LEAD_ASSIGNED",
  "IMPORT_COMPLETED",
  "SYSTEM",
]);

export const logLevel = pgEnum("log_level", ["DEBUG", "INFO", "WARN", "ERROR"]);

export const eventType = pgEnum("event_type", [
  "MESSAGE_RECEIVED",
  "MESSAGE_SENT",
  "AI_RESPONSE",
  "AI_ERROR",
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "APPOINTMENT_CREATED",
  "APPOINTMENT_UPDATED",
  "FOLLOWUP_SCHEDULED",
  "FOLLOWUP_SENT",
  "HUMAN_HANDOFF",
  "INTEGRATION_ERROR",
  "WEBHOOK_RECEIVED",
  "WEBHOOK_REJECTED",
  "EMAIL_SENT",
  "EMAIL_FAILED",
  "JOB_FAILED",
  "SYSTEM",
]);

export const knowledgeDocumentType = pgEnum("knowledge_document_type", ["TEXT", "URL", "PDF", "FAQ"]);

export const knowledgeDocumentStatus = pgEnum("knowledge_document_status", [
  "PENDING",
  "PROCESSING",
  "READY",
  "FAILED",
]);
