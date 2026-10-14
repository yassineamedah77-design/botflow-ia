import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, primaryId, timestamptz, updatedAt } from "./columns";
import { authTokenType, memberRole, organizationStatus, plan, sofiaStatus } from "./enums";

/*
 * Identity and tenancy.
 *
 * `users`, `sessions`, `auth_tokens` and `rate_limit_buckets` are global: a
 * person can belong to several establishments. Every table that holds an
 * establishment's data carries an `organization_id` column and is protected by
 * Row-Level Security (see drizzle/0001_row_level_security.sql). The column name
 * is reserved for that purpose: do not use it on a global table.
 */

export const users = pgTable(
  "users",
  {
    id: primaryId(),
    email: text().notNull(),
    name: text().notNull(),
    passwordHash: text(),
    emailVerifiedAt: timestamptz(),
    termsAcceptedAt: timestamptz(),
    /** BotFlow team member with access to the platform admin area. */
    isPlatformAdmin: boolean().notNull().default(false),
    locale: text().notNull().default("fr"),
    lastLoginAt: timestamptz(),
    disabledAt: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    check("users_email_normalized", sql`${t.email} = lower(btrim(${t.email}))`),
  ],
);

export const organizations = pgTable(
  "organizations",
  {
    id: primaryId(),
    name: text().notNull(),
    slug: text().notNull(),
    status: organizationStatus().notNull().default("ACTIVE"),
    plan: plan().notNull().default("STARTER"),
    trialEndsAt: timestamptz(),
    sofiaStatus: sofiaStatus().notNull().default("INACTIVE"),
    timezone: text().notNull().default("Europe/Paris"),
    defaultLanguage: text().notNull().default("fr"),
    /** Languages SOFIA may answer in. The customer's language is detected within this list. */
    allowedLanguages: text().array().notNull().default(sql`ARRAY['fr']::text[]`),
    currency: text().notNull().default("EUR"),
    country: text().notNull().default("FR"),
    /** Public, non-secret identifier embedded in the website widget script. */
    widgetPublicId: text().notNull(),
    /** GDPR retention for prospect data, in days (CNIL guidance: 3 years after last contact). */
    leadRetentionDays: integer().notNull().default(1095),
    onboardingCompletedAt: timestamptz(),
    /** Demonstration establishment (seed): fictional contacts, nothing is ever sent for real. */
    isDemo: boolean().notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("organizations_slug_unique").on(t.slug),
    uniqueIndex("organizations_widget_public_id_unique").on(t.widgetPublicId),
    check("organizations_lead_retention_positive", sql`${t.leadRetentionDays} > 0`),
  ],
);

/** Tenant key column: every establishment-owned table uses this builder. */
export const organizationId = () =>
  uuid()
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" });

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the session token. The token itself only lives in the user's cookie. */
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeOrganizationId: uuid().references(() => organizations.id, { onDelete: "set null" }),
    expiresAt: timestamptz().notNull(),
    lastActiveAt: timestamptz().notNull().defaultNow(),
    ipAddress: text(),
    userAgent: text(),
    /** Set when a platform admin acts as this user (support, Phase 10). */
    impersonatorUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId), index("sessions_expires_at_idx").on(t.expiresAt)],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: primaryId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: authTokenType().notNull(),
    /** SHA-256 of the token sent by email. */
    tokenHash: text().notNull(),
    expiresAt: timestamptz().notNull(),
    usedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("auth_tokens_token_hash_unique").on(t.tokenHash),
    index("auth_tokens_user_type_idx").on(t.userId, t.type),
  ],
);

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    /** SHA-256 of the logical key, so emails and IPs are never stored in clear. */
    key: text().notNull(),
    windowStart: timestamptz().notNull(),
    count: integer().notNull().default(0),
    expiresAt: timestamptz().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.windowStart] }),
    index("rate_limit_buckets_expires_at_idx").on(t.expiresAt),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: primaryId(),
    organizationId: organizationId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("memberships_organization_user_unique").on(t.organizationId, t.userId),
    index("memberships_user_id_idx").on(t.userId),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: primaryId(),
    organizationId: organizationId(),
    email: text().notNull(),
    role: memberRole().notNull(),
    tokenHash: text().notNull(),
    invitedByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamptz().notNull(),
    acceptedAt: timestamptz(),
    revokedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("invitations_token_hash_unique").on(t.tokenHash),
    // One pending invitation per email and establishment.
    uniqueIndex("invitations_pending_email_unique")
      .on(t.organizationId, t.email)
      .where(sql`${t.acceptedAt} IS NULL AND ${t.revokedAt} IS NULL`),
    check("invitations_role_not_owner", sql`${t.role} <> 'OWNER'`),
    check("invitations_email_normalized", sql`${t.email} = lower(btrim(${t.email}))`),
  ],
);
