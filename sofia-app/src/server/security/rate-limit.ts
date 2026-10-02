import "server-only";

import { eq, lt, sql } from "drizzle-orm";

import { getDb, type Database } from "@/server/db/client";
import { rateLimitBuckets } from "@/server/db/schema";
import { logger } from "@/server/observability/logger";

import { sha256Hex } from "./crypto";

/**
 * Fixed-window rate limiting stored in PostgreSQL, so limits hold across
 * every server instance (serverless included) without extra infrastructure.
 * Keys are hashed: emails and IP addresses are never stored in clear.
 */

export interface RateLimitPolicy {
  limit: number;
  windowSeconds: number;
}

export const rateLimitPolicies = {
  /** Login attempts per email address. Cleared after a successful login. */
  loginByEmail: { limit: 5, windowSeconds: 15 * 60 },
  /** Login attempts per IP, across all emails (credential stuffing). */
  loginByIp: { limit: 30, windowSeconds: 15 * 60 },
  signupByIp: { limit: 5, windowSeconds: 60 * 60 },
  passwordResetByEmail: { limit: 3, windowSeconds: 60 * 60 },
  passwordResetByIp: { limit: 10, windowSeconds: 60 * 60 },
  verificationEmailByUser: { limit: 3, windowSeconds: 60 * 60 },
  invitationsByOrganization: { limit: 50, windowSeconds: 24 * 60 * 60 },
  invitationAcceptByIp: { limit: 20, windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = keyof typeof rateLimitPolicies;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

function bucketKey(policy: RateLimitPolicyName, identifier: string) {
  return sha256Hex(`${policy}:${identifier.trim().toLowerCase()}`);
}

export function windowStartFor(now: Date, windowSeconds: number) {
  const size = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / size) * size);
}

export async function consumeRateLimit(
  policyName: RateLimitPolicyName,
  identifier: string,
  options: { now?: Date; db?: Database } = {},
): Promise<RateLimitResult> {
  const policy = rateLimitPolicies[policyName];
  const now = options.now ?? new Date();
  const db = options.db ?? getDb();
  const windowStart = windowStartFor(now, policy.windowSeconds);
  const windowEnd = new Date(windowStart.getTime() + policy.windowSeconds * 1000);

  const [row] = await db
    .insert(rateLimitBuckets)
    .values({ key: bucketKey(policyName, identifier), windowStart, count: 1, expiresAt: windowEnd })
    .onConflictDoUpdate({
      target: [rateLimitBuckets.key, rateLimitBuckets.windowStart],
      set: { count: sql`${rateLimitBuckets.count} + 1` },
    })
    .returning({ count: rateLimitBuckets.count });

  const count = row?.count ?? 1;

  // Opportunistic cleanup of expired windows; never blocks the request.
  if (Math.random() < 0.02) {
    db.delete(rateLimitBuckets)
      .where(lt(rateLimitBuckets.expiresAt, now))
      .catch((error: unknown) => logger.warn("Rate limit cleanup failed", { err: error }));
  }

  return {
    allowed: count <= policy.limit,
    remaining: Math.max(0, policy.limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000)),
  };
}

export async function resetRateLimit(policyName: RateLimitPolicyName, identifier: string, db: Database = getDb()) {
  await db.delete(rateLimitBuckets).where(eq(rateLimitBuckets.key, bucketKey(policyName, identifier)));
}

export function formatRetryAfter(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "une minute" : `${minutes} minutes`;
}
