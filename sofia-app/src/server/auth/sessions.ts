import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import type { Transaction } from "@/server/db/context";
import { sessions, users } from "@/server/db/schema";
import { generateToken, sha256Hex } from "@/server/security/crypto";

/**
 * Database sessions (Copenhagen Book pattern).
 *
 * The browser holds a 256-bit random token; the database only stores its
 * SHA-256. Sessions last 30 days and slide forward while the user is active.
 * `sessions` and `users` are global tables (no Row-Level Security), so these
 * functions work with or without a tenant transaction.
 */

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RENEW_WHEN_REMAINING_MS = 15 * 24 * 60 * 60 * 1000;
const ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

type Executor = Transaction | ReturnType<typeof getDb>;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt: Date | null;
  isPlatformAdmin: boolean;
  locale: string;
}

export interface ValidatedSession {
  id: string;
  userId: string;
  activeOrganizationId: string | null;
  expiresAt: Date;
  createdAt: Date;
  user: SessionUser;
}

export function sessionIdFromToken(token: string) {
  return sha256Hex(token);
}

export function isWellFormedSessionToken(token: string) {
  return TOKEN_PATTERN.test(token);
}

export async function createSession(
  executor: Executor,
  input: { userId: string; activeOrganizationId: string | null; ipAddress?: string | null; userAgent?: string | null },
) {
  const token = generateToken(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await executor.insert(sessions).values({
    id: sessionIdFromToken(token),
    userId: input.userId,
    activeOrganizationId: input.activeOrganizationId,
    expiresAt,
    lastActiveAt: now,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent?.slice(0, 512) ?? null,
  });
  return { token, expiresAt };
}

/**
 * Resolves a session token. Expired sessions and sessions of disabled users
 * are deleted. Active sessions are extended once less than 15 days remain.
 */
export async function validateSessionToken(token: string, now = new Date()): Promise<ValidatedSession | null> {
  if (!isWellFormedSessionToken(token)) return null;
  const db = getDb();
  const id = sessionIdFromToken(token);

  const [row] = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      activeOrganizationId: sessions.activeOrganizationId,
      expiresAt: sessions.expiresAt,
      lastActiveAt: sessions.lastActiveAt,
      createdAt: sessions.createdAt,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerifiedAt: users.emailVerifiedAt,
        isPlatformAdmin: users.isPlatformAdmin,
        locale: users.locale,
        disabledAt: users.disabledAt,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1);

  if (!row) return null;

  if (row.expiresAt.getTime() <= now.getTime() || row.user.disabledAt) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  let expiresAt = row.expiresAt;
  const updates: { expiresAt?: Date; lastActiveAt?: Date } = {};
  if (row.expiresAt.getTime() - now.getTime() < RENEW_WHEN_REMAINING_MS) {
    expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    updates.expiresAt = expiresAt;
  }
  if (now.getTime() - row.lastActiveAt.getTime() > ACTIVITY_WRITE_INTERVAL_MS) {
    updates.lastActiveAt = now;
  }
  if (updates.expiresAt || updates.lastActiveAt) {
    await db.update(sessions).set(updates).where(eq(sessions.id, id));
  }

  const { disabledAt: _disabledAt, ...user } = row.user;
  return {
    id: row.id,
    userId: row.userId,
    activeOrganizationId: row.activeOrganizationId,
    expiresAt,
    createdAt: row.createdAt,
    user,
  };
}

export async function deleteSession(executor: Executor, sessionId: string) {
  await executor.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteUserSessions(executor: Executor, userId: string, options: { exceptSessionId?: string } = {}) {
  const condition = options.exceptSessionId
    ? and(eq(sessions.userId, userId), ne(sessions.id, options.exceptSessionId))
    : eq(sessions.userId, userId);
  await executor.delete(sessions).where(condition);
}

export async function setActiveOrganization(executor: Executor, sessionId: string, organizationId: string | null) {
  await executor.update(sessions).set({ activeOrganizationId: organizationId }).where(eq(sessions.id, sessionId));
}

export async function listUserSessions(userId: string) {
  return getDb()
    .select({
      id: sessions.id,
      createdAt: sessions.createdAt,
      lastActiveAt: sessions.lastActiveAt,
      expiresAt: sessions.expiresAt,
      ipAddress: sessions.ipAddress,
      userAgent: sessions.userAgent,
    })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.lastActiveAt));
}
