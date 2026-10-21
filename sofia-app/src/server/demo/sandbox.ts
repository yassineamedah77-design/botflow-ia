import "server-only";

import { randomBytes } from "node:crypto";

import { and, eq, inArray, like, lt, ne } from "drizzle-orm";

import { DEFAULT_WIDGET_SETTINGS } from "@/lib/widget";
import { describeAiConfiguration } from "@/server/ai/config";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/sessions";
import { getDb } from "@/server/db/client";
import { withSystem, withTenant } from "@/server/db/context";
import { integrations, organizations, users } from "@/server/db/schema";
import { env } from "@/server/env";
import { logger } from "@/server/observability/logger";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { generateToken } from "@/server/security/crypto";
import type { RequestMeta } from "@/server/security/request";
import { createDemoEstablishment, DEMO_ORGANIZATION_SLUG } from "@/server/seed/maison-eclat";

/*
 * The public prospect demo (DEMO_MODE, its own deployment and database).
 * Each visitor gets a private copy of Maison Éclat with three months of
 * activity, is signed in as its owner, and finds the widget already installed
 * on the establishment's fictional website. Nothing is shared between
 * visitors, and every copy is deleted after 24 hours.
 */

export const SANDBOX_TTL_MS = 24 * 60 * 60 * 1000;
/** Accounts of demo copies: a reserved domain (RFC 2606), never a real mailbox. */
const SANDBOX_EMAIL_DOMAIN = "visite.maison-eclat.example";

export function isDemoMode() {
  return env().DEMO_MODE;
}

export class DemoUnavailableError extends Error {
  constructor(readonly reason: "disabled" | "rate_limited", readonly retryAfterSeconds = 0) {
    super(`Demo unavailable: ${reason}`);
    this.name = "DemoUnavailableError";
  }
}

/** Creates a visitor's copy and opens a session on it. */
export async function createDemoSandbox(meta: RequestMeta, now = new Date()): Promise<{ token: string; expiresAt: Date; organizationId: string }> {
  if (!isDemoMode()) throw new DemoUnavailableError("disabled");
  for (const [policy, key] of [
    ["demoSandboxesByIp", meta.ipAddress ?? "unknown"],
    ["demoSandboxesTotal", "all"],
  ] as const) {
    const limit = await consumeRateLimit(policy, key, { now });
    if (!limit.allowed) throw new DemoUnavailableError("rate_limited", limit.retryAfterSeconds);
  }

  // Housekeeping first: a visitor never waits on more than the expired copies of one day.
  await deleteExpiredSandboxes(now).catch((error) => logger.error("Demo cleanup failed", { error }));

  const tag = randomBytes(5).toString("hex");
  const team = [
    { email: `camille-${tag}@${SANDBOX_EMAIL_DOMAIN}`, name: "Camille Laurent", role: "OWNER" },
    { email: `ines-${tag}@${SANDBOX_EMAIL_DOMAIN}`, name: "Inès Moreau", role: "ADMIN" },
    { email: `lea-${tag}@${SANDBOX_EMAIL_DOMAIN}`, name: "Léa Martin", role: "STAFF" },
  ] as const;
  // Nobody knows this password: the visitor is signed in by the session below.
  const passwordHash = await hashPassword(generateToken(32));
  const { organizationId, userIds } = await createDemoEstablishment({ users: team, passwordHash, now });

  const host = new URL(env().APP_URL).hostname;
  const sofiaReady = describeAiConfiguration().configured;
  await withTenant(organizationId, async (tx) => {
    // The widget is installed on the establishment's demo website, served by this deployment.
    await tx
      .update(integrations)
      .set({
        config: { ...DEFAULT_WIDGET_SETTINGS, allowedDomains: [host], privacyUrl: null },
        status: "CONNECTED",
        displayName: host,
        connectedAt: now,
        lastHealthcheckAt: now,
        updatedAt: now,
      })
      .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "WEBSITE_WIDGET")));
    // SOFIA answers only when the server has a model; otherwise the team (the visitor) does.
    if (sofiaReady) {
      await tx.update(organizations).set({ sofiaStatus: "ACTIVE", updatedAt: now }).where(eq(organizations.id, organizationId));
    }
  });

  const session = await createSession(getDb(), {
    userId: userIds.get(team[0].email)!,
    activeOrganizationId: organizationId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  logger.info("Demo sandbox created", { organizationId, sofiaReady });
  return { ...session, organizationId };
}

/** Deletes demo copies older than 24 hours, and their accounts (sessions go with them). */
export async function deleteExpiredSandboxes(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - SANDBOX_TTL_MS);
  return withSystem(async (tx) => {
    const expired = await tx
      .delete(organizations)
      .where(and(eq(organizations.isDemo, true), ne(organizations.slug, DEMO_ORGANIZATION_SLUG), lt(organizations.createdAt, cutoff)))
      .returning({ id: organizations.id });
    const accounts = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(like(users.email, `%@${SANDBOX_EMAIL_DOMAIN}`), lt(users.createdAt, cutoff)));
    if (accounts.length > 0) {
      await tx.delete(users).where(inArray(users.id, accounts.map((account) => account.id)));
    }
    return expired.length;
  });
}

/**
 * The demo's own ceiling on paid model calls, across every copy: limits per
 * establishment would multiply with the number of visitors.
 */
export async function consumeDemoAiBudget(now = new Date()): Promise<boolean> {
  if (!isDemoMode()) return true;
  const limit = await consumeRateLimit("demoAiCallsTotal", "all", { now });
  return limit.allowed;
}
