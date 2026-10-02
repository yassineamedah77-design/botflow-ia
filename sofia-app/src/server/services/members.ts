import "server-only";

import { and, asc, desc, eq, gt, isNull, ne } from "drizzle-orm";

import {
  assignableRoles,
  canManageMember,
  invitableRoles,
  ROLE_LABELS,
  type Role,
} from "@/lib/auth/roles";
import { createSession, setActiveOrganization } from "@/server/auth/sessions";
import { hashPassword } from "@/server/auth/password";
import type { TenantContext } from "@/server/auth/context";
import { getDb } from "@/server/db/client";
import { withSystem, withTenant, type Transaction } from "@/server/db/context";
import { invitations, memberships, organizations, sessions, users } from "@/server/db/schema";
import { invitationEmail, sendEmail, type SendEmailResult } from "@/server/email";
import { env } from "@/server/env";
import { AppError, isUniqueViolation } from "@/server/errors";
import { recordAudit } from "@/server/observability/audit";
import { generateToken, sha256Hex } from "@/server/security/crypto";
import { consumeRateLimit, formatRetryAfter } from "@/server/security/rate-limit";
import type { RequestMeta } from "@/server/security/request";

export const INVITATION_LIFETIME_DAYS = 7;
const INVITATION_LIFETIME_MS = INVITATION_LIFETIME_DAYS * 24 * 60 * 60 * 1000;

function invitationUrl(token: string) {
  return `${env().APP_URL}/invitations/${encodeURIComponent(token)}`;
}

function requirePermission(ctx: TenantContext, allowed: boolean, message = "Vous n'avez pas les droits pour cette action.") {
  if (!allowed) throw new AppError("FORBIDDEN", message);
  void ctx;
}

// ─── Reading ────────────────────────────────────────────────────────────────

export async function listMembers(tx: Transaction, organizationId: string) {
  return tx
    .select({
      membershipId: memberships.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: memberships.role,
      joinedAt: memberships.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, organizationId))
    .orderBy(asc(memberships.role), asc(users.name));
}

export async function listPendingInvitations(tx: Transaction, organizationId: string, now = new Date()) {
  return tx
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
      invitedByName: users.name,
    })
    .from(invitations)
    .leftJoin(users, eq(users.id, invitations.invitedByUserId))
    .where(
      and(
        eq(invitations.organizationId, organizationId),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
        gt(invitations.expiresAt, now),
      ),
    )
    .orderBy(desc(invitations.createdAt));
}

// ─── Inviting ───────────────────────────────────────────────────────────────

export interface InvitationResult {
  invitationId: string;
  email: SendEmailResult;
}

async function deliverInvitation(ctx: TenantContext, input: { email: string; role: Role; token: string }) {
  return sendEmail(
    input.email,
    invitationEmail({
      inviterName: ctx.user.name,
      organizationName: ctx.organization.name,
      roleLabel: ROLE_LABELS[input.role],
      url: invitationUrl(input.token),
      expiresInDays: INVITATION_LIFETIME_DAYS,
    }),
    { organizationId: ctx.organization.id },
  );
}

export async function inviteMember(
  ctx: TenantContext,
  input: { email: string; role: Role },
  meta: RequestMeta,
): Promise<InvitationResult> {
  requirePermission(ctx, ctx.can("members:invite"));
  requirePermission(ctx, invitableRoles(ctx.role).includes(input.role), "Vous ne pouvez pas inviter avec ce rôle.");

  const limit = await consumeRateLimit("invitationsByOrganization", ctx.organization.id);
  if (!limit.allowed) {
    throw new AppError("RATE_LIMITED", `Limite d'invitations atteinte. Réessayez dans ${formatRetryAfter(limit.retryAfterSeconds)}.`);
  }

  const token = generateToken(32);
  const invitationId = await withTenant(ctx.organization.id, async (tx) => {
    const [existingMember] = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.organizationId, ctx.organization.id), eq(users.email, input.email)))
      .limit(1);
    if (existingMember) {
      throw new AppError("CONFLICT", "Cette personne fait déjà partie de l'équipe.", {
        fieldErrors: { email: ["Cette personne fait déjà partie de l'équipe."] },
      });
    }

    // A new invitation replaces any pending one for the same email.
    await tx
      .update(invitations)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(invitations.organizationId, ctx.organization.id),
          eq(invitations.email, input.email),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
        ),
      );

    const [invitation] = await tx
      .insert(invitations)
      .values({
        organizationId: ctx.organization.id,
        email: input.email,
        role: input.role,
        tokenHash: sha256Hex(token),
        invitedByUserId: ctx.user.id,
        expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS),
      })
      .returning({ id: invitations.id });

    await recordAudit(tx, {
      organizationId: ctx.organization.id,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "member.invited",
      entityType: "invitation",
      entityId: invitation!.id,
      metadata: { role: input.role },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return invitation!.id;
  });

  const email = await deliverInvitation(ctx, { email: input.email, role: input.role, token });
  return { invitationId, email };
}

export async function resendInvitation(ctx: TenantContext, invitationId: string, meta: RequestMeta): Promise<InvitationResult> {
  requirePermission(ctx, ctx.can("members:invite"));
  const token = generateToken(32);
  const invitation = await withTenant(ctx.organization.id, async (tx) => {
    const [updated] = await tx
      .update(invitations)
      .set({ tokenHash: sha256Hex(token), expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS) })
      .where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.organizationId, ctx.organization.id),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
        ),
      )
      .returning({ id: invitations.id, email: invitations.email, role: invitations.role });
    if (!updated) throw new AppError("NOT_FOUND", "Cette invitation n'existe plus.");
    await recordAudit(tx, {
      organizationId: ctx.organization.id,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "member.invitation_resent",
      entityType: "invitation",
      entityId: updated.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return updated;
  });
  const email = await deliverInvitation(ctx, { email: invitation.email, role: invitation.role, token });
  return { invitationId: invitation.id, email };
}

export async function revokeInvitation(ctx: TenantContext, invitationId: string, meta: RequestMeta) {
  requirePermission(ctx, ctx.can("members:invite"));
  await withTenant(ctx.organization.id, async (tx) => {
    const [revoked] = await tx
      .update(invitations)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.organizationId, ctx.organization.id),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
        ),
      )
      .returning({ id: invitations.id });
    if (!revoked) throw new AppError("NOT_FOUND", "Cette invitation n'existe plus.");
    await recordAudit(tx, {
      organizationId: ctx.organization.id,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "member.invitation_revoked",
      entityType: "invitation",
      entityId: revoked.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
}

// ─── Accepting ──────────────────────────────────────────────────────────────

export type InvitationPreview =
  | {
      status: "valid";
      invitationId: string;
      organizationId: string;
      organizationName: string;
      email: string;
      role: Role;
      invitedByName: string | null;
      accountExists: boolean;
    }
  | { status: "invalid" | "expired" | "used" };

/** Looks up an invitation by its secret token (no tenant yet: system context). */
export async function getInvitationPreview(token: string, now = new Date()): Promise<InvitationPreview> {
  if (token.length < 20 || token.length > 200) return { status: "invalid" };
  return withSystem(async (tx) => {
    const [row] = await tx
      .select({
        id: invitations.id,
        organizationId: invitations.organizationId,
        organizationName: organizations.name,
        email: invitations.email,
        role: invitations.role,
        expiresAt: invitations.expiresAt,
        acceptedAt: invitations.acceptedAt,
        revokedAt: invitations.revokedAt,
        invitedByName: users.name,
      })
      .from(invitations)
      .innerJoin(organizations, eq(organizations.id, invitations.organizationId))
      .leftJoin(users, eq(users.id, invitations.invitedByUserId))
      .where(eq(invitations.tokenHash, sha256Hex(token)))
      .limit(1);
    if (!row || row.revokedAt) return { status: "invalid" };
    if (row.acceptedAt) return { status: "used" };
    if (row.expiresAt.getTime() <= now.getTime()) return { status: "expired" };
    const [account] = await tx.select({ id: users.id }).from(users).where(eq(users.email, row.email)).limit(1);
    return {
      status: "valid",
      invitationId: row.id,
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      email: row.email,
      role: row.role,
      invitedByName: row.invitedByName,
      accountExists: Boolean(account),
    };
  });
}

async function claimInvitation(tx: Transaction, token: string, now: Date) {
  const [claimed] = await tx
    .update(invitations)
    .set({ acceptedAt: now })
    .where(
      and(
        eq(invitations.tokenHash, sha256Hex(token)),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
        gt(invitations.expiresAt, now),
      ),
    )
    .returning({ id: invitations.id, organizationId: invitations.organizationId, email: invitations.email, role: invitations.role });
  if (!claimed) {
    throw new AppError("INVALID_TOKEN", "Cette invitation est invalide, a expiré ou a déjà été utilisée.");
  }
  return claimed;
}

/** A signed-in user accepts an invitation sent to their own email address. */
export async function acceptInvitationAsUser(
  token: string,
  session: { id: string; user: { id: string; email: string } },
  meta: RequestMeta,
) {
  const now = new Date();
  return withSystem(async (tx) => {
    const invitation = await claimInvitation(tx, token, now);
    if (invitation.email !== session.user.email) {
      throw new AppError(
        "FORBIDDEN",
        `Cette invitation a été envoyée à ${invitation.email}. Connectez-vous avec cette adresse pour l'accepter.`,
      );
    }
    await tx
      .insert(memberships)
      .values({ organizationId: invitation.organizationId, userId: session.user.id, role: invitation.role })
      .onConflictDoNothing({ target: [memberships.organizationId, memberships.userId] });
    await setActiveOrganization(tx, session.id, invitation.organizationId);
    await recordAudit(tx, {
      organizationId: invitation.organizationId,
      actorType: "USER",
      actorUserId: session.user.id,
      action: "member.joined",
      entityType: "invitation",
      entityId: invitation.id,
      metadata: { role: invitation.role },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return { organizationId: invitation.organizationId };
  });
}

/** A new person creates their account from an invitation (their email is proven by the link). */
export async function acceptInvitationWithNewAccount(
  input: { token: string; name: string; password: string },
  meta: RequestMeta,
) {
  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  try {
    return await withSystem(async (tx) => {
      const invitation = await claimInvitation(tx, input.token, now);
      const [user] = await tx
        .insert(users)
        .values({
          email: invitation.email,
          name: input.name,
          passwordHash,
          emailVerifiedAt: now,
          termsAcceptedAt: now,
          lastLoginAt: now,
        })
        .returning({ id: users.id });
      await tx
        .insert(memberships)
        .values({ organizationId: invitation.organizationId, userId: user!.id, role: invitation.role });
      const session = await createSession(tx, {
        userId: user!.id,
        activeOrganizationId: invitation.organizationId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      await recordAudit(tx, {
        organizationId: invitation.organizationId,
        actorType: "USER",
        actorUserId: user!.id,
        action: "member.joined",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: { role: invitation.role, newAccount: true },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      return {
        userId: user!.id,
        organizationId: invitation.organizationId,
        sessionToken: session.token,
        sessionExpiresAt: session.expiresAt,
      };
    });
  } catch (error) {
    if (isUniqueViolation(error, "users_email_unique")) {
      throw new AppError("CONFLICT", "Un compte existe déjà avec cette adresse. Connectez-vous pour accepter l'invitation.");
    }
    throw error;
  }
}

// ─── Managing members ───────────────────────────────────────────────────────

async function lockMember(tx: Transaction, organizationId: string, membershipId: string) {
  const [member] = await tx
    .select({ id: memberships.id, userId: memberships.userId, role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.id, membershipId), eq(memberships.organizationId, organizationId)))
    .for("update");
  if (!member) throw new AppError("NOT_FOUND", "Ce membre n'existe plus.");
  return member;
}

async function ownerCount(tx: Transaction, organizationId: string) {
  // Lock owner rows so two concurrent demotions cannot leave zero owners.
  const owners = await tx
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.organizationId, organizationId), eq(memberships.role, "OWNER")))
    .for("update");
  return owners.length;
}

export async function changeMemberRole(ctx: TenantContext, input: { membershipId: string; role: Role }, meta: RequestMeta) {
  requirePermission(ctx, ctx.can("members:update_role"));
  requirePermission(ctx, assignableRoles(ctx.role).includes(input.role), "Vous ne pouvez pas attribuer ce rôle.");

  await withTenant(ctx.organization.id, async (tx) => {
    const member = await lockMember(tx, ctx.organization.id, input.membershipId);
    requirePermission(ctx, canManageMember(ctx.role, member.role), "Vous ne pouvez pas modifier ce membre.");
    if (member.role === input.role) return;
    if (member.role === "OWNER" && (await ownerCount(tx, ctx.organization.id)) <= 1) {
      throw new AppError("CONFLICT", "L'établissement doit garder au moins un propriétaire.");
    }
    await tx.update(memberships).set({ role: input.role }).where(eq(memberships.id, member.id));
    await recordAudit(tx, {
      organizationId: ctx.organization.id,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "member.role_changed",
      entityType: "membership",
      entityId: member.id,
      metadata: { from: member.role, to: input.role, userId: member.userId },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
}

export async function removeMember(ctx: TenantContext, membershipId: string, meta: RequestMeta) {
  return withTenant(ctx.organization.id, async (tx) => {
    const member = await lockMember(tx, ctx.organization.id, membershipId);
    const leavingSelf = member.userId === ctx.user.id;
    if (!leavingSelf) {
      requirePermission(ctx, ctx.can("members:remove"));
      requirePermission(ctx, canManageMember(ctx.role, member.role), "Vous ne pouvez pas retirer ce membre.");
    }
    if (member.role === "OWNER" && (await ownerCount(tx, ctx.organization.id)) <= 1) {
      throw new AppError("CONFLICT", "L'établissement doit garder au moins un propriétaire.");
    }
    await tx.delete(memberships).where(eq(memberships.id, member.id));
    // Sessions of the removed person no longer point to this establishment.
    await tx
      .update(sessions)
      .set({ activeOrganizationId: null })
      .where(and(eq(sessions.userId, member.userId), eq(sessions.activeOrganizationId, ctx.organization.id)));
    await recordAudit(tx, {
      organizationId: ctx.organization.id,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: leavingSelf ? "member.left" : "member.removed",
      entityType: "membership",
      entityId: member.id,
      metadata: { userId: member.userId, role: member.role },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return { leftOrganization: leavingSelf };
  });
}

/** Number of members other than the current user (used to show empty states). */
export async function countOtherMembers(organizationId: string, userId: string) {
  const rows = await withTenant(organizationId, (tx) =>
    tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.organizationId, organizationId), ne(memberships.userId, userId))),
  );
  return rows.length;
}

/** Exposed for tests: direct read of a user's id by email. */
export async function findUserIdByEmail(email: string) {
  const [user] = await getDb().select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  return user?.id ?? null;
}
