import { randomBytes } from "node:crypto";

import { afterAll } from "vitest";

// Deterministic configuration for every integration test file (no .env files).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://sofia:sofia@localhost:5432/sofia_test";
process.env.APP_URL = "http://localhost:3000";
process.env.APP_ENV = "test";
process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.EMAIL_TRANSPORT = "console";
process.env.SIGNUP_ENABLED = "true";
process.env.TRUST_PROXY = "true";
process.env.LOG_LEVEL = "error";

afterAll(async () => {
  const { closeDb } = await import("@/server/db/client");
  await closeDb();
});
