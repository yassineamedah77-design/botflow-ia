import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";

import type { Transaction } from "@/server/db/context";
import { authTokens, type authTokenType } from "@/server/db/schema";
import { generateToken, sha256Hex } from "@/server/security/crypto";

/**
 * Single-use tokens sent by email (password reset, email verification).
 * Only the SHA-256 is stored; issuing a new token revokes the previous unused
 * ones of the same type, so only the latest email works.
 */

export type AuthTokenType = (typeof authTokenType.enumValues)[number];

export const TOKEN_LIFETIME_MS: Record<AuthTokenType, number> = {
  PASSWORD_RESET: 60 * 60 * 1000,
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
};

export async function issueAuthToken(tx: Transaction, userId: string, type: AuthTokenType, now = new Date()) {
  await tx
    .update(authTokens)
    .set({ usedAt: now })
    .where(and(eq(authTokens.userId, userId), eq(authTokens.type, type), isNull(authTokens.usedAt)));

  const token = generateToken(32);
  const expiresAt = new Date(now.getTime() + TOKEN_LIFETIME_MS[type]);
  await tx.insert(authTokens).values({ userId, type, tokenHash: sha256Hex(token), expiresAt });
  return { token, expiresAt };
}

/**
 * Marks a valid token as used and returns its owner, or null when the token
 * is unknown, expired, already used or of another type. The update is atomic,
 * so two concurrent requests cannot both consume the same token.
 */
export async function consumeAuthToken(tx: Transaction, token: string, type: AuthTokenType, now = new Date()) {
  const [row] = await tx
    .update(authTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(authTokens.tokenHash, sha256Hex(token)),
        eq(authTokens.type, type),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, now),
      ),
    )
    .returning({ userId: authTokens.userId });
  return row ?? null;
}

/** Read-only check used to render the reset page before the form is submitted. */
export async function isAuthTokenUsable(tx: Transaction, token: string, type: AuthTokenType, now = new Date()) {
  const [row] = await tx
    .select({ id: authTokens.id })
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, sha256Hex(token)),
        eq(authTokens.type, type),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, now),
      ),
    )
    .limit(1);
  return Boolean(row);
}
