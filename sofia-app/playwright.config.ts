import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a production build, a dedicated PostgreSQL
 * database (rebuilt and seeded before the server starts) and the file email
 * transport, whose messages the tests read to follow real links.
 */

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;

export const E2E_OUTBOX_DIR = ".mail-outbox/e2e";

const serverEnv = {
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://sofia:sofia@localhost:5432/sofia_e2e",
  APP_URL: BASE_URL,
  APP_ENV: "test",
  EMAIL_TRANSPORT: "file",
  EMAIL_OUTBOX_DIR: E2E_OUTBOX_DIR,
  // Test-only key (32 zero-padded bytes); never used outside the E2E database.
  ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  SIGNUP_ENABLED: "true",
  TRUST_PROXY: "false",
  LOG_LEVEL: "warn",
  SHOW_DESIGN_SYSTEM: "true",
};

const prepare = "tsx --conditions=react-server scripts/e2e-prepare.ts";
const start = `npx next start -p ${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /responsive\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? `${prepare} && ${start}` : `${prepare} && npm run build && ${start}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: serverEnv,
    stdout: "ignore",
    stderr: "pipe",
  },
});
