import "server-only";

import path from "node:path";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { createDatabase } from "./client";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export class UnprotectedTablesError extends Error {
  constructor(readonly tables: string[]) {
    super(`Row-Level Security is missing on tenant tables: ${tables.join(", ")}`);
    this.name = "UnprotectedTablesError";
  }
}

/**
 * Applies pending migrations, then (re)applies Row-Level Security to every
 * tenant table and refuses to finish if one is left unprotected.
 */
export async function runMigrations(connectionString: string, migrationsFolder = MIGRATIONS_FOLDER) {
  const { db, pool } = createDatabase(connectionString, { max: 1 });
  try {
    await migrate(db, { migrationsFolder });
    await db.execute(sql`select app_ensure_tenant_rls()`);
    const result = await db.execute<{ table_name: string }>(
      sql`select table_name from app_unprotected_tenant_tables()`,
    );
    const unprotected = result.rows.map((row) => row.table_name);
    if (unprotected.length > 0) {
      throw new UnprotectedTablesError(unprotected);
    }
  } finally {
    await pool.end();
  }
}

/**
 * Drops every object of the database (tests and E2E only). Refuses any
 * database whose name does not end with `_test` or `_e2e`, so a wrong
 * environment variable can never wipe real data.
 */
export async function resetDatabase(connectionString: string) {
  const databaseName = new URL(connectionString).pathname.replace(/^\//, "");
  if (!/_(test|e2e)$/.test(databaseName)) {
    throw new Error(`Refusing to reset database "${databaseName}": only *_test and *_e2e databases can be reset.`);
  }
  const { db, pool } = createDatabase(connectionString, { max: 1 });
  try {
    await db.execute(sql.raw("DROP SCHEMA IF EXISTS drizzle CASCADE"));
    await db.execute(sql.raw("DROP SCHEMA IF EXISTS public CASCADE"));
    await db.execute(sql.raw("CREATE SCHEMA public"));
  } finally {
    await pool.end();
  }
}
