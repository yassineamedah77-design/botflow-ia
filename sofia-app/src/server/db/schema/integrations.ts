import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

import { createdAt, primaryId, timestamptz, updatedAt } from "./columns";
import { integrationProvider, integrationStatus } from "./enums";
import { organizationId } from "./identity";

/**
 * Connection state of each channel and calendar for an establishment.
 *
 * The UI shows CONNECTED only when `status` says so, and `status` is only set
 * to CONNECTED by an adapter after a real, verified handshake (never by a
 * button click). Credentials are AES-256-GCM encrypted (see
 * server/security/crypto.ts) and never sent to the browser.
 */
export const integrations = pgTable(
  "integrations",
  {
    id: primaryId(),
    organizationId: organizationId(),
    provider: integrationProvider().notNull(),
    status: integrationStatus().notNull().default("NOT_CONNECTED"),
    /** Provider-side account id: WhatsApp phone_number_id, Instagram account id, calendar id… */
    externalAccountId: text(),
    /** Human-readable label, e.g. "+33 6 12 34 56 78" or "@maison.eclat". */
    displayName: text(),
    credentialsEncrypted: text(),
    config: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    lastError: text(),
    lastErrorAt: timestamptz(),
    connectedAt: timestamptz(),
    lastHealthcheckAt: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("integrations_organization_provider_unique").on(t.organizationId, t.provider),
    // Incoming webhooks are routed to an establishment by provider account id.
    uniqueIndex("integrations_provider_account_unique")
      .on(t.provider, t.externalAccountId)
      .where(sql`${t.externalAccountId} IS NOT NULL`),
    index("integrations_status_idx").on(t.status),
  ],
);
