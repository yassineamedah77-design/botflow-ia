import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { createDatabase, getDb } from "@/server/db/client";
import { withSystem, withTenant } from "@/server/db/context";
import { auditLogs, integrations, leads, organizations, services } from "@/server/db/schema";

import { createEstablishment } from "./helpers";

/**
 * The core multi-tenant guarantee: an establishment can never read or write
 * another establishment's data, even through a query that forgets to filter
 * by organization. These tests deliberately issue unfiltered queries.
 */
describe("tenant isolation (PostgreSQL Row-Level Security)", () => {
  let a: Awaited<ReturnType<typeof createEstablishment>>;
  let b: Awaited<ReturnType<typeof createEstablishment>>;
  let serviceA: string;
  let serviceB: string;

  beforeAll(async () => {
    a = await createEstablishment("Institut Alpha");
    b = await createEstablishment("Clinique Bêta");
    [serviceA, serviceB] = await Promise.all([
      withTenant(a.organizationId, async (tx) => {
        const [row] = await tx.insert(services).values({ organizationId: a.organizationId, name: "Soin Alpha", slug: "soin-alpha", priceCents: 9000 }).returning({ id: services.id });
        return row!.id;
      }),
      withTenant(b.organizationId, async (tx) => {
        const [row] = await tx.insert(services).values({ organizationId: b.organizationId, name: "Soin Bêta", slug: "soin-beta", priceCents: 12000 }).returning({ id: services.id });
        return row!.id;
      }),
    ]);
  });

  it("runs as a role that cannot bypass Row-Level Security", async () => {
    const result = await getDb().execute<{ rolsuper: boolean; rolbypassrls: boolean }>(
      sql`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`,
    );
    expect(result.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
  });

  it("protects every table that holds establishment data", async () => {
    const unprotected = await getDb().execute(sql`select table_name from app_unprotected_tenant_tables()`);
    expect(unprotected.rows).toEqual([]);

    const tenantTables = await getDb().execute<{ relname: string }>(sql`
      select c.relname from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity and c.relforcerowsecurity
    `);
    const names = tenantTables.rows.map((row) => row.relname);
    for (const table of [
      "organizations",
      "leads",
      "conversations",
      "messages",
      "appointments",
      "services",
      "revenue_attributions",
      "audit_logs",
      "memberships",
      "invitations",
      "contact_imports",
      "notifications",
      "followups",
      "campaign_recipients",
      "business_profiles",
      "business_hours",
    ]) {
      expect(names).toContain(table);
    }
    expect(names.length).toBeGreaterThanOrEqual(25);
  });

  it("only returns the current establishment's rows, even without a WHERE clause", async () => {
    const seenByA = await withTenant(a.organizationId, (tx) => tx.select({ id: services.id, organizationId: services.organizationId }).from(services));
    expect(seenByA.map((row) => row.id)).toContain(serviceA);
    expect(seenByA.map((row) => row.id)).not.toContain(serviceB);
    expect(new Set(seenByA.map((row) => row.organizationId))).toEqual(new Set([a.organizationId]));

    const orgsSeenByB = await withTenant(b.organizationId, (tx) => tx.select({ id: organizations.id }).from(organizations));
    expect(orgsSeenByB).toEqual([{ id: b.organizationId }]);

    const integrationsSeenByB = await withTenant(b.organizationId, (tx) => tx.select({ organizationId: integrations.organizationId }).from(integrations));
    expect(integrationsSeenByB.length).toBe(5);
    expect(integrationsSeenByB.every((row) => row.organizationId === b.organizationId)).toBe(true);
  });

  it("cannot update or delete another establishment's rows", async () => {
    const updated = await withTenant(a.organizationId, (tx) =>
      tx.update(services).set({ name: "Piraté" }).where(eq(services.id, serviceB)).returning({ id: services.id }),
    );
    expect(updated).toEqual([]);
    const deleted = await withTenant(a.organizationId, (tx) => tx.delete(services).where(eq(services.id, serviceB)).returning({ id: services.id }));
    expect(deleted).toEqual([]);

    const [stillThere] = await withTenant(b.organizationId, (tx) => tx.select({ name: services.name }).from(services).where(eq(services.id, serviceB)));
    expect(stillThere?.name).toBe("Soin Bêta");
  });

  it("refuses to insert data into another establishment", async () => {
    await expect(
      withTenant(a.organizationId, (tx) => tx.insert(leads).values({ organizationId: b.organizationId, firstName: "Intrus" })),
    ).rejects.toThrow();
    await expect(
      withTenant(a.organizationId, (tx) =>
        tx.insert(auditLogs).values({ organizationId: b.organizationId, actorType: "USER", action: "test.forged" }),
      ),
    ).rejects.toThrow();
  });

  it("refuses to move a row to another establishment", async () => {
    await expect(
      withTenant(a.organizationId, (tx) => tx.update(services).set({ organizationId: b.organizationId }).where(eq(services.id, serviceA))),
    ).rejects.toThrow();
  });

  it("fails closed outside any tenant context", async () => {
    const rows = await getDb().select({ id: services.id }).from(services);
    expect(rows).toEqual([]);
    await expect(getDb().insert(leads).values({ organizationId: a.organizationId, firstName: "Sans contexte" })).rejects.toThrow();
  });

  it("does not leak the tenant setting to the next transaction on the same connection", async () => {
    // A single-connection pool guarantees both statements share one session.
    const single = createDatabase(process.env.DATABASE_URL!, { max: 1 });
    try {
      await withTenant(a.organizationId, (tx) => tx.select().from(services), single.db);
      const outside = await single.db.execute<{ org: string | null; bypass: string | null }>(
        sql`select nullif(current_setting('app.current_org_id', true), '') as org, nullif(current_setting('app.bypass_rls', true), '') as bypass`,
      );
      expect(outside.rows[0]).toEqual({ org: null, bypass: null });
      expect(await single.db.select({ id: services.id }).from(services)).toEqual([]);
    } finally {
      await single.pool.end();
    }
  });

  it("gives system context a cross-establishment view for platform tasks", async () => {
    const all = await withSystem((tx) => tx.select({ id: services.id }).from(services));
    const ids = all.map((row) => row.id);
    expect(ids).toContain(serviceA);
    expect(ids).toContain(serviceB);
  });

  it("rejects a malformed establishment id before reaching the database", async () => {
    await expect(withTenant("' OR 1=1 --", async () => null)).rejects.toThrow(/valid organization id/);
  });
});
