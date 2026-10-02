import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import type { Role } from "@/lib/auth/roles";
import { buildTenantContext, type TenantContext } from "@/server/auth/context";
import { hashPassword } from "@/server/auth/password";
import { signUp } from "@/server/auth/service";
import { withSystem, withTenant } from "@/server/db/context";
import { memberships, organizations, users } from "@/server/db/schema";
import { MemoryTransport, setEmailTransportForTesting } from "@/server/email";
import type { RequestMeta } from "@/server/security/request";

export const PASSWORD = "une phrase de passe solide";

/** Every email sent during the test file lands here. */
export const mailbox = new MemoryTransport();
setEmailTransportForTesting(mailbox);

/** No IP by default, so per-IP rate limits never interfere between tests. */
export const meta: RequestMeta = { ipAddress: null, userAgent: "vitest" };

export function uniqueEmail(prefix = "user") {
  return `${prefix}-${randomUUID().slice(0, 8)}@test.example`;
}

export function lastEmailTo(address: string) {
  return mailbox.sent.filter((message) => message.to === address).at(-1);
}

export function linkFrom(text: string, path: string) {
  const match = text.match(new RegExp(`http://localhost:3000${path}[^\\s]*`));
  if (!match) throw new Error(`No ${path} link in email:\n${text}`);
  return new URL(match[0]);
}

export async function tenantContextFor(userId: string, organizationId: string, sessionId = "test-session"): Promise<TenantContext> {
  return withSystem(async (tx) => {
    const [row] = await tx
      .select({
        role: memberships.role,
        user: { id: users.id, email: users.email, name: users.name, emailVerifiedAt: users.emailVerifiedAt, isPlatformAdmin: users.isPlatformAdmin, locale: users.locale },
        organization: organizations,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
      .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId)));
    if (!row) throw new Error("No membership for this user and establishment");
    return buildTenantContext({
      sessionId,
      user: row.user,
      role: row.role,
      organization: {
        id: row.organization.id,
        name: row.organization.name,
        slug: row.organization.slug,
        plan: row.organization.plan,
        sofiaStatus: row.organization.sofiaStatus,
        timezone: row.organization.timezone,
        defaultLanguage: row.organization.defaultLanguage,
        allowedLanguages: row.organization.allowedLanguages,
        widgetPublicId: row.organization.widgetPublicId,
      },
    });
  });
}

/** Signs up a new establishment through the real service and returns its owner. */
export async function createEstablishment(organizationName = "Institut Test") {
  const email = uniqueEmail("owner");
  const grant = await signUp({ name: "Propriétaire Test", email, password: PASSWORD, organizationName }, meta);
  const ctx = await tenantContextFor(grant.userId, grant.organizationId!);
  return { ...grant, organizationId: grant.organizationId!, email, ctx };
}

/** Adds a member with a given role directly (bypassing invitations). */
export async function addMember(organizationId: string, role: Role, name = "Membre Test") {
  const email = uniqueEmail(role.toLowerCase());
  const passwordHash = await hashPassword(PASSWORD);
  const userId = await withTenant(organizationId, async (tx) => {
    const [user] = await tx.insert(users).values({ email, name, passwordHash, emailVerifiedAt: new Date() }).returning({ id: users.id });
    await tx.insert(memberships).values({ organizationId, userId: user!.id, role });
    return user!.id;
  });
  const [membership] = await withTenant(organizationId, (tx) =>
    tx.select({ id: memberships.id }).from(memberships).where(eq(memberships.userId, userId)),
  );
  return { userId, email, membershipId: membership!.id, ctx: await tenantContextFor(userId, organizationId) };
}
