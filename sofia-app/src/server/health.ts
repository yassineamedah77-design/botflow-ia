import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { env } from "@/server/env";

export interface HealthReport {
  status: "ok" | "degraded" | "down";
  checks: {
    database: { ok: boolean; latencyMs?: number; error?: string };
    rowLevelSecurity: { ok: boolean; enforced?: boolean; unprotectedTables?: string[]; error?: string };
    email: { ok: boolean; transport: string };
  };
}

/**
 * Operational checks shared by /api/health and the startup log. A database
 * role that bypasses Row-Level Security (superuser or BYPASSRLS) is reported
 * as degraded: the app works, but tenant isolation then relies on the
 * application layer alone.
 */
export async function runHealthChecks(): Promise<HealthReport> {
  const config = env();
  const report: HealthReport = {
    status: "ok",
    checks: {
      database: { ok: false },
      rowLevelSecurity: { ok: false },
      email: { ok: config.EMAIL_TRANSPORT === "smtp" || config.APP_ENV !== "production", transport: config.EMAIL_TRANSPORT },
    },
  };

  const db = getDb();
  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    report.checks.database = { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    report.checks.database = { ok: false, error: error instanceof Error ? error.message : String(error) };
    report.status = "down";
    return report;
  }

  try {
    const role = await db.execute<{ rolsuper: boolean; rolbypassrls: boolean }>(
      sql`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`,
    );
    const unprotected = await db.execute<{ table_name: string }>(sql`select table_name from app_unprotected_tenant_tables()`);
    const enforced = !role.rows[0]?.rolsuper && !role.rows[0]?.rolbypassrls;
    const unprotectedTables = unprotected.rows.map((row) => row.table_name);
    report.checks.rowLevelSecurity = {
      ok: enforced && unprotectedTables.length === 0,
      enforced,
      unprotectedTables,
    };
  } catch (error) {
    report.checks.rowLevelSecurity = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  if (!report.checks.rowLevelSecurity.ok || !report.checks.email.ok) {
    report.status = "degraded";
  }
  return report;
}
