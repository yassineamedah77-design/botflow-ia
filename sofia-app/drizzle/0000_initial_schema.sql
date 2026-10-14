CREATE TYPE "public"."actor_type" AS ENUM('USER', 'AI', 'SYSTEM', 'CONTACT', 'PLATFORM_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."appointment_source" AS ENUM('AI', 'STAFF', 'WIDGET', 'EXTERNAL_CALENDAR', 'IMPORT');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."attribution_type" AS ENUM('LEAD_RECOVERED', 'APPOINTMENT_GENERATED', 'NO_SHOW_RECOVERED', 'CLIENT_REACTIVATED');--> statement-breakpoint
CREATE TYPE "public"."auth_token_type" AS ENUM('PASSWORD_RESET', 'EMAIL_VERIFICATION');--> statement-breakpoint
CREATE TYPE "public"."automation_type" AS ENUM('LEAD_RECOVERY', 'APPOINTMENT_REMINDER', 'NO_SHOW_RECOVERY', 'REACTIVATION');--> statement-breakpoint
CREATE TYPE "public"."campaign_recipient_status" AS ENUM('PENDING', 'SENT', 'FAILED', 'REPLIED', 'BOOKED', 'OPTED_OUT', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('WHATSAPP', 'INSTAGRAM', 'WEBSITE');--> statement-breakpoint
CREATE TYPE "public"."consent_purpose" AS ENUM('MARKETING', 'REMINDERS', 'DATA_PROCESSING');--> statement-breakpoint
CREATE TYPE "public"."consent_status" AS ENUM('UNKNOWN', 'GRANTED', 'DENIED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."conversation_intent" AS ENUM('NEW_LEAD', 'PRICE_REQUEST', 'SERVICE_INFORMATION', 'BOOKING_REQUEST', 'RESCHEDULE', 'CANCELLATION', 'FOLLOW_UP', 'NO_SHOW', 'COMPLAINT', 'HUMAN_REQUEST', 'EXISTING_CLIENT', 'GENERAL_INFORMATION', 'MEDICAL_QUESTION');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('OPEN', 'CLOSED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('MESSAGE_RECEIVED', 'MESSAGE_SENT', 'AI_RESPONSE', 'AI_ERROR', 'LEAD_CREATED', 'LEAD_UPDATED', 'APPOINTMENT_CREATED', 'APPOINTMENT_UPDATED', 'FOLLOWUP_SCHEDULED', 'FOLLOWUP_SENT', 'HUMAN_HANDOFF', 'INTEGRATION_ERROR', 'WEBHOOK_RECEIVED', 'WEBHOOK_REJECTED', 'EMAIL_SENT', 'EMAIL_FAILED', 'JOB_FAILED', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."followup_status" AS ENUM('SCHEDULED', 'PROCESSING', 'SENT', 'CANCELLED', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."handling_mode" AS ENUM('AI_ACTIVE', 'HUMAN_ACTIVE');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('WHATSAPP_CLOUD', 'INSTAGRAM_MESSAGING', 'WEBSITE_WIDGET', 'GOOGLE_CALENDAR', 'CALENDLY');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('NOT_CONNECTED', 'PENDING', 'CONNECTED', 'ERROR', 'DISCONNECTED');--> statement-breakpoint
CREATE TYPE "public"."intent_level" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'READY_TO_BOOK');--> statement-breakpoint
CREATE TYPE "public"."knowledge_document_status" AS ENUM('PENDING', 'PROCESSING', 'READY', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."knowledge_document_type" AS ENUM('TEXT', 'URL', 'PDF', 'FAQ');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('WHATSAPP', 'INSTAGRAM', 'WEBSITE', 'MANUAL', 'IMPORT', 'REFERRAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'HOT', 'BOOKING_PENDING', 'BOOKED', 'SHOWED', 'NO_SHOW', 'CANCELLED', 'COMPLETED', 'LOST', 'REACTIVATION');--> statement-breakpoint
CREATE TYPE "public"."log_level" AS ENUM('DEBUG', 'INFO', 'WARN', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('OWNER', 'ADMIN', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."message_author_type" AS ENUM('CONTACT', 'AI', 'USER', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."message_content_type" AS ENUM('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'TEMPLATE', 'INTERACTIVE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('INBOUND', 'OUTBOUND');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('RECEIVED', 'PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('NEW_LEAD', 'HOT_LEAD', 'HUMAN_REQUESTED', 'NEW_APPOINTMENT', 'APPOINTMENT_CANCELLED', 'NO_SHOW', 'INTEGRATION_ERROR', 'CAMPAIGN_COMPLETED', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('STARTER', 'GROWTH', 'PRO');--> statement-breakpoint
CREATE TYPE "public"."price_type" AS ENUM('FIXED', 'FROM', 'ON_CONSULTATION', 'FREE');--> statement-breakpoint
CREATE TYPE "public"."revenue_source" AS ENUM('AI_CONVERSATION', 'LEAD_FOLLOWUP', 'NO_SHOW_FLOW', 'REACTIVATION_CAMPAIGN', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."revenue_status" AS ENUM('ESTIMATED', 'CONFIRMED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."sofia_status" AS ENUM('INACTIVE', 'ACTIVE', 'PAUSED');--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "auth_token_type" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "member_role" NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by_user_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_role_not_owner" CHECK ("invitations"."role" <> 'OWNER'),
	CONSTRAINT "invitations_email_normalized" CHECK ("invitations"."email" = lower(btrim("invitations"."email")))
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "organization_status" DEFAULT 'ACTIVE' NOT NULL,
	"plan" "plan" DEFAULT 'STARTER' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"sofia_status" "sofia_status" DEFAULT 'INACTIVE' NOT NULL,
	"timezone" text DEFAULT 'Europe/Paris' NOT NULL,
	"default_language" text DEFAULT 'fr' NOT NULL,
	"allowed_languages" text[] DEFAULT ARRAY['fr']::text[] NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"country" text DEFAULT 'FR' NOT NULL,
	"widget_public_id" text NOT NULL,
	"lead_retention_days" integer DEFAULT 1095 NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_lead_retention_positive" CHECK ("organizations"."lead_retention_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limit_buckets_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"active_organization_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonator_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"email_verified_at" timestamp with time zone,
	"terms_accepted_at" timestamp with time zone,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"last_login_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_normalized" CHECK ("users"."email" = lower(btrim("users"."email")))
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"actor_type" "actor_type" NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"type" "event_type" NOT NULL,
	"level" "log_level" DEFAULT 'INFO' NOT NULL,
	"message" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"correlation_id" text,
	"duration_ms" integer,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link_url" text,
	"entity_type" text,
	"entity_id" text,
	"read_at" timestamp with time zone,
	"emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_closures_range_valid" CHECK ("business_closures"."ends_on" >= "business_closures"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "business_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"opens_at" time NOT NULL,
	"closes_at" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_hours_day_valid" CHECK ("business_hours"."day_of_week" BETWEEN 1 AND 7),
	CONSTRAINT "business_hours_range_valid" CHECK ("business_hours"."closes_at" > "business_hours"."opens_at")
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"assistant_name" text DEFAULT 'SOFIA' NOT NULL,
	"description" text,
	"tone" text,
	"address_line" text,
	"postal_code" text,
	"city" text,
	"country" text,
	"phone" text,
	"email" text,
	"website_url" text,
	"instagram_handle" text,
	"whatsapp_number" text,
	"cancellation_policy" text,
	"booking_policy" text,
	"important_info" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_id" uuid,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"language" text DEFAULT 'fr' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" "knowledge_document_type" NOT NULL,
	"title" text NOT NULL,
	"source_url" text,
	"content" text,
	"status" "knowledge_document_status" DEFAULT 'PENDING' NOT NULL,
	"error" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practitioner_services" (
	"organization_id" uuid NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	CONSTRAINT "practitioner_services_practitioner_id_service_id_pk" PRIMARY KEY("practitioner_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "practitioners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"bio" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_range_valid" CHECK ("promotions"."ends_at" IS NULL OR "promotions"."starts_at" IS NULL OR "promotions"."ends_at" > "promotions"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text,
	"description" text,
	"price_type" "price_type" DEFAULT 'FIXED' NOT NULL,
	"price_cents" integer,
	"duration_minutes" integer,
	"preparation" text,
	"contraindications" text,
	"aftercare" text,
	"requires_consultation" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_price_positive" CHECK ("services"."price_cents" IS NULL OR "services"."price_cents" >= 0),
	CONSTRAINT "services_duration_positive" CHECK ("services"."duration_minutes" IS NULL OR "services"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"status" "integration_status" DEFAULT 'NOT_CONNECTED' NOT NULL,
	"external_account_id" text,
	"display_name" text,
	"credentials_encrypted" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	"connected_at" timestamp with time zone,
	"last_healthcheck_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"purpose" "consent_purpose" NOT NULL,
	"status" "consent_status" NOT NULL,
	"channel" "channel",
	"source" text NOT NULL,
	"proof" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recorded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"author_user_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_status_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"from_status" "lead_status",
	"to_status" "lead_status" NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"email" text,
	"instagram_handle" text,
	"instagram_user_id" text,
	"whatsapp_id" text,
	"source" "lead_source" DEFAULT 'MANUAL' NOT NULL,
	"channel" "channel",
	"interested_service_id" uuid,
	"status" "lead_status" DEFAULT 'NEW' NOT NULL,
	"score" smallint DEFAULT 0 NOT NULL,
	"intent_level" "intent_level" DEFAULT 'LOW' NOT NULL,
	"potential_value_cents" integer,
	"generated_value_cents" integer DEFAULT 0 NOT NULL,
	"language" text,
	"is_existing_client" boolean DEFAULT false NOT NULL,
	"assigned_to_user_id" uuid,
	"last_interaction_at" timestamp with time zone,
	"next_follow_up_at" timestamp with time zone,
	"last_appointment_at" timestamp with time zone,
	"marketing_consent" "consent_status" DEFAULT 'UNKNOWN' NOT NULL,
	"marketing_consent_updated_at" timestamp with time zone,
	"opted_out_at" timestamp with time zone,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_score_range" CHECK ("leads"."score" BETWEEN 0 AND 100),
	CONSTRAINT "leads_values_positive" CHECK ("leads"."generated_value_cents" >= 0 AND ("leads"."potential_value_cents" IS NULL OR "leads"."potential_value_cents" >= 0))
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"channel" "channel" NOT NULL,
	"integration_id" uuid,
	"external_thread_id" text,
	"status" "conversation_status" DEFAULT 'OPEN' NOT NULL,
	"handling_mode" "handling_mode" DEFAULT 'AI_ACTIVE' NOT NULL,
	"taken_over_by_user_id" uuid,
	"taken_over_at" timestamp with time zone,
	"human_requested_at" timestamp with time zone,
	"assigned_to_user_id" uuid,
	"intent" "conversation_intent",
	"intent_level" "intent_level",
	"language" text,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp with time zone,
	"last_message_preview" text,
	"last_inbound_at" timestamp with time zone,
	"last_outbound_at" timestamp with time zone,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_unread_positive" CHECK ("conversations"."unread_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"direction" "message_direction" NOT NULL,
	"author_type" "message_author_type" NOT NULL,
	"author_user_id" uuid,
	"content_type" "message_content_type" DEFAULT 'TEXT' NOT NULL,
	"body" text,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"external_message_id" text,
	"status" "message_status" NOT NULL,
	"error" text,
	"intent" "conversation_intent",
	"ai_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"failed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"service_id" uuid,
	"practitioner_id" uuid,
	"conversation_id" uuid,
	"status" "appointment_status" DEFAULT 'PENDING' NOT NULL,
	"source" "appointment_source" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"price_cents" integer,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"calendar_provider" "integration_provider",
	"external_event_id" text,
	"notes" text,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"completed_at" timestamp with time zone,
	"no_show_at" timestamp with time zone,
	"rescheduled_from_id" uuid,
	"created_by_type" "actor_type" NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_range_valid" CHECK ("appointments"."ends_at" > "appointments"."starts_at"),
	CONSTRAINT "appointments_price_positive" CHECK ("appointments"."price_cents" IS NULL OR "appointments"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" "automation_type" NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"status" "campaign_recipient_status" DEFAULT 'PENDING' NOT NULL,
	"message_id" uuid,
	"booked_appointment_id" uuid,
	"sent_at" timestamp with time zone,
	"replied_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "campaign_status" DEFAULT 'DRAFT' NOT NULL,
	"channel" "channel" NOT NULL,
	"inactivity_days" integer,
	"segment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"message_template" text NOT NULL,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_inactivity_positive" CHECK ("campaigns"."inactivity_days" IS NULL OR "campaigns"."inactivity_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"automation_type" "automation_type" NOT NULL,
	"lead_id" uuid NOT NULL,
	"conversation_id" uuid,
	"appointment_id" uuid,
	"campaign_id" uuid,
	"step" smallint DEFAULT 1 NOT NULL,
	"channel" "channel",
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "followup_status" DEFAULT 'SCHEDULED' NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"last_error" text,
	"message_id" uuid,
	"processed_at" timestamp with time zone,
	"cancelled_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "followups_step_positive" CHECK ("followups"."step" > 0)
);
--> statement-breakpoint
CREATE TABLE "revenue_attributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"attribution_type" "attribution_type" NOT NULL,
	"revenue_source" "revenue_source" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" "revenue_status" DEFAULT 'ESTIMATED' NOT NULL,
	"attributed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_attributions_amount_positive" CHECK ("revenue_attributions"."amount_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_active_organization_id_organizations_id_fk" FOREIGN KEY ("active_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_impersonator_user_id_users_id_fk" FOREIGN KEY ("impersonator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_closures" ADD CONSTRAINT "business_closures_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioner_services" ADD CONSTRAINT "practitioner_services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioner_services" ADD CONSTRAINT "practitioner_services_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioner_services" ADD CONSTRAINT "practitioner_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_status_changes" ADD CONSTRAINT "lead_status_changes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_status_changes" ADD CONSTRAINT "lead_status_changes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_status_changes" ADD CONSTRAINT "lead_status_changes_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_interested_service_id_services_id_fk" FOREIGN KEY ("interested_service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_taken_over_by_user_id_users_id_fk" FOREIGN KEY ("taken_over_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rescheduled_from_id_appointments_id_fk" FOREIGN KEY ("rescheduled_from_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_booked_appointment_id_appointments_id_fk" FOREIGN KEY ("booked_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_attributions" ADD CONSTRAINT "revenue_attributions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_attributions" ADD CONSTRAINT "revenue_attributions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_attributions" ADD CONSTRAINT "revenue_attributions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_tokens_token_hash_unique" ON "auth_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_tokens_user_type_idx" ON "auth_tokens" USING btree ("user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_hash_unique" ON "invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_pending_email_unique" ON "invitations" USING btree ("organization_id","email") WHERE "invitations"."accepted_at" IS NULL AND "invitations"."revoked_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_organization_user_unique" ON "memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_user_id_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_widget_public_id_unique" ON "organizations" USING btree ("widget_public_id");--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_expires_at_idx" ON "rate_limit_buckets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "audit_logs_organization_created_idx" ON "audit_logs" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "event_logs_organization_created_idx" ON "event_logs" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "event_logs_type_created_idx" ON "event_logs" USING btree ("type","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "event_logs_problems_idx" ON "event_logs" USING btree ("organization_id","created_at" DESC NULLS LAST) WHERE "event_logs"."level" IN ('WARN', 'ERROR');--> statement-breakpoint
CREATE INDEX "event_logs_correlation_idx" ON "event_logs" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_organization_created_idx" ON "notifications" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "business_closures_organization_idx" ON "business_closures" USING btree ("organization_id","starts_on");--> statement-breakpoint
CREATE INDEX "business_hours_organization_day_idx" ON "business_hours" USING btree ("organization_id","day_of_week");--> statement-breakpoint
CREATE INDEX "faqs_organization_idx" ON "faqs" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "faqs_service_idx" ON "faqs" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "knowledge_documents_organization_idx" ON "knowledge_documents" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "practitioner_services_service_idx" ON "practitioner_services" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "practitioners_organization_idx" ON "practitioners" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "promotions_organization_active_idx" ON "promotions" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "services_organization_slug_unique" ON "services" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "services_organization_active_idx" ON "services" USING btree ("organization_id","is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_organization_provider_unique" ON "integrations" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_provider_account_unique" ON "integrations" USING btree ("provider","external_account_id") WHERE "integrations"."external_account_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "integrations_status_idx" ON "integrations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "consent_records_lead_idx" ON "consent_records" USING btree ("lead_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "lead_notes_lead_idx" ON "lead_notes" USING btree ("lead_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "lead_status_changes_lead_idx" ON "lead_status_changes" USING btree ("lead_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "lead_status_changes_organization_idx" ON "lead_status_changes" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leads_organization_status_idx" ON "leads" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "leads_organization_last_interaction_idx" ON "leads" USING btree ("organization_id","last_interaction_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leads_organization_next_follow_up_idx" ON "leads" USING btree ("organization_id","next_follow_up_at") WHERE "leads"."next_follow_up_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "leads_organization_last_appointment_idx" ON "leads" USING btree ("organization_id","last_appointment_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_organization_phone_unique" ON "leads" USING btree ("organization_id","phone") WHERE "leads"."phone" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_organization_email_unique" ON "leads" USING btree ("organization_id","email") WHERE "leads"."email" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_organization_instagram_unique" ON "leads" USING btree ("organization_id","instagram_user_id") WHERE "leads"."instagram_user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_organization_whatsapp_unique" ON "leads" USING btree ("organization_id","whatsapp_id") WHERE "leads"."whatsapp_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "conversations_organization_last_message_idx" ON "conversations" USING btree ("organization_id","last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "conversations_organization_status_idx" ON "conversations" USING btree ("organization_id","status","last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "conversations_organization_handling_idx" ON "conversations" USING btree ("organization_id","handling_mode");--> statement-breakpoint
CREATE INDEX "conversations_lead_idx" ON "conversations" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_thread_unique" ON "conversations" USING btree ("organization_id","channel","external_thread_id") WHERE "conversations"."external_thread_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "messages_organization_created_idx" ON "messages" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "messages_external_id_unique" ON "messages" USING btree ("organization_id","external_message_id") WHERE "messages"."external_message_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "appointments_organization_starts_idx" ON "appointments" USING btree ("organization_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_organization_status_idx" ON "appointments" USING btree ("organization_id","status","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_lead_idx" ON "appointments" USING btree ("lead_id","starts_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "appointments_practitioner_idx" ON "appointments" USING btree ("practitioner_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "automations_organization_type_unique" ON "automations" USING btree ("organization_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_recipients_campaign_lead_unique" ON "campaign_recipients" USING btree ("campaign_id","lead_id");--> statement-breakpoint
CREATE INDEX "campaign_recipients_status_idx" ON "campaign_recipients" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "campaigns_organization_status_idx" ON "campaigns" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "followups_due_idx" ON "followups" USING btree ("scheduled_at") WHERE "followups"."status" = 'SCHEDULED';--> statement-breakpoint
CREATE INDEX "followups_organization_lead_idx" ON "followups" USING btree ("organization_id","lead_id");--> statement-breakpoint
CREATE INDEX "followups_appointment_idx" ON "followups" USING btree ("appointment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_attributions_appointment_type_unique" ON "revenue_attributions" USING btree ("appointment_id","attribution_type");--> statement-breakpoint
CREATE INDEX "revenue_attributions_organization_date_idx" ON "revenue_attributions" USING btree ("organization_id","attributed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "revenue_attributions_organization_status_idx" ON "revenue_attributions" USING btree ("organization_id","status");