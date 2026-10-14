import "server-only";

import { and, asc, eq, like, max, or } from "drizzle-orm";

import { formatPhone, normalizePhone } from "@/lib/phone";
import type { BusinessHoursInput, EstablishmentInput, ServiceInput } from "@/lib/validation/knowledge";
import type { TenantContext } from "@/server/auth/context";
import { withTenant, type Transaction } from "@/server/db/context";
import { businessHours, businessProfiles, services } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { recordAudit } from "@/server/observability/audit";
import type { RequestMeta } from "@/server/security/request";

import { requirePermission } from "./guards";

/*
 * Onboarding writes (specification §15): the establishment profile, its
 * services and its opening hours — exactly what SOFIA may tell customers.
 * Owners and admins only.
 */

const FORBIDDEN = "Seuls les propriétaires et administrateurs peuvent modifier ces informations.";

export type EstablishmentProfile = typeof businessProfiles.$inferSelect;

export async function getEstablishmentProfile(tx: Transaction, organizationId: string): Promise<EstablishmentProfile | null> {
  const [profile] = await tx.select().from(businessProfiles).where(eq(businessProfiles.organizationId, organizationId)).limit(1);
  return profile ?? null;
}

export async function saveEstablishmentProfile(ctx: TenantContext, input: EstablishmentInput, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  const phone = normalizePhone(input.phone, ctx.organization.country);
  if (!phone) {
    throw new AppError("VALIDATION", "Vérifiez les champs indiqués.", {
      fieldErrors: { phone: ["Numéro invalide. Pour un numéro étranger, ajoutez l'indicatif (ex. +351 …)."] },
    });
  }
  const values = { ...input, phone: formatPhone(phone), country: ctx.organization.country };
  await withTenant(ctx.organization.id, async (tx) => {
    await tx
      .insert(businessProfiles)
      .values({ organizationId: ctx.organization.id, ...values })
      .onConflictDoUpdate({ target: businessProfiles.organizationId, set: { ...values, updatedAt: new Date() } });
    await recordAudit(tx, {
      organizationId: ctx.organization.id,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "knowledge.profile_updated",
      entityType: "business_profile",
      entityId: ctx.organization.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
}

// ─── Services ───────────────────────────────────────────────────────────────

export type SetupService = Pick<
  typeof services.$inferSelect,
  "id" | "name" | "category" | "description" | "priceType" | "priceCents" | "durationMinutes" | "preparation" | "contraindications" | "requiresConsultation"
>;

export async function listActiveServices(tx: Transaction, organizationId: string): Promise<SetupService[]> {
  return tx
    .select({
      id: services.id,
      name: services.name,
      category: services.category,
      description: services.description,
      priceType: services.priceType,
      priceCents: services.priceCents,
      durationMinutes: services.durationMinutes,
      preparation: services.preparation,
      contraindications: services.contraindications,
      requiresConsultation: services.requiresConsultation,
    })
    .from(services)
    .where(and(eq(services.organizationId, organizationId), eq(services.isActive, true)))
    .orderBy(asc(services.sortOrder), asc(services.name));
}

/** "Soin visage Éclat" → "soin-visage-eclat". */
export function slugify(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "prestation"
  );
}

/** The slug identifies a service for SOFIA's tools: unique per establishment, archived ones included. */
async function uniqueSlug(tx: Transaction, organizationId: string, name: string) {
  const base = slugify(name);
  const taken = new Set(
    (
      await tx
        .select({ slug: services.slug })
        .from(services)
        .where(and(eq(services.organizationId, organizationId), or(eq(services.slug, base), like(services.slug, `${base}-%`))))
    ).map((row) => row.slug),
  );
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix++) {
    if (!taken.has(`${base}-${suffix}`)) return `${base}-${suffix}`;
  }
}

async function findService(tx: Transaction, organizationId: string, serviceId: string) {
  const [service] = await tx
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.organizationId, organizationId), eq(services.isActive, true)))
    .limit(1);
  if (!service) throw new AppError("NOT_FOUND", "Cette prestation n'existe plus.");
  return service;
}

export async function createService(ctx: TenantContext, input: ServiceInput, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  return withTenant(ctx.organization.id, async (tx) => {
    const [order] = await tx.select({ value: max(services.sortOrder) }).from(services).where(eq(services.organizationId, ctx.organization.id));
    const [created] = await tx
      .insert(services)
      .values({
        organizationId: ctx.organization.id,
        slug: await uniqueSlug(tx, ctx.organization.id, input.name),
        sortOrder: (order?.value ?? 0) + 1,
        ...input,
      })
      .returning({ id: services.id });
    await recordAudit(tx, {
      organizationId: ctx.organization.id,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "knowledge.service_created",
      entityType: "service",
      entityId: created!.id,
      metadata: { name: input.name, priceType: input.priceType, priceCents: input.priceCents },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return created!.id;
  });
}

export async function updateService(ctx: TenantContext, serviceId: string, input: ServiceInput, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  await withTenant(ctx.organization.id, async (tx) => {
    await findService(tx, ctx.organization.id, serviceId);
    // The slug stays: SOFIA's history and tools keep referring to the same service.
    await tx
      .update(services)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(services.id, serviceId), eq(services.organizationId, ctx.organization.id)));
    await recordAudit(tx, {
      organizationId: ctx.organization.id,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "knowledge.service_updated",
      entityType: "service",
      entityId: serviceId,
      metadata: { name: input.name, priceType: input.priceType, priceCents: input.priceCents },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
}

/** Archived rather than deleted: past appointments and leads keep their service. */
export async function archiveService(ctx: TenantContext, serviceId: string, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  return withTenant(ctx.organization.id, async (tx) => {
    const service = await findService(tx, ctx.organization.id, serviceId);
    await tx
      .update(services)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(services.id, serviceId), eq(services.organizationId, ctx.organization.id)));
    await recordAudit(tx, {
      organizationId: ctx.organization.id,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "knowledge.service_archived",
      entityType: "service",
      entityId: serviceId,
      metadata: { name: service.name },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return service.name;
  });
}

// ─── Opening hours ──────────────────────────────────────────────────────────

export interface OpeningRange {
  day: number;
  opensAt: string;
  closesAt: string;
}

export async function listOpeningHours(tx: Transaction, organizationId: string): Promise<OpeningRange[]> {
  const rows = await tx
    .select({ day: businessHours.dayOfWeek, opensAt: businessHours.opensAt, closesAt: businessHours.closesAt })
    .from(businessHours)
    .where(eq(businessHours.organizationId, organizationId))
    .orderBy(asc(businessHours.dayOfWeek), asc(businessHours.opensAt));
  // "09:00:00" → "09:00"
  return rows.map((row) => ({ day: row.day, opensAt: row.opensAt.slice(0, 5), closesAt: row.closesAt.slice(0, 5) }));
}

/** Replaces the whole week: what is saved is exactly what the editor showed. */
export async function saveOpeningHours(ctx: TenantContext, ranges: BusinessHoursInput, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  await withTenant(ctx.organization.id, async (tx) => {
    await tx.delete(businessHours).where(eq(businessHours.organizationId, ctx.organization.id));
    if (ranges.length > 0) {
      await tx.insert(businessHours).values(
        ranges.map((range) => ({ organizationId: ctx.organization.id, dayOfWeek: range.day, opensAt: range.opensAt, closesAt: range.closesAt })),
      );
    }
    await recordAudit(tx, {
      organizationId: ctx.organization.id,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "knowledge.hours_updated",
      entityType: "business_hours",
      entityId: ctx.organization.id,
      metadata: { ranges: ranges.length, openDays: new Set(ranges.map((range) => range.day)).size },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
}
