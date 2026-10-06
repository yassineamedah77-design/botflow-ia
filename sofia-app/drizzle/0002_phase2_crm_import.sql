CREATE TYPE "public"."contact_import_status" AS ENUM('PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'LEAD_ASSIGNED' BEFORE 'SYSTEM';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'IMPORT_COMPLETED' BEFORE 'SYSTEM';--> statement-breakpoint
CREATE TABLE "contact_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"status" "contact_import_status" DEFAULT 'PROCESSING' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"declaration" text NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "contact_imports_counts_positive" CHECK ("contact_imports"."total_rows" >= 0 AND "contact_imports"."created_count" >= 0 AND "contact_imports"."updated_count" >= 0 AND "contact_imports"."skipped_count" >= 0)
);
--> statement-breakpoint
DROP INDEX "revenue_attributions_appointment_type_unique";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "first_visit_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "visit_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "lifetime_value_cents" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "import_id" uuid;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_imports_organization_created_idx" ON "contact_imports" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_import_id_contact_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."contact_imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_organization_external_unique" ON "leads" USING btree ("organization_id","external_id") WHERE "leads"."external_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "leads_organization_created_idx" ON "leads" USING btree ("organization_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_attributions_appointment_unique" ON "revenue_attributions" USING btree ("appointment_id");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_history_positive" CHECK ("leads"."visit_count" >= 0 AND ("leads"."lifetime_value_cents" IS NULL OR "leads"."lifetime_value_cents" >= 0));