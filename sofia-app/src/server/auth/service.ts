import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { withSystem, withTenant } from "@/server/db/context";
import { memberships, sessions as sessionsTable, users } from "@/server/db/schema";
import {
  emailVerificationEmail,
  passwordChangedEmail,
  passwordResetEmail,
  sendEmail,
} from "@/server/email";
import { env } from "@/server/env";
import { AppError, isUniqueViolation } from "@/server/errors";
import { recordAudit } from "@/server/observability/audit";
import { logger } from "@/server/observability/logger";
import { consumeRateLimit, formatRetryAfter, resetRateLimit, type RateLimitPolicyName } from "@/server/security/rate-limit";
import type { RequestMeta } from "@/server/security/request";
import { provisionOrganization } from "@/server/services/organizations";

import { hashPassword, needsRehash, verifyAgainstDummyHash, verifyPassword } from "./password";
import { createSession, deleteSession, deleteUserSessions } from "./sessions";
import { consumeAuthToken, issueAuthToken, TOKEN_LIFETIME_MS } from "./tokens";

/**
 * Authentication flows. Framework-agnostic: cookies, redirects and form
 * parsing live in the server actions; everything here is plain functions
 * that the integration tests call directly.
 */

/** Runs follow-up work (emails). Server actions pass Next.js `after()` so it happens after the response. */
export type TaskScheduler = (task: () => Promise<unknown>) => void | Promise<unknown>;
const runInline: TaskScheduler = (task) => task();

export interface SessionGrant {
  userId: string;
  organizationId: string | null;
  sessionToken: string;
  sessionExpiresAt: Date;
}

async function enforceRateLimit(policy: RateLimitPolicyName, identifier: string | null | undefined) {
  if (!identifier) return;
  const result = await consumeRateLimit(policy, identifier);
  if (!result.allowed) {
    throw new AppError(
      "RATE_LIMITED",
      `Trop de tentatives. Réessayez dans ${formatRetryAfter(result.retryAfterSeconds)}.`,
    );
  }
}

function link(path: string, token: string) {
  return `${env().APP_URL}${path}?token=${encodeURIComponent(token)}`;
}

// ─── Sign up ────────────────────────────────────────────────────────────────

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

/**
 * Creates the account, the establishment and the owner membership in one
 * transaction scoped to the new establishment (Row-Level Security applies to
 * every insert), then opens a session and sends the verification email.
 */
export async function signUp(
  input: SignUpInput,
  meta: RequestMeta,
  options: { schedule?: TaskScheduler } = {},
): Promise<SessionGrant> {
  if (!env().SIGNUP_ENABLED) {
    throw new AppError(
      "FORBIDDEN",
      "Les inscriptions sont fermées. Contactez BotFlow IA pour ouvrir votre espace SOFIA.",
    );
  }
  await enforceRateLimit("signupByIp", meta.ipAddress);

  const passwordHash = await hashPassword(input.password);
  const organizationId = randomUUID();
  const now = new Date();

  let grant: SessionGrant;
  try {
    grant = await withTenant(organizationId, async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ email: input.email, name: input.name, passwordHash, termsAcceptedAt: now, lastLoginAt: now })
        .returning({ id: users.id });
      await provisionOrganization(tx, { organizationId, name: input.organizationName, ownerUserId: user!.id });
      const session = await createSession(tx, {
        userId: user!.id,
        activeOrganizationId: organizationId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      await recordAudit(tx, {
        organizationId,
        actorType: "USER",
        actorUserId: user!.id,
        action: "auth.signup",
        entityType: "organization",
        entityId: organizationId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      return {
        userId: user!.id,
        organizationId,
        sessionToken: session.token,
        sessionExpiresAt: session.expiresAt,
      };
    });
  } catch (error) {
    if (isUniqueViolation(error, "users_email_unique")) {
      throw new AppError("CONFLICT", "Un compte existe déjà avec cette adresse email. Connectez-vous ou réinitialisez votre mot de passe.", {
        fieldErrors: { email: ["Un compte existe déjà avec cette adresse email."] },
      });
    }
    throw error;
  }

  const schedule = options.schedule ?? runInline;
  await schedule(() => sendVerificationEmail(grant.userId, { skipRateLimit: true }));
  return grant;
}

// ─── Sign in / sign out ─────────────────────────────────────────────────────

const INVALID_CREDENTIALS = "Email ou mot de passe incorrect.";

export async function signIn(input: { email: string; password: string }, meta: RequestMeta): Promise<SessionGrant> {
  await enforceRateLimit("loginByIp", meta.ipAddress);
  await enforceRateLimit("loginByEmail", input.email);

  const [user] = await getDb().select().from(users).where(eq(users.email, input.email)).limit(1);

  if (!user?.passwordHash) {
    await verifyAgainstDummyHash(input.password);
    throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS);
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    await withSystem((tx) =>
      recordAudit(tx, {
        actorType: "USER",
        actorUserId: user.id,
        action: "auth.login_failed",
        entityType: "user",
        entityId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      }),
    );
    throw new AppError("INVALID_CREDENTIALS", INVALID_CREDENTIALS);
  }

  if (user.disabledAt) {
    throw new AppError("FORBIDDEN", "Ce compte est désactivé. Contactez le responsable de votre établissement.");
  }

  await resetRateLimit("loginByEmail", input.email);
  const upgradedHash = needsRehash(user.passwordHash) ? await hashPassword(input.password) : undefined;

  return withSystem(async (tx) => {
    const [membership] = await tx
      .select({ organizationId: memberships.organizationId })
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .orderBy(asc(memberships.createdAt))
      .limit(1);
    const organizationId = membership?.organizationId ?? null;

    await tx
      .update(users)
      .set({ lastLoginAt: new Date(), ...(upgradedHash ? { passwordHash: upgradedHash } : {}) })
      .where(eq(users.id, user.id));
    const session = await createSession(tx, {
      userId: user.id,
      activeOrganizationId: organizationId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: user.id,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return { userId: user.id, organizationId, sessionToken: session.token, sessionExpiresAt: session.expiresAt };
  });
}

export async function signOut(session: { id: string; userId: string; activeOrganizationId: string | null }, meta: RequestMeta) {
  await withSystem(async (tx) => {
    await deleteSession(tx, session.id);
    await recordAudit(tx, {
      organizationId: session.activeOrganizationId,
      actorType: "USER",
      actorUserId: session.userId,
      action: "auth.logout",
      entityType: "user",
      entityId: session.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
}

// ─── Password reset ─────────────────────────────────────────────────────────

/**
 * Always completes the same way whether or not the email is registered, so
 * the form cannot be used to discover accounts. The email itself is sent
 * through `schedule` (after the response when called from a server action).
 */
export async function requestPasswordReset(
  email: string,
  meta: RequestMeta,
  options: { schedule?: TaskScheduler } = {},
) {
  await enforceRateLimit("passwordResetByIp", meta.ipAddress);
  await enforceRateLimit("passwordResetByEmail", email);

  const [user] = await getDb()
    .select({ id: users.id, name: users.name, disabledAt: users.disabledAt })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user || user.disabledAt) {
    logger.info("Password reset requested for an unknown or disabled account");
    return;
  }

  const { token } = await withSystem(async (tx) => {
    const issued = await issueAuthToken(tx, user.id, "PASSWORD_RESET");
    await recordAudit(tx, {
      actorType: "USER",
      actorUserId: user.id,
      action: "auth.password_reset_requested",
      entityType: "user",
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return issued;
  });

  const schedule = options.schedule ?? runInline;
  await schedule(() =>
    sendEmail(
      email,
      passwordResetEmail({
        name: user.name,
        url: link("/reset-password", token),
        expiresInMinutes: TOKEN_LIFETIME_MS.PASSWORD_RESET / 60_000,
      }),
    ),
  );
}

/**
 * Sets a new password from a reset link: the token is consumed atomically,
 * every existing session is revoked (a thief using a stolen session is
 * logged out) and a fresh session is opened.
 */
export async function resetPassword(
  input: { token: string; password: string },
  meta: RequestMeta,
  options: { schedule?: TaskScheduler } = {},
): Promise<SessionGrant> {
  const passwordHash = await hashPassword(input.password);

  const result = await withSystem(async (tx) => {
    const consumed = await consumeAuthToken(tx, input.token, "PASSWORD_RESET");
    if (!consumed) return null;
    const [user] = await tx
      .update(users)
      .set({ passwordHash, emailVerifiedAt: new Date() })
      .where(eq(users.id, consumed.userId))
      .returning({ id: users.id, email: users.email, name: users.name, emailVerifiedAt: users.emailVerifiedAt });
    await deleteUserSessions(tx, consumed.userId);
    const [membership] = await tx
      .select({ organizationId: memberships.organizationId })
      .from(memberships)
      .where(eq(memberships.userId, consumed.userId))
      .orderBy(asc(memberships.createdAt))
      .limit(1);
    const organizationId = membership?.organizationId ?? null;
    const session = await createSession(tx, {
      userId: consumed.userId,
      activeOrganizationId: organizationId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: consumed.userId,
      action: "auth.password_reset",
      entityType: "user",
      entityId: consumed.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return { user: user!, organizationId, session };
  });

  if (!result) {
    throw new AppError("INVALID_TOKEN", "Ce lien de réinitialisation est invalide ou a expiré. Demandez-en un nouveau.");
  }

  const schedule = options.schedule ?? runInline;
  await schedule(() => sendEmail(result.user.email, passwordChangedEmail({ name: result.user.name })));

  return {
    userId: result.user.id,
    organizationId: result.organizationId,
    sessionToken: result.session.token,
    sessionExpiresAt: result.session.expiresAt,
  };
}

// ─── Email verification ─────────────────────────────────────────────────────

export async function sendVerificationEmail(userId: string, options: { skipRateLimit?: boolean } = {}) {
  if (!options.skipRateLimit) {
    await enforceRateLimit("verificationEmailByUser", userId);
  }
  const [user] = await getDb()
    .select({ email: users.email, name: users.name, emailVerifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || user.emailVerifiedAt) return { ok: true as const, alreadyVerified: true };

  const { token } = await withSystem((tx) => issueAuthToken(tx, userId, "EMAIL_VERIFICATION"));
  const result = await sendEmail(
    user.email,
    emailVerificationEmail({
      name: user.name,
      url: link("/verify-email", token),
      expiresInHours: TOKEN_LIFETIME_MS.EMAIL_VERIFICATION / 3_600_000,
    }),
  );
  return result.ok ? { ok: true as const, alreadyVerified: false } : { ok: false as const, error: result.error };
}

export async function verifyEmail(token: string, meta: RequestMeta) {
  const verified = await withSystem(async (tx) => {
    const consumed = await consumeAuthToken(tx, token, "EMAIL_VERIFICATION");
    if (!consumed) return null;
    await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, consumed.userId));
    await recordAudit(tx, {
      actorType: "USER",
      actorUserId: consumed.userId,
      action: "auth.email_verified",
      entityType: "user",
      entityId: consumed.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return consumed.userId;
  });
  if (!verified) {
    throw new AppError("INVALID_TOKEN", "Ce lien de confirmation est invalide ou a expiré. Renvoyez-en un depuis votre compte.");
  }
  return verified;
}

// ─── Account ────────────────────────────────────────────────────────────────

export async function changePassword(
  input: { userId: string; sessionId: string; currentPassword: string; newPassword: string },
  meta: RequestMeta,
  options: { schedule?: TaskScheduler } = {},
) {
  const [user] = await getDb()
    .select({ email: users.email, name: users.name, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw new AppError("INVALID_CREDENTIALS", "Mot de passe actuel incorrect.", {
      fieldErrors: { currentPassword: ["Mot de passe actuel incorrect."] },
    });
  }
  const passwordHash = await hashPassword(input.newPassword);
  await withSystem(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, input.userId));
    // Keep the current device signed in, sign out every other one.
    await deleteUserSessions(tx, input.userId, { exceptSessionId: input.sessionId });
    await recordAudit(tx, {
      actorType: "USER",
      actorUserId: input.userId,
      action: "auth.password_changed",
      entityType: "user",
      entityId: input.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
  const schedule = options.schedule ?? runInline;
  await schedule(() => sendEmail(user.email, passwordChangedEmail({ name: user.name })));
}

export async function updateProfile(userId: string, input: { name: string }) {
  await getDb().update(users).set({ name: input.name }).where(eq(users.id, userId));
}

export async function revokeSession(input: { userId: string; sessionId: string }, meta: RequestMeta) {
  await withSystem(async (tx) => {
    await tx.delete(sessionsTable).where(and(eq(sessionsTable.id, input.sessionId), eq(sessionsTable.userId, input.userId)));
    await recordAudit(tx, {
      actorType: "USER",
      actorUserId: input.userId,
      action: "auth.session_revoked",
      entityType: "user",
      entityId: input.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
}

export async function revokeOtherSessions(input: { userId: string; currentSessionId: string }, meta: RequestMeta) {
  await withSystem(async (tx) => {
    await deleteUserSessions(tx, input.userId, { exceptSessionId: input.currentSessionId });
    await recordAudit(tx, {
      actorType: "USER",
      actorUserId: input.userId,
      action: "auth.other_sessions_revoked",
      entityType: "user",
      entityId: input.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
}
