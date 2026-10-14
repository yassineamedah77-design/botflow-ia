/**
 * Seeds the demo establishment "Maison Éclat".
 *
 *   npm run db:seed            # creates it if missing
 *   npm run db:seed -- --reset # deletes and recreates it
 *
 * Demo accounts share SEED_DEMO_PASSWORD (required when APP_ENV=production).
 */
import { loadEnvConfig } from "@next/env";

import { closeDb } from "@/server/db/client";
import { DEMO_USERS, seedMaisonEclat } from "@/server/seed/maison-eclat";

loadEnvConfig(process.cwd());

const DEVELOPMENT_PASSWORD = "Eclat-Demo-2026";

async function main() {
  const reset = process.argv.includes("--reset");
  const production = process.env.APP_ENV === "production";
  const password = process.env.SEED_DEMO_PASSWORD ?? (production ? undefined : DEVELOPMENT_PASSWORD);
  if (!password) {
    throw new Error("Set SEED_DEMO_PASSWORD to seed the demo establishment in production.");
  }

  const result = await seedMaisonEclat({ password, reset });
  if (!result.created) {
    console.log("✓ Maison Éclat already exists (use --reset to recreate it).");
    return;
  }
  console.log("✓ Maison Éclat seeded.\n");
  if (result.activity) {
    const { leads, conversations, messages, appointments, followups, importedClients } = result.activity;
    console.log(
      `  Activity: ${leads} contacts (${importedClients} from the client file), ${conversations} conversations, ${messages} messages, ${appointments} appointments, ${followups} automated follow-ups.\n`,
    );
  }
  console.log("  Demo accounts:");
  for (const user of DEMO_USERS) {
    console.log(`  · ${user.role.padEnd(5)}  ${user.email}`);
  }
  console.log(process.env.SEED_DEMO_PASSWORD ? "\n  Password: SEED_DEMO_PASSWORD" : `\n  Password: ${password}`);
}

main()
  .catch((error) => {
    console.error("✗ Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
