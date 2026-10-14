import { resetDatabase, runMigrations } from "@/server/db/migrate";

/**
 * Integration tests run against a real PostgreSQL database, with a role that
 * is neither superuser nor BYPASSRLS so Row-Level Security is truly enforced.
 * The database is rebuilt from the migrations before every run.
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://sofia:sofia@localhost:5432/sofia_test";
  process.env.TEST_DATABASE_URL = url;
  await resetDatabase(url);
  await runMigrations(url);
}
