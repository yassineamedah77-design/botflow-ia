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
    /**
     * Public prospect demo (a separate deployment with its own database):
     * /demo gives every visitor a fictional copy of Maison Éclat for 24 hours.
     */
    DEMO_MODE: booleanFlag.default(false),
    /** Opens /demo/cliniques, where prospect clinics are prepared for sales calls (demo only). */
    DEMO_ADMIN_KEY: z.string().min(24, "must be at least 24 characters (openssl rand -base64 32)").optional(),
    /** Exposes /design-system outside development (staging reviews). */
    SHOW_DESIGN_SYSTEM: booleanFlag.default(false),
    /** When set, /api/health returns detailed checks only with this bearer token. */
    HEALTHCHECK_TOKEN: z.string().min(16).optional(),

    /**
     * Language model behind SOFIA. `anthropic` calls Claude with
     * ANTHROPIC_API_KEY; `scripted` answers from fixed rules without any
     * model, for automated tests only.
     */
    AI_PROVIDER: z.enum(["anthropic", "scripted"]).default("anthropic"),
    ANTHROPIC_API_KEY: z.string().min(20).optional(),
    /** Main model, and the one used when it is unavailable ("none" = no fallback model). */
    SOFIA_AI_MODEL: z.string().min(3).default("claude-opus-5-5"),
    SOFIA_AI_FALLBACK_MODEL: z.string().default("claude-sonnet-5-5"),
    /** How much the model thinks before answering: more is slower, costlier and steadier. */
    SOFIA_AI_EFFORT: z.enum(["low", "medium", "high"]).default("medium"),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER === "scripted" && (env.APP_ENV === "production" || env.APP_ENV === "staging")) {
      ctx.addIssue({
        code: "custom",
        path: ["AI_PROVIDER"],
        message: "scripted is for automated tests only: it never calls a real model",
      });
    }
    if (env.DEMO_MODE) {
      // Anyone on the internet gets an account on the demo: it must never be
      // the database of real establishments, nor send a real email.
      if (env.APP_ENV === "production") {
        ctx.addIssue({ code: "custom", path: ["DEMO_MODE"], message: "is for the separate demo deployment (APP_ENV=staging), never production" });
      }
      if (env.SIGNUP_ENABLED) {
        ctx.addIssue({ code: "custom", path: ["SIGNUP_ENABLED"], message: "must be false with DEMO_MODE: real establishments sign up on the production app" });
      }
      if (env.EMAIL_TRANSPORT === "smtp") {
        ctx.addIssue({ code: "custom", path: ["EMAIL_TRANSPORT"], message: "must not be smtp with DEMO_MODE: demo visitors could make SOFIA email any address" });
      }
    }
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
  // Every Vercel preview branch has its own address: without an explicit
  // APP_URL, links in emails point to the branch being previewed.
  if (!cleaned.APP_URL && cleaned.VERCEL_ENV === "preview" && cleaned.VERCEL_BRANCH_URL) {
    cleaned.APP_URL = `https://${cleaned.VERCEL_BRANCH_URL}`;
  }
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
