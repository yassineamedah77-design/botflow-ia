/**
 * Rebuilds the end-to-end database: schema from migrations, Row-Level
 * Security, and the Maison Éclat demo establishment. Called by the Playwright
 * web server command before the app starts. Only *_e2e / *_test databases.
 */
import { rm } from "node:fs/promises";
import path from "node:path";

import { closeDb } from "@/server/db/client";
import { resetDatabase, runMigrations } from "@/server/db/migrate";
import { seedMaisonEclat } from "@/server/seed/maison-eclat";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  await resetDatabase(url);
  await runMigrations(url);
  await seedMaisonEclat({ password: process.env.SEED_DEMO_PASSWORD ?? "Eclat-Demo-2026" });
  if (process.env.EMAIL_OUTBOX_DIR) {
    await rm(path.resolve(process.env.EMAIL_OUTBOX_DIR), { recursive: true, force: true });
  }
  console.log("✓ E2E database ready");
}

main()
  .catch((error) => {
    console.error("✗ E2E preparation failed:", error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
