import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import { and, count, eq, inArray, like } from "drizzle-orm";

import { normalizePhone } from "@/lib/phone";
import type { DemoLanguage, PreparedDemoInput } from "@/lib/validation/demo";
import { DEFAULT_WIDGET_SETTINGS } from "@/lib/widget";
import { describeAiConfiguration } from "@/server/ai/config";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/sessions";
import { getDb } from "@/server/db/client";
import { withSystem, withTenant } from "@/server/db/context";
import {
  businessHours,
  businessProfiles,
  conversations,
  integrations,
  memberships,
  organizations,
  services,
  users,
} from "@/server/db/schema";
import { env } from "@/server/env";
import { generateToken } from "@/server/security/crypto";
import type { RequestMeta } from "@/server/security/request";
import { provisionOrganization, slugify } from "@/server/services/organizations";
import { forgetWidgetEmbedding } from "@/server/widget/public";

import { isDemoMode } from "./sandbox";

/*
 * Prospect clinics prepared for a sales call, on the demo deployment only.
 * Unlike the 24-hour visitor copies, they stay until deleted: the founder
 * creates one before the call (name, hours, services and only the prices on
 * the clinic's own website), shares /d/<slug> with the manager, who writes to
 * SOFIA from her phone, and opens the clinic's dashboard to show the
 * conversation. Clínica Lumina is the standing fictional clinic.
 */

/** Accounts of prepared clinics: a reserved domain (RFC 2606), never a real mailbox. */
const PREPARED_EMAIL_DOMAIN = "cliniques.sofia-demo.example";
export const LUMINA_SLUG = "clinica-lumina";

const LANGUAGE_SETTINGS: Record<DemoLanguage, { country: string; timezone: string; assistantName: string }> = {
  pt: { country: "PT", timezone: "Europe/Lisbon", assistantName: "Sofia" },
  fr: { country: "FR", timezone: "Europe/Paris", assistantName: "SOFIA" },
};

export interface PreparedDemo {
  organizationId: string;
  name: string;
  slug: string;
  city: string | null;
  language: string;
  createdAt: Date;
  conversations: number;
}

function assertDemo() {
  if (!isDemoMode()) throw new Error("Prepared demos only exist on the demo deployment");
}

/** Creates a prospect clinic, with SOFIA active and the widget on its demo page. */
export async function createPreparedDemo(input: PreparedDemoInput, options: { slug?: string; now?: Date } = {}): Promise<{ organizationId: string; slug: string }> {
  assertDemo();
  const now = options.now ?? new Date();
  const settings = LANGUAGE_SETTINGS[input.language];
  const organizationId = randomUUID();
  const ownerEmail = `gerance-${randomBytes(5).toString("hex")}@${PREPARED_EMAIL_DOMAIN}`;
  // Nobody knows this password: the founder opens the dashboard with a session.
  const passwordHash = await hashPassword(generateToken(32));

  const slug = await withTenant(organizationId, async (tx) => {
    const [owner] = await tx
      .insert(users)
      .values({ email: ownerEmail, name: input.language === "pt" ? "Gerência" : "Gérance", passwordHash, emailVerifiedAt: now, termsAcceptedAt: now })
      .returning({ id: users.id });
    const organization = await provisionOrganization(tx, {
      organizationId,
      name: input.name,
      ownerUserId: owner!.id,
      country: settings.country,
      timezone: settings.timezone,
    });
    const slug = options.slug ?? organization.slug;
    await tx
      .update(organizations)
      .set({
        slug,
        isDemo: true,
        defaultLanguage: input.language,
        // One language only: SOFIA always answers the manager in hers (PT-PT for Portugal).
        allowedLanguages: [input.language],
        sofiaStatus: describeAiConfiguration().configured ? "ACTIVE" : "INACTIVE",
        onboardingCompletedAt: now,
      })
      .where(eq(organizations.id, organizationId));
    await tx
      .update(businessProfiles)
      .set({
        assistantName: settings.assistantName,
        addressLine: input.addressLine,
        postalCode: input.postalCode,
        city: input.city,
        country: settings.country,
        phone: input.phone ? (normalizePhone(input.phone, settings.country) ?? input.phone) : null,
      })
      .where(eq(businessProfiles.organizationId, organizationId));

    const days = [1, 2, 3, 4, 5].map((dayOfWeek) => ({ organizationId, dayOfWeek, opensAt: input.weekdayOpens, closesAt: input.weekdayCloses }));
    if (input.saturdayOpens && input.saturdayCloses) {
      days.push({ organizationId, dayOfWeek: 6, opensAt: input.saturdayOpens, closesAt: input.saturdayCloses });
    }
    await tx.insert(businessHours).values(days);

    const used = new Set<string>();
    await tx.insert(services).values(
      input.services.map((service, index) => {
        let serviceSlug = slugify(service.name) || `soin-${index + 1}`;
        if (used.has(serviceSlug)) serviceSlug = `${serviceSlug}-${index + 1}`;
        used.add(serviceSlug);
        return {
          organizationId,
          name: service.name,
          slug: serviceSlug,
          sortOrder: index,
          // No price on the clinic's website: "preço indicado em consulta", never an invented one.
          priceType: service.price === null ? ("ON_CONSULTATION" as const) : ("FIXED" as const),
          priceCents: service.price,
          durationMinutes: service.duration,
        };
      }),
    );

    const host = new URL(env().APP_URL).hostname;
    await tx
      .update(integrations)
      .set({
        config: { ...DEFAULT_WIDGET_SETTINGS, allowedDomains: [host] },
        status: "CONNECTED",
        displayName: host,
        connectedAt: now,
        lastHealthcheckAt: now,
        updatedAt: now,
      })
      .where(and(eq(integrations.organizationId, organizationId), eq(integrations.provider, "WEBSITE_WIDGET")));
    return slug;
  });
  return { organizationId, slug };
}

/** Prepared clinics, newest first, with how many conversations each received. */
export async function listPreparedDemos(): Promise<PreparedDemo[]> {
  assertDemo();
  return withSystem(async (tx) => {
    const rows = await tx
      .select({
        organizationId: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        language: organizations.defaultLanguage,
        createdAt: organizations.createdAt,
        city: businessProfiles.city,
      })
      .from(organizations)
      .innerJoin(memberships, eq(memberships.organizationId, organizations.id))
      .innerJoin(users, eq(users.id, memberships.userId))
      .leftJoin(businessProfiles, eq(businessProfiles.organizationId, organizations.id))
      .where(and(eq(organizations.isDemo, true), eq(memberships.role, "OWNER"), like(users.email, `%@${PREPARED_EMAIL_DOMAIN}`)));
    const ids = rows.map((row) => row.organizationId);
    const counts = ids.length
      ? await tx
          .select({ organizationId: conversations.organizationId, value: count() })
          .from(conversations)
          .where(inArray(conversations.organizationId, ids))
          .groupBy(conversations.organizationId)
      : [];
    return rows
      .map((row) => ({ ...row, conversations: counts.find((entry) => entry.organizationId === row.organizationId)?.value ?? 0 }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  });
}

/** A prepared clinic by the slug of its public page, or null. */
export async function findPreparedDemo(slug: string): Promise<PreparedDemo | null> {
  if (!isDemoMode()) return null;
  return (await listPreparedDemos()).find((demo) => demo.slug === slug) ?? null;
}

/** Deletes a prepared clinic and its account (not a visitor copy, not a real establishment). */
export async function deletePreparedDemo(organizationId: string): Promise<void> {
  assertDemo();
  const demo = (await listPreparedDemos()).find((candidate) => candidate.organizationId === organizationId);
  if (!demo) return;
  await withSystem(async (tx) => {
    const owners = await tx.select({ userId: memberships.userId }).from(memberships).where(eq(memberships.organizationId, organizationId));
    const [widget] = await tx.select({ publicId: organizations.widgetPublicId }).from(organizations).where(eq(organizations.id, organizationId));
    await tx.delete(organizations).where(eq(organizations.id, organizationId));
    await tx
      .delete(users)
      .where(and(inArray(users.id, owners.map((owner) => owner.userId)), like(users.email, `%@${PREPARED_EMAIL_DOMAIN}`)));
    if (widget) forgetWidgetEmbedding(widget.publicId);
  });
}

/** Signs the founder in as the clinic's manager, to show its dashboard during the call. */
export async function openPreparedDemo(organizationId: string, meta: RequestMeta) {
  assertDemo();
  const demo = (await listPreparedDemos()).find((candidate) => candidate.organizationId === organizationId);
  if (!demo) return null;
  const [owner] = await withSystem((tx) =>
    tx
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(and(eq(memberships.organizationId, organizationId), eq(memberships.role, "OWNER")))
      .limit(1),
  );
  if (!owner) return null;
  return createSession(getDb(), { userId: owner.userId, activeOrganizationId: organizationId, ipAddress: meta.ipAddress, userAgent: meta.userAgent });
}

/** The standing fictional clinic, recreated from scratch (its conversations go with it). */
export const CLINICA_LUMINA: PreparedDemoInput = {
  name: "Clínica Lumina",
  city: "Braga",
  addressLine: "Av. Central 120",
  postalCode: "4710-229",
  phone: "+351 253 000 000",
  language: "pt",
  weekdayOpens: "09:30",
  weekdayCloses: "19:00",
  saturdayOpens: "09:30",
  saturdayCloses: "13:00",
  services: [
    { name: "Limpeza de pele", price: 6_000, duration: 60 },
    { name: "Depilação a laser — axilas", price: 4_500, duration: 20 },
    { name: "Depilação a laser — pernas completas", price: 14_000, duration: 60 },
    { name: "Peeling superficial", price: 8_500, duration: 45 },
    { name: "Consulta de medicina estética", price: null, duration: 30 },
  ],
};

export async function resetClinicaLumina(): Promise<{ organizationId: string; slug: string }> {
  assertDemo();
  const existing = (await listPreparedDemos()).filter((demo) => demo.slug === LUMINA_SLUG);
  for (const demo of existing) await deletePreparedDemo(demo.organizationId);
  return createPreparedDemo(CLINICA_LUMINA, { slug: LUMINA_SLUG });
}
