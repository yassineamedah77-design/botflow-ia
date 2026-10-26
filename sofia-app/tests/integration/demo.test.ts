import { and, eq, inArray } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readWidgetSettings } from "@/lib/widget";
import { validateSessionToken } from "@/server/auth/sessions";
import { withSystem, withTenant } from "@/server/db/context";
import { integrations, leads, memberships, organizations, services, users } from "@/server/db/schema";
import { resetEnvCache } from "@/server/env";
import {
  createPreparedDemo,
  deletePreparedDemo,
  findPreparedDemo,
  listPreparedDemos,
  LUMINA_SLUG,
  openPreparedDemo,
  resetClinicaLumina,
} from "@/server/demo/prepared";
import { consumeDemoAiBudget, createDemoSandbox, deleteExpiredSandboxes, DemoUnavailableError, SANDBOX_TTL_MS } from "@/server/demo/sandbox";
import { resetRateLimit } from "@/server/security/rate-limit";

import { createEstablishment } from "./helpers";

/*
 * The public prospect demo: every visitor gets a private, fully populated
 * copy of Maison Éclat, signed in as its owner, deleted after 24 hours.
 */

function demoMode(on: boolean) {
  if (on) {
    process.env.DEMO_MODE = "true";
    process.env.SIGNUP_ENABLED = "false";
  } else {
    delete process.env.DEMO_MODE;
    delete process.env.SIGNUP_ENABLED;
  }
  resetEnvCache();
}

const visitor = (ip: string) => ({ ipAddress: ip, userAgent: "vitest-prospect" });

describe("public demo", () => {
  beforeEach(async () => {
    demoMode(true);
    await resetRateLimit("demoSandboxesTotal", "all");
  });
  afterEach(() => demoMode(false));

  it("gives each visitor a private, populated copy, signed in as its owner", async () => {
    const first = await createDemoSandbox(visitor("198.51.100.10"));
    const second = await createDemoSandbox(visitor("198.51.100.11"));
    expect(first.organizationId).not.toBe(second.organizationId);

    const session = await validateSessionToken(first.token);
    expect(session).toMatchObject({ activeOrganizationId: first.organizationId });
    expect(session!.user.email).toMatch(/^camille-[0-9a-f]{10}@visite\.maison-eclat\.example$/);

    const copy = await withTenant(first.organizationId, async (tx) => ({
      organization: (await tx.select().from(organizations).where(eq(organizations.id, first.organizationId)))[0]!,
      team: await tx.select({ role: memberships.role }).from(memberships).where(eq(memberships.organizationId, first.organizationId)),
      widget: (
        await tx
          .select()
          .from(integrations)
          .where(and(eq(integrations.organizationId, first.organizationId), eq(integrations.provider, "WEBSITE_WIDGET")))
      )[0]!,
      leads: await tx.select({ id: leads.id }).from(leads).where(eq(leads.organizationId, first.organizationId)),
    }));
    expect(copy.organization).toMatchObject({ name: "Maison Éclat", isDemo: true });
    expect(copy.team.map((member) => member.role).sort()).toEqual(["ADMIN", "OWNER", "STAFF"]);
    // Three months of activity, and the widget already installed on the demo's own website.
    expect(copy.leads.length).toBeGreaterThan(50);
    expect(copy.widget).toMatchObject({ status: "CONNECTED", displayName: "localhost" });
    expect(readWidgetSettings(copy.widget.config)).toMatchObject({ enabled: true, allowedDomains: ["localhost"] });
  });

  it("limits how many copies one visitor can create in a day", async () => {
    const ip = "198.51.100.20";
    await resetRateLimit("demoSandboxesByIp", ip);
    for (let index = 0; index < 3; index++) await createDemoSandbox(visitor(ip));
    const refused = await createDemoSandbox(visitor(ip)).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(DemoUnavailableError);
    expect(refused).toMatchObject({ reason: "rate_limited" });
  });

  it("deletes copies and their accounts after 24 hours, and only those", async () => {
    const old = await createDemoSandbox(visitor("198.51.100.30"));
    const fresh = await createDemoSandbox(visitor("198.51.100.31"));
    const oldSession = await validateSessionToken(old.token);
    // Created as on the production app: signup is closed in the demo.
    demoMode(false);
    const real = await createEstablishment("Institut Bien Réel");
    demoMode(true);
    const backdated = new Date(Date.now() - SANDBOX_TTL_MS - 60_000);
    await withSystem(async (tx) => {
      await tx.update(organizations).set({ createdAt: backdated }).where(eq(organizations.id, real.organizationId));
      await tx.update(users).set({ createdAt: backdated }).where(eq(users.id, real.ctx.user.id));
      await tx.update(organizations).set({ createdAt: backdated }).where(eq(organizations.id, old.organizationId));
      const team = await tx.select({ userId: memberships.userId }).from(memberships).where(eq(memberships.organizationId, old.organizationId));
      await tx.update(users).set({ createdAt: backdated }).where(inArray(users.id, team.map((member) => member.userId)));
    });

    expect(await deleteExpiredSandboxes()).toBeGreaterThanOrEqual(1);
    const remaining = await withSystem((tx) =>
      tx.select({ id: organizations.id }).from(organizations).where(inArray(organizations.id, [old.organizationId, fresh.organizationId])),
    );
    expect(remaining.map((row) => row.id)).toEqual([fresh.organizationId]);
    expect(await validateSessionToken(old.token)).toBeNull();
    expect(await withSystem((tx) => tx.select().from(users).where(eq(users.id, oldSession!.userId)))).toEqual([]);
    expect(await validateSessionToken(fresh.token)).not.toBeNull();
    // A real establishment and its account, however old, are never touched.
    expect(await withSystem((tx) => tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, real.organizationId)))).toHaveLength(1);
    expect(await withSystem((tx) => tx.select({ id: users.id }).from(users).where(eq(users.id, real.ctx.user.id)))).toHaveLength(1);
  });

  it("does not exist outside the demo deployment", async () => {
    demoMode(false);
    const refused = await createDemoSandbox(visitor("198.51.100.40")).catch((error: unknown) => error);
    expect(refused).toMatchObject({ reason: "disabled" });
    // And the demo's own AI ceiling never applies to real establishments.
    expect(await consumeDemoAiBudget()).toBe(true);
  });
});

describe("prospect clinics prepared for sales calls", () => {
  beforeEach(() => demoMode(true));
  afterEach(() => demoMode(false));

  const sorriso = {
    name: "Clínica Sorriso",
    city: "Porto",
    addressLine: "Rua de Santa Catarina 210",
    postalCode: "4000-442",
    phone: "22 000 0000",
    language: "pt" as const,
    weekdayOpens: "09:30",
    weekdayCloses: "19:00",
    saturdayOpens: null,
    saturdayCloses: null,
    services: [
      { name: "Limpeza de pele", price: 6_000, duration: 60 },
      { name: "Consulta de medicina estética", price: null, duration: null },
    ],
  };

  it("sets up a clinic SOFIA answers for in Portuguese, with only the prices given", async () => {
    const created = await createPreparedDemo(sorriso);
    expect(created.slug).toMatch(/^clinica-sorriso/);
    const found = await findPreparedDemo(created.slug);
    expect(found).toMatchObject({ name: "Clínica Sorriso", city: "Porto", language: "pt", conversations: 0 });

    const clinic = await withTenant(created.organizationId, async (tx) => ({
      organization: (await tx.select().from(organizations).where(eq(organizations.id, created.organizationId)))[0]!,
      services: await tx.select().from(services).where(eq(services.organizationId, created.organizationId)),
      widget: (
        await tx
          .select()
          .from(integrations)
          .where(and(eq(integrations.organizationId, created.organizationId), eq(integrations.provider, "WEBSITE_WIDGET")))
      )[0]!,
    }));
    expect(clinic.organization).toMatchObject({ isDemo: true, defaultLanguage: "pt", allowedLanguages: ["pt"], timezone: "Europe/Lisbon", country: "PT" });
    const byName = Object.fromEntries(clinic.services.map((service) => [service.name, service]));
    expect(byName["Limpeza de pele"]).toMatchObject({ priceType: "FIXED", priceCents: 6_000 });
    // No price on the website: on consultation, never an invented one.
    expect(byName["Consulta de medicina estética"]).toMatchObject({ priceType: "ON_CONSULTATION", priceCents: null });
    expect(clinic.widget).toMatchObject({ status: "CONNECTED" });

    // The founder opens its dashboard as the manager.
    const session = await openPreparedDemo(created.organizationId, visitor("198.51.100.50"));
    expect(await validateSessionToken(session!.token)).toMatchObject({ activeOrganizationId: created.organizationId });
  });

  it("keeps prepared clinics past 24 hours, and deletes only what it is asked to", async () => {
    const kept = await createPreparedDemo({ ...sorriso, name: "Clínica Duradoura" });
    await withSystem((tx) => tx.update(organizations).set({ createdAt: new Date(Date.now() - 3 * SANDBOX_TTL_MS) }).where(eq(organizations.id, kept.organizationId)));
    await deleteExpiredSandboxes();
    expect(await findPreparedDemo(kept.slug)).not.toBeNull();

    // A visitor copy is not a prepared clinic: deleting it by this path does nothing.
    const copy = await createDemoSandbox(visitor("198.51.100.51"));
    await deletePreparedDemo(copy.organizationId);
    expect(await withSystem((tx) => tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, copy.organizationId)))).toHaveLength(1);

    await deletePreparedDemo(kept.organizationId);
    expect(await findPreparedDemo(kept.slug)).toBeNull();
  });

  it("recreates Clínica Lumina from scratch, at the same address", async () => {
    const first = await resetClinicaLumina();
    const second = await resetClinicaLumina();
    expect(first.slug).toBe(LUMINA_SLUG);
    expect(second.slug).toBe(LUMINA_SLUG);
    expect(second.organizationId).not.toBe(first.organizationId);
    expect((await listPreparedDemos()).filter((demo) => demo.slug === LUMINA_SLUG)).toHaveLength(1);
  });

  it("does not exist outside the demo deployment", async () => {
    demoMode(false);
    expect(await findPreparedDemo(LUMINA_SLUG)).toBeNull();
    await expect(createPreparedDemo(sorriso)).rejects.toThrow();
  });
});
