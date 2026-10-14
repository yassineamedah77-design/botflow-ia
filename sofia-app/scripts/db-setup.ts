/**
 * First-time database setup for a local or self-hosted install.
 *
 *   npm run db:setup                  # role + database of DATABASE_URL, then migrations
 *   npm run db:setup -- --with-test   # also the test and end-to-end databases
 *
 * Connects with DATABASE_ADMIN_URL (a superuser such as `postgres`) to create
 * the application role taken from DATABASE_URL — LOGIN, NOSUPERUSER and
 * NOBYPASSRLS, so Row-Level Security applies to it — and the databases it owns.
 * Idempotent: existing roles and databases are kept, never altered.
 *
 * Managed PostgreSQL (Neon, Supabase, RDS…) usually provides the role and the
 * database: skip this script and run `npm run db:migrate`.
 */
import { loadEnvConfig } from "@next/env";
import { Client } from "pg";

import { runMigrations } from "@/server/db/migrate";

loadEnvConfig(process.cwd());

const DEFAULT_TEST_DATABASE_URL = "postgres://sofia:sofia@localhost:5432/sofia_test";
const DEFAULT_E2E_DATABASE_URL = "postgres://sofia:sofia@localhost:5432/sofia_e2e";

interface Target {
  user: string;
  password: string;
  database: string;
}

function parseTarget(url: string, name: string): Target {
  const parsed = new URL(url);
  const target = {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
  };
  if (!target.user || !target.password || !target.database) {
    throw new Error(`${name} must include a user, a password and a database name`);
  }
  return target;
}

/** Builds a DDL statement server-side: identifiers and literals are quoted by PostgreSQL. */
async function formatStatement(admin: Client, template: string, values: string[]) {
  const placeholders = values.map((_, index) => `$${index + 2}::text`).join(", ");
  const result = await admin.query<{ statement: string }>(`select format($1::text, ${placeholders}) as statement`, [
    template,
    ...values,
  ]);
  return result.rows[0]!.statement;
}

async function ensureRole(admin: Client, { user, password }: Target) {
  const existing = await admin.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
    "select rolsuper, rolbypassrls from pg_roles where rolname = $1",
    [user],
  );
  const role = existing.rows[0];
  if (role) {
    if (role.rolsuper || role.rolbypassrls) {
      throw new Error(
        `Role "${user}" is superuser or BYPASSRLS: Row-Level Security would not isolate establishments. Use a dedicated role.`,
      );
    }
    console.log(`· Role "${user}" already exists`);
    return;
  }
  await admin.query(
    await formatStatement(admin, "create role %I login password %L nosuperuser nobypassrls nocreatedb nocreaterole", [
      user,
      password,
    ]),
  );
  console.log(`✓ Role "${user}" created (no superuser, no BYPASSRLS)`);
}

async function ensureDatabase(admin: Client, { user, database }: Target) {
  const existing = await admin.query("select 1 from pg_database where datname = $1", [database]);
  if (existing.rowCount) {
    console.log(`· Database "${database}" already exists`);
    return;
  }
  await admin.query(await formatStatement(admin, "create database %I owner %I", [database, user]));
  console.log(`✓ Database "${database}" created (owner "${user}")`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  const adminUrl = process.env.DATABASE_ADMIN_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!adminUrl) {
    throw new Error("DATABASE_ADMIN_URL is not set (superuser connection, e.g. postgres://postgres:postgres@localhost:5432/postgres)");
  }

  const targets = [parseTarget(url, "DATABASE_URL")];
  if (process.argv.includes("--with-test")) {
    targets.push(
      parseTarget(process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL, "TEST_DATABASE_URL"),
      parseTarget(process.env.E2E_DATABASE_URL ?? DEFAULT_E2E_DATABASE_URL, "E2E_DATABASE_URL"),
    );
  }

  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    const roles = new Set<string>();
    for (const target of targets) {
      if (!roles.has(target.user)) {
        await ensureRole(admin, target);
        roles.add(target.user);
      }
      await ensureDatabase(admin, target);
    }
  } finally {
    await admin.end();
  }

  await runMigrations(url);
  console.log("✓ Migrations applied and Row-Level Security verified");
}

main().catch((error) => {
  console.error("✗ Database setup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
