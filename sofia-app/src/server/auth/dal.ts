import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { getDb } from "@/server/db/client";
import { withTenant } from "@/server/db/context";
import { AppError } from "@/server/errors";
import { getOrganization, listUserOrganizations } from "@/server/services/organizations";

import { buildTenantContext, type TenantContext } from "./context";
import { readSessionToken } from "./cookies";
import { setActiveOrganization, validateSessionToken, type ValidatedSession } from "./sessions";

/**
 * Data Access Layer for authentication (Next.js recommended pattern).
 *
 * Pages call `requireSession()` / `requireTenant()`; server actions call
 * `getActionTenant()`. Every check reads the database: the proxy only does
 * an optimistic cookie-presence redirect. Results are memoized per request
 * with React `cache`.
 */

export const getCurrentSession = cache(async (): Promise<ValidatedSession | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  return validateSessionToken(token);
});

/** Path of the current page, forwarded by src/proxy.ts. */
async function currentPath() {
  const path = (await headers()).get("x-sofia-pathname");
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

export async function requireSession(): Promise<ValidatedSession> {
  const session = await getCurrentSession();
  if (session) return session;
  const next = encodeURIComponent(await currentPath());
  // A cookie that no longer matches a session is cleared by a route handler
  // (Server Components cannot modify cookies).
  if (await readSessionToken()) redirect(`/session-expired?next=${next}`);
  redirect(`/login?next=${next}`);
}

type TenantResolution =
  | { kind: "ok"; context: TenantContext }
  | { kind: "no-organization" }
  | { kind: "suspended"; organizationName: string };

async function resolveTenant(session: ValidatedSession): Promise<TenantResolution> {
  const organizations = await listUserOrganizations(session.userId);
  if (organizations.length === 0) return { kind: "no-organization" };

  const active =
    organizations.find((candidate) => candidate.organizationId === session.activeOrganizationId) ?? organizations[0]!;
  if (active.organizationId !== session.activeOrganizationId) {
    await setActiveOrganization(getDb(), session.id, active.organizationId);
  }
  if (active.status === "SUSPENDED") return { kind: "suspended", organizationName: active.name };

  const organization = await withTenant(active.organizationId, (tx) => getOrganization(tx, active.organizationId));
  if (!organization) return { kind: "no-organization" };

  return {
    kind: "ok",
    context: buildTenantContext({
      sessionId: session.id,
      user: session.user,
      role: active.role,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        sofiaStatus: organization.sofiaStatus,
        timezone: organization.timezone,
        defaultLanguage: organization.defaultLanguage,
        allowedLanguages: organization.allowedLanguages,
        widgetPublicId: organization.widgetPublicId,
        country: organization.country,
        currency: organization.currency,
        isDemo: organization.isDemo,
      },
    }),
  };
}

const resolveCurrentTenant = cache(async () => {
  const session = await getCurrentSession();
  if (!session) return null;
  return resolveTenant(session);
});

/** For pages: the signed-in user's active establishment, or a redirect. */
export async function requireTenant(): Promise<TenantContext> {
  await requireSession();
  const resolution = await resolveCurrentTenant();
  if (!resolution || resolution.kind === "no-organization") redirect("/no-organization");
  if (resolution.kind === "suspended") redirect("/suspended");
  return resolution.context;
}

/** For server actions: same resolution, but failures are errors shown in the form. */
export async function getActionTenant(): Promise<TenantContext> {
  const resolution = await resolveCurrentTenant();
  if (!resolution) {
    throw new AppError("UNAUTHENTICATED", "Votre session a expiré. Reconnectez-vous pour continuer.");
  }
  if (resolution.kind === "no-organization") {
    throw new AppError("FORBIDDEN", "Vous n'appartenez plus à cet établissement.");
  }
  if (resolution.kind === "suspended") {
    throw new AppError("FORBIDDEN", "Cet établissement est suspendu. Contactez BotFlow IA.");
  }
  return resolution.context;
}

export async function getActionSession(): Promise<ValidatedSession> {
  const session = await getCurrentSession();
  if (!session) {
    throw new AppError("UNAUTHENTICATED", "Votre session a expiré. Reconnectez-vous pour continuer.");
  }
  return session;
}

/** Platform admin area (BotFlow team). Unknown to everyone else: 404, not 403. */
export async function requirePlatformAdmin(): Promise<ValidatedSession> {
  const session = await requireSession();
  if (!session.user.isPlatformAdmin) notFound();
  return session;
}
