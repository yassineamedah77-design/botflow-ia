import "server-only";

import { z } from "zod";

/**
 * Runtime configuration, validated once on first access.
 *
 * Validation is lazy on purpose: `next build` imports server modules to
 * collect route information, and a build machine (Docker build stage, CI)
 * does not have production secrets. Every route that reads the environment is
 * dynamic, so the values are checked at request time on the real server.
 */

const booleanFlag = z
  .enum(["true", "false", "1", "0", ""])
  .transform((value) => value === "true" || value === "1");

const base64Key = z
  .string()
  .min(1, "is required")
  .refine((value) => Buffer.from(value, "base64").length === 32, {
    message: "must be 32 random bytes encoded in base64 (openssl rand -base64 32)",
  });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    /** Deployment stage. Production enables the strictest checks. */
    APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    /** Public URL of the app, used in emails and to decide cookie security. */
    APP_URL: z.url().transform((value) => value.replace(/\/+$/, "")),

    DATABASE_URL: z
      .string()
      .min(1, "is required")
      .refine((value) => /^postgres(ql)?:\/\//.test(value), "must be a postgres:// connection string"),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

    /** AES-256-GCM key protecting integration credentials at rest. */
    ENCRYPTION_KEY: base64Key,
    /** Previous key, kept only during a key rotation so old secrets stay readable. */
    ENCRYPTION_KEY_PREVIOUS: base64Key.optional(),

    EMAIL_TRANSPORT: z.enum(["smtp", "console", "file"]).default("console"),
    SMTP_URL: z.string().optional(),
    EMAIL_FROM: z.string().min(3).default("SOFIA <no-reply@sofia.local>"),
    EMAIL_OUTBOX_DIR: z.string().default(".mail-outbox"),

    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    /** Trust X-Forwarded-For (true behind Vercel, nginx or any reverse proxy). */
    TRUST_PROXY: booleanFlag.default(true),
    /** Public self-service signup. Turn off to onboard establishments by invitation only. */
    SIGNUP_ENABLED: booleanFlag.default(true),
    /** Exposes /design-system outside development (staging reviews). */
    SHOW_DESIGN_SYSTEM: booleanFlag.default(false),
    /** When set, /api/health returns detailed checks only with this bearer token. */
    HEALTHCHECK_TOKEN: z.string().min(16).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_TRANSPORT === "smtp" && !env.SMTP_URL) {
      ctx.addIssue({ code: "custom", path: ["SMTP_URL"], message: "is required when EMAIL_TRANSPORT=smtp" });
    }
    if (env.APP_ENV === "production") {
      if (env.EMAIL_TRANSPORT !== "smtp") {
        ctx.addIssue({
          code: "custom",
          path: ["EMAIL_TRANSPORT"],
          message: "must be smtp in production, otherwise password reset and invitation emails are never delivered",
        });
      }
      if (!env.APP_URL.startsWith("https://")) {
        ctx.addIssue({ code: "custom", path: ["APP_URL"], message: "must use https in production" });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export class InvalidEnvironmentError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid environment configuration:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
    this.name = "InvalidEnvironmentError";
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  // Empty strings in .env files mean "not set".
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined && value !== ""));
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    throw new InvalidEnvironmentError(
      result.error.issues.map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`),
    );
  }
  return result.data;
}

export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/** Test helper: forget the cached configuration after mutating process.env. */
export function resetEnvCache() {
  cached = undefined;
}

export function isSecureAppUrl() {
  return env().APP_URL.startsWith("https://");
}
