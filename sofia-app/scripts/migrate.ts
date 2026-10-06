/**
 * Applies database migrations and Row-Level Security.
 *
 *   npm run db:migrate
 *
 * Uses DATABASE_MIGRATION_URL when set, otherwise DATABASE_URL (loaded from
 * .env* like Next.js). Run it on every deploy, before the new version starts
 * serving traffic: on Vercel, the build command does it (vercel.json).
 */
import { loadEnvConfig } from "@next/env";

import { runMigrations } from "@/server/db/migrate";

loadEnvConfig(process.cwd());

async function main() {
  // A pooled address (Neon's -pooler host) is made for short application
  // queries; migrations take the direct connection when one is configured.
  const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_MIGRATION_URL or DATABASE_URL is not set");
  }
  const started = Date.now();
  await runMigrations(url);
  console.log(`✓ Migrations applied and Row-Level Security verified (${Date.now() - started} ms)`);
}

main().catch((error) => {
  console.error("✗ Migration failed:", error);
  process.exit(1);
});
