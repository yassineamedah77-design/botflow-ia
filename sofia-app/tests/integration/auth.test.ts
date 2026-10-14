import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  changePassword,
  requestPasswordReset,
  resetPassword,
  revokeOtherSessions,
  sendVerificationEmail,
  signIn,
  signOut,
  signUp,
  verifyEmail,
} from "@/server/auth/service";
import { sessionIdFromToken, validateSessionToken } from "@/server/auth/sessions";
import { getDb } from "@/server/db/client";
import { withSystem, withTenant } from "@/server/db/context";
import {
  auditLogs,
  authTokens,
  automations,
  businessProfiles,
  integrations,
  memberships,
  organizations,
  sessions,
  users,
} from "@/server/db/schema";
import { resetEnvCache } from "@/server/env";
import { AppError } from "@/server/errors";

import { createEstablishment, lastEmailTo, linkFrom, mailbox, meta, PASSWORD, uniqueEmail } from "./helpers";

async function expectAppError(promise: Promise<unknown>, code: AppError["code"]) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).code).toBe(code);
  return error as AppError;
}

describe("sign up", () => {
  it("creates the account, the establishment and everything SOFIA needs", async () => {
    const email = uniqueEmail("Camille");
    const grant = await signUp(
      { name: "Camille Laurent", email: email.toLowerCase(), password: PASSWORD, organizationName: "Maison Lumière" },
      meta,
    );
    const organizationId = grant.organizationId!;

    const [user] = await getDb().select().from(users).where(eq(users.id, grant.userId));
    expect(user?.email).toBe(email.toLowerCase());
    expect(user?.passwordHash?.startsWith("$argon2id$")).toBe(true);
    expect(user?.termsAcceptedAt).toBeInstanceOf(Date);
    expect(user?.emailVerifiedAt).toBeNull();

    const provisioned = await withTenant(organizationId, async (tx) => ({
      organization: (await tx.select().from(organizations))[0],
      membership: (await tx.select().from(memberships))[0],
      profile: (await tx.select().from(businessProfiles))[0],
      integrations: await tx.select().from(integrations),
      automations: await tx.select().from(automations),
      audit: await tx.select().from(auditLogs).where(eq(auditLogs.action, "auth.signup")),
    }));
    expect(provisioned.organization).toMatchObject({ name: "Maison Lumière", slug: "maison-lumiere", plan: "STARTER", sofiaStatus: "INACTIVE" });
    expect(provisioned.organization?.widgetPublicId).toMatch(/^sof_/);
    expect(provisioned.membership).toMatchObject({ userId: grant.userId, role: "OWNER" });
    expect(provisioned.profile).toBeDefined();
    expect(provisioned.integrations).toHaveLength(5);
    expect(provisioned.integrations.every((integration) => integration.status === "NOT_CONNECTED")).toBe(true);
    expect(provisioned.automations).toHaveLength(4);
    expect(provisioned.automations.every((automation) => !automation.isEnabled)).toBe(true);
    expect(provisioned.audit).toHaveLength(1);

    const session = await validateSessionToken(grant.sessionToken);
    expect(session?.user.email).toBe(email.toLowerCase());
    expect(session?.activeOrganizationId).toBe(organizationId);

    const verification = lastEmailTo(email.toLowerCase());
    expect(verification?.template).toBe("email_verification");
    expect(linkFrom(verification!.text, "/verify-email").searchParams.get("token")).toHaveLength(43);
  });

  it("gives establishments with the same name distinct slugs", async () => {
    const first = await createEstablishment("Spa Sérénité");
    const second = await createEstablishment("Spa Sérénité");
    const slugs = await withSystem((tx) =>
      tx.select({ slug: organizations.slug }).from(organizations).where(eq(organizations.name, "Spa Sérénité")),
    );
    expect(new Set(slugs.map((row) => row.slug)).size).toBe(2);
    expect(slugs.map((row) => row.slug)).toContain("spa-serenite");
    expect(first.organizationId).not.toBe(second.organizationId);
  });

  it("refuses an email that already has an account", async () => {
    const { email } = await createEstablishment();
    const error = await expectAppError(
      signUp({ name: "Doublon", email, password: PASSWORD, organizationName: "Autre" }, meta),
      "CONFLICT",
    );
    expect(error.fieldErrors?.email).toBeDefined();
  });

  it("can be closed to self-service", async () => {
    process.env.SIGNUP_ENABLED = "false";
    resetEnvCache();
    try {
      await expectAppError(
        signUp({ name: "Fermé", email: uniqueEmail(), password: PASSWORD, organizationName: "X" }, meta),
        "FORBIDDEN",
      );
    } finally {
      process.env.SIGNUP_ENABLED = "true";
      resetEnvCache();
    }
  });

  it("rate limits sign-ups per IP address", async () => {
    const ipMeta = { ipAddress: "198.51.100.23", userAgent: "vitest" };
    for (let attempt = 0; attempt < 5; attempt++) {
      await signUp({ name: "Burst", email: uniqueEmail("burst"), password: PASSWORD, organizationName: `Burst ${attempt}` }, ipMeta);
    }
    await expectAppError(
      signUp({ name: "Burst", email: uniqueEmail("burst"), password: PASSWORD, organizationName: "Burst 6" }, ipMeta),
      "RATE_LIMITED",
    );
  });
});

describe("sign in and sessions", () => {
  it("opens a session with the right password and records the login", async () => {
    const { email, userId, organizationId } = await createEstablishment();
    const grant = await signIn({ email, password: PASSWORD }, meta);
    expect(grant.userId).toBe(userId);
    expect(grant.organizationId).toBe(organizationId);
    const session = await validateSessionToken(grant.sessionToken);
    expect(session?.userId).toBe(userId);
    const logins = await withTenant(organizationId, (tx) =>
      tx.select().from(auditLogs).where(and(eq(auditLogs.action, "auth.login"), eq(auditLogs.actorUserId, userId))),
    );
    expect(logins).toHaveLength(1);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const { email } = await createEstablishment();
    const wrong = await expectAppError(signIn({ email, password: "pas le bon mot de passe" }, meta), "INVALID_CREDENTIALS");
    const unknown = await expectAppError(signIn({ email: uniqueEmail("ghost"), password: PASSWORD }, meta), "INVALID_CREDENTIALS");
    expect(wrong.message).toBe(unknown.message);
  });

  it("locks an email after repeated attempts", async () => {
    const { email } = await createEstablishment();
    for (let attempt = 0; attempt < 5; attempt++) {
      await expectAppError(signIn({ email, password: "mauvais mot de passe" }, meta), "INVALID_CREDENTIALS");
    }
    // Even the right password is refused while the email is locked.
    await expectAppError(signIn({ email, password: PASSWORD }, meta), "RATE_LIMITED");
  });

  it("signs out by deleting the session", async () => {
    const { sessionToken } = await createEstablishment();
    const session = await validateSessionToken(sessionToken);
    await signOut(session!, meta);
    expect(await validateSessionToken(sessionToken)).toBeNull();
  });

  it("expires sessions and slides active ones forward", async () => {
    const { sessionToken } = await createEstablishment();
    const id = sessionIdFromToken(sessionToken);

    await getDb().update(sessions).set({ expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000) }).where(eq(sessions.id, id));
    const renewed = await validateSessionToken(sessionToken);
    expect(renewed!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);

    await getDb().update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessions.id, id));
    expect(await validateSessionToken(sessionToken)).toBeNull();
    expect(await getDb().select().from(sessions).where(eq(sessions.id, id))).toEqual([]);
  });

  it("invalidates sessions of a disabled account", async () => {
    const { sessionToken, userId } = await createEstablishment();
    await getDb().update(users).set({ disabledAt: new Date() }).where(eq(users.id, userId));
    expect(await validateSessionToken(sessionToken)).toBeNull();
  });

  it("ignores malformed tokens", async () => {
    expect(await validateSessionToken("not-a-token")).toBeNull();
    expect(await validateSessionToken("x".repeat(43))).toBeNull();
  });

  it("changes the password and signs out the other devices", async () => {
    const { email, userId, sessionToken } = await createEstablishment();
    const other = await signIn({ email, password: PASSWORD }, meta);
    const current = await validateSessionToken(sessionToken);
    await changePassword({ userId, sessionId: current!.id, currentPassword: PASSWORD, newPassword: "une toute nouvelle phrase" }, meta);
    expect(await validateSessionToken(sessionToken)).not.toBeNull();
    expect(await validateSessionToken(other.sessionToken)).toBeNull();
    await expectAppError(signIn({ email, password: PASSWORD }, meta), "INVALID_CREDENTIALS");
    expect((await signIn({ email, password: "une toute nouvelle phrase" }, meta)).userId).toBe(userId);
    expect(lastEmailTo(email)?.template).toBe("password_changed");
  });

  it("refuses a password change with the wrong current password", async () => {
    const { userId, sessionToken } = await createEstablishment();
    const current = await validateSessionToken(sessionToken);
    await expectAppError(
      changePassword({ userId, sessionId: current!.id, currentPassword: "faux", newPassword: "une toute nouvelle phrase" }, meta),
      "INVALID_CREDENTIALS",
    );
  });

  it("revokes every other session on request", async () => {
    const { email, userId, sessionToken } = await createEstablishment();
    const other = await signIn({ email, password: PASSWORD }, meta);
    const current = await validateSessionToken(sessionToken);
    await revokeOtherSessions({ userId, currentSessionId: current!.id }, meta);
    expect(await validateSessionToken(sessionToken)).not.toBeNull();
    expect(await validateSessionToken(other.sessionToken)).toBeNull();
  });
});

describe("password reset", () => {
  it("does nothing visible for an unknown email", async () => {
    const before = mailbox.sent.length;
    await requestPasswordReset(uniqueEmail("nobody"), meta);
    expect(mailbox.sent.length).toBe(before);
  });

  it("resets the password once with the emailed link and revokes all sessions", async () => {
    const { email, userId, sessionToken } = await createEstablishment();
    await requestPasswordReset(email, meta);
    const resetEmail = lastEmailTo(email);
    expect(resetEmail?.template).toBe("password_reset");
    const token = linkFrom(resetEmail!.text, "/reset-password").searchParams.get("token")!;

    const grant = await resetPassword({ token, password: "nouvelle phrase de passe" }, meta);
    expect(grant.userId).toBe(userId);
    expect(await validateSessionToken(sessionToken)).toBeNull();
    expect(await validateSessionToken(grant.sessionToken)).not.toBeNull();
    expect((await signIn({ email, password: "nouvelle phrase de passe" }, meta)).userId).toBe(userId);
    expect(lastEmailTo(email)?.template).toBe("password_changed");

    await expectAppError(resetPassword({ token, password: "encore une autre phrase" }, meta), "INVALID_TOKEN");
  });

  it("only honours the latest link and expires links", async () => {
    const { email } = await createEstablishment();
    await requestPasswordReset(email, meta);
    const first = linkFrom(lastEmailTo(email)!.text, "/reset-password").searchParams.get("token")!;
    await requestPasswordReset(email, meta);
    const second = linkFrom(lastEmailTo(email)!.text, "/reset-password").searchParams.get("token")!;

    await expectAppError(resetPassword({ token: first, password: "nouvelle phrase de passe" }, meta), "INVALID_TOKEN");

    await getDb().update(authTokens).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(authTokens.type, "PASSWORD_RESET"));
    await expectAppError(resetPassword({ token: second, password: "nouvelle phrase de passe" }, meta), "INVALID_TOKEN");
  });

  it("stores only a hash of the reset token", async () => {
    const { email, userId } = await createEstablishment();
    await requestPasswordReset(email, meta);
    const token = linkFrom(lastEmailTo(email)!.text, "/reset-password").searchParams.get("token")!;
    const rows = await getDb().select().from(authTokens).where(eq(authTokens.userId, userId));
    expect(rows.some((row) => row.tokenHash === token)).toBe(false);
  });
});

describe("email verification", () => {
  it("confirms the address with the emailed link, once", async () => {
    const { email, userId } = await createEstablishment();
    const token = linkFrom(lastEmailTo(email)!.text, "/verify-email").searchParams.get("token")!;
    await verifyEmail(token, meta);
    const [user] = await getDb().select({ verifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.id, userId));
    expect(user?.verifiedAt).toBeInstanceOf(Date);
    await expectAppError(verifyEmail(token, meta), "INVALID_TOKEN");
    expect(await sendVerificationEmail(userId)).toEqual({ ok: true, alreadyVerified: true });
  });

  it("reports delivery failures instead of hiding them", async () => {
    const { userId } = await createEstablishment();
    mailbox.failNext = true;
    const result = await sendVerificationEmail(userId);
    expect(result.ok).toBe(false);
  });
});
