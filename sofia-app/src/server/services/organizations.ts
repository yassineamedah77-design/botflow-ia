import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, count, eq } from "drizzle-orm";

import type { Role } from "@/lib/auth/roles";
import type { TenantContext } from "@/server/auth/context";
import { withSystem, withTenant, type Transaction } from "@/server/db/context";
import { AppError, isUniqueViolation } from "@/server/errors";
import {
  automations,
  businessHours,
  businessProfiles,
  integrations,
  memberships,
  organizations,
  services,
  sessions,
  type automationType,
  type integrationProvider,
} from "@/server/db/schema";
import { recordAudit } from "@/server/observability/audit";
import { generateToken } from "@/server/security/crypto";
import type { RequestMeta } from "@/server/security/request";

export type IntegrationProvider = (typeof integrationProvider.enumValues)[number];
type AutomationType = (typeof automationType.enumValues)[number];

/** Every establishment starts with all channels and calendars NOT_CONNECTED. */
export const PROVISIONED_INTEGRATIONS: IntegrationProvider[] = [
  "WHATSAPP_CLOUD",
  "INSTAGRAM_MESSAGING",
  "WEBSITE_WIDGET",
  "GOOGLE_CALENDAR",
  "CALENDLY",
];

/**
 * Default automation settings from the specification. All are disabled until
 * a channel is connected and the establishment turns them on.
 */
export const DEFAULT_AUTOMATION_CONFIG: Record<AutomationType, Record<string, unknown>> = {
  LEAD_RECOVERY: { steps: [{ delayMinutes: 120 }, { delayMinutes: 1440 }, { delayMinutes: 4320 }] },
  APPOINTMENT_REMINDER: { steps: [{ minutesBefore: 2880 }, { minutesBefore: 1440 }, { minutesBefore: 180 }] },
  NO_SHOW_RECOVERY: { steps: [{ delayMinutes: 60 }, { delayMinutes: 1440 }] },
  REACTIVATION: { inactivityDays: [60, 90, 120] },
};

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

export function generateWidgetPublicId() {
  return `sof_${generateToken(15)}`;
}

function slugCandidates(name: string) {
  const base = slugify(name) || "etablissement";
  const randomSuffix = () => generateToken(6).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "x";
  return [base, ...Array.from({ length: 5 }, () => `${base}-${randomSuffix()}`)];
}

/**
 * Slugs are unique across all establishments, which this tenant cannot read
 * (Row-Level Security). Instead of looking, try the insert inside a savepoint
 * and move to the next candidate on a slug collision.
 */
async function insertWithUniqueSlug(
  tx: Transaction,
  name: string,
  values: Omit<typeof organizations.$inferInsert, "slug" | "name">,
) {
  for (const slug of slugCandidates(name)) {
    try {
      const [organization] = await tx.transaction((savepoint) =>
        savepoint.insert(organizations).values({ ...values, name, slug }).returning(),
      );
      return organization!;
    } catch (error) {
      if (!isUniqueViolation(error, "organizations_slug_unique")) throw error;
    }
  }
  throw new Error("Could not allocate a unique organization slug");
}

/**
 * Creates an establishment and its owner membership with everything SOFIA
 * needs to start: empty business profile, integration rows in NOT_CONNECTED
 * state, disabled automations. Must run inside `withTenant(organizationId)`
 * so every insert is checked by Row-Level Security.
 */
export async function provisionOrganization(
  tx: Transaction,
  input: { organizationId: string; name: string; ownerUserId: string; country?: string; timezone?: string },
) {
  const organization = await insertWithUniqueSlug(tx, input.name, {
    id: input.organizationId,
    widgetPublicId: generateWidgetPublicId(),
    country: input.country ?? "FR",
    timezone: input.timezone ?? "Europe/Paris",
  });

  await tx.insert(businessProfiles).values({ organizationId: input.organizationId });
  await tx.insert(memberships).values({ organizationId: input.organizationId, userId: input.ownerUserId, role: "OWNER" });
  await tx
    .insert(integrations)
    .values(PROVISIONED_INTEGRATIONS.map((provider) => ({ organizationId: input.organizationId, provider })));
  await tx.insert(automations).values(
    (Object.keys(DEFAULT_AUTOMATION_CONFIG) as AutomationType[]).map((type) => ({
      organizationId: input.organizationId,
      type,
      isEnabled: false,
      config: DEFAULT_AUTOMATION_CONFIG[type],
    })),
  );

  return organization;
}

export interface UserOrganization {
  organizationId: string;
  name: string;
  slug: string;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
}

/** Establishments a user belongs to (cross-tenant by nature, hence system context). */
export async function listUserOrganizations(userId: string): Promise<UserOrganization[]> {
  return withSystem((tx) =>
    tx
      .select({
        organizationId: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        role: memberships.role,
        status: organizations.status,
      })
      .from(memberships)
      .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
      .where(eq(memberships.userId, userId))
      .orderBy(asc(memberships.createdAt)),
  );
}

export async function getOrganization(tx: Transaction, organizationId: string) {
  const [organization] = await tx.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  return organization ?? null;
}

export interface SetupChecklist {
  profile: boolean;
  services: boolean;
  hours: boolean;
  calendar: boolean;
  whatsapp: boolean;
  instagram: boolean;
  widget: boolean;
  sofiaActive: boolean;
}

/** Onboarding checklist computed from real data only: nothing is ticked by default. */
export async function getSetupChecklist(tx: Transaction, organizationId: string): Promise<SetupChecklist> {
  const [profile] = await tx
    .select({ phone: businessProfiles.phone, addressLine: businessProfiles.addressLine, city: businessProfiles.city })
    .from(businessProfiles)
    .where(eq(businessProfiles.organizationId, organizationId));
  const [serviceCount] = await tx
    .select({ value: count() })
    .from(services)
    .where(and(eq(services.organizationId, organizationId), eq(services.isActive, true)));
  const [hoursCount] = await tx
    .select({ value: count() })
    .from(businessHours)
    .where(eq(businessHours.organizationId, organizationId));
  const connections = await tx
    .select({ provider: integrations.provider, status: integrations.status })
    .from(integrations)
    .where(eq(integrations.organizationId, organizationId));
  const [organization] = await tx
    .select({ sofiaStatus: organizations.sofiaStatus })
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  const connected = (provider: IntegrationProvider) =>
    connections.some((connection) => connection.provider === provider && connection.status === "CONNECTED");

  return {
    profile: Boolean(profile?.phone && profile.addressLine && profile.city),
    services: (serviceCount?.value ?? 0) > 0,
    hours: (hoursCount?.value ?? 0) > 0,
    calendar: connected("GOOGLE_CALENDAR") || connected("CALENDLY"),
    whatsapp: connected("WHATSAPP_CLOUD"),
    instagram: connected("INSTAGRAM_MESSAGING"),
    widget: connected("WEBSITE_WIDGET"),
    sofiaActive: organization?.sofiaStatus === "ACTIVE",
  };
}

export async function updateOrganizationSettings(
  ctx: TenantContext,
  input: { name: string; timezone: string; defaultLanguage: string; allowedLanguages: string[] },
  meta: RequestMeta,
) {
  if (!ctx.can("org:update")) {
    throw new AppError("FORBIDDEN", "Seuls les propriétaires et administrateurs peuvent modifier ces réglages.");
  }
  await withTenant(ctx.organization.id, async (tx) => {
    await tx
      .update(organizations)
      .set({
        name: input.name,
        timezone: input.timezone,
        defaultLanguage: input.defaultLanguage,
        allowedLanguages: input.allowedLanguages,
      })
      .where(eq(organizations.id, ctx.organization.id));
    await recordAudit(tx, {
      organizationId: ctx.organization.id,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "organization.settings_updated",
      entityType: "organization",
      entityId: ctx.organization.id,
      metadata: {
        timezone: input.timezone,
        defaultLanguage: input.defaultLanguage,
        allowedLanguages: input.allowedLanguages,
        renamed: input.name !== ctx.organization.name,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
}

/** A signed-in person without any establishment creates one and becomes its owner. */
export async function createOrganizationForUser(
  session: { id: string; userId: string },
  input: { organizationName: string },
  meta: RequestMeta,
  options: { signupEnabled: boolean },
) {
  if (!options.signupEnabled) {
    throw new AppError("FORBIDDEN", "La création d'établissement est fermée. Demandez une invitation à votre équipe.");
  }
  // Additional establishments for an existing member are a billing decision
  // (Phase 10); for now this only covers accounts left without any.
  if ((await listUserOrganizations(session.userId)).length > 0) {
    throw new AppError("FORBIDDEN", "Vous appartenez déjà à un établissement.");
  }
  const organizationId = randomUUID();
  await withTenant(organizationId, async (tx) => {
    await provisionOrganization(tx, { organizationId, name: input.organizationName, ownerUserId: session.userId });
    await tx.update(sessions).set({ activeOrganizationId: organizationId }).where(eq(sessions.id, session.id));
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: session.userId,
      action: "organization.created",
      entityType: "organization",
      entityId: organizationId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
  return organizationId;
}

/** Points the session at another establishment the user belongs to. */
export async function switchActiveOrganization(session: { id: string; userId: string }, organizationId: string) {
  const memberships = await listUserOrganizations(session.userId);
  if (!memberships.some((membership) => membership.organizationId === organizationId)) {
    throw new AppError("FORBIDDEN", "Vous n'appartenez pas à cet établissement.");
  }
  await withSystem((tx) =>
    tx.update(sessions).set({ activeOrganizationId: organizationId }).where(eq(sessions.id, session.id)),
  );
}

export async function listIntegrations(tx: Transaction, organizationId: string) {
  return tx
    .select({
      provider: integrations.provider,
      status: integrations.status,
      displayName: integrations.displayName,
      lastError: integrations.lastError,
      lastErrorAt: integrations.lastErrorAt,
      connectedAt: integrations.connectedAt,
    })
    .from(integrations)
    .where(eq(integrations.organizationId, organizationId));
}
