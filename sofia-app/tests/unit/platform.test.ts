import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { formatCurrency, formatDuration, initials } from "@/lib/format";
import { safeRedirectPath } from "@/lib/navigation";
import { describePrice, formatClockTime } from "@/lib/pricing";
import { describeUserAgent } from "@/lib/user-agent";
import { escapeHtml, invitationEmail, passwordResetEmail } from "@/server/email/templates";
import { parseEnv } from "@/server/env";
import { redact, REDACTED } from "@/server/observability/logger";
import { slugify } from "@/server/services/organizations";
import { monthRange } from "@/server/services/revenue";

describe("post-login redirects", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirectPath("/team")).toBe("/team");
    expect(safeRedirectPath("/invitations/abc?x=1")).toBe("/invitations/abc?x=1");
  });

  it("blocks open redirects and loops", () => {
    for (const value of ["//evil.example", "/\\evil.example", "https://evil.example", "javascript:alert(1)", "", null, "/login", "/signup?x"]) {
      expect(safeRedirectPath(value)).toBe("/dashboard");
    }
  });
});

describe("prices shown by SOFIA", () => {
  it("never presents a missing price as configured", () => {
    expect(describePrice("FIXED", null)).toEqual({ label: "Non renseigné", configured: false });
    expect(describePrice("FROM", null).configured).toBe(false);
  });

  it("formats configured prices in euros", () => {
    expect(describePrice("FIXED", 18_000).label.replace(/\s/g, " ")).toBe("180 €");
    expect(describePrice("FROM", 4_500).label.replace(/\s/g, " ")).toBe("À partir de 45 €");
    expect(describePrice("ON_CONSULTATION", null)).toEqual({ label: "Sur consultation", configured: true });
  });

  it("formats amounts, durations and times", () => {
    expect(formatCurrency(1_248_000).replace(/\s/g, " ")).toBe("12 480 €");
    expect(formatCurrency(1_950).replace(/\s/g, " ")).toBe("19,50 €");
    expect(formatDuration(75)).toBe("1 h 15");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatClockTime("09:30:00")).toBe("9 h 30");
    expect(initials("Camille Laurent")).toBe("CL");
    expect(describeUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15")).toBe(
      "Safari sur macOS",
    );
  });
});

describe("establishment slugs", () => {
  it("strips accents and punctuation", () => {
    expect(slugify("Maison Éclat")).toBe("maison-eclat");
    expect(slugify("  L'Atelier Beauté & Spa !! ")).toBe("l-atelier-beaute-spa");
    expect(slugify("***")).toBe("");
  });
});

describe("monthly revenue window", () => {
  it("uses the establishment's local midnight (Paris, summer and winter time)", () => {
    const october = monthRange(new Date("2026-10-15T12:00:00Z"), "Europe/Paris");
    expect(october.from.toISOString()).toBe("2026-09-30T22:00:00.000Z");
    expect(october.to.toISOString()).toBe("2026-10-31T23:00:00.000Z");
    const december = monthRange(new Date("2026-12-31T23:30:00Z"), "Europe/Paris");
    expect(december.from.toISOString()).toBe("2026-12-31T23:00:00.000Z");
  });

  it("handles Lisbon and year boundaries", () => {
    const january = monthRange(new Date("2027-01-01T00:30:00Z"), "Europe/Lisbon");
    expect(january.from.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(january.to.toISOString()).toBe("2027-02-01T00:00:00.000Z");
  });
});

describe("log redaction", () => {
  it("masks secrets at any depth", () => {
    const output = redact({
      email: "a@b.fr",
      password: "hunter2",
      nested: { accessToken: "x", list: [{ apiKey: "y" }], safe: 1 },
      credentialsEncrypted: "v1...",
    }) as Record<string, unknown>;
    expect(output.password).toBe(REDACTED);
    expect(output.credentialsEncrypted).toBe(REDACTED);
    expect((output.nested as Record<string, unknown>).accessToken).toBe(REDACTED);
    expect(((output.nested as { list: Array<Record<string, unknown>> }).list[0]!).apiKey).toBe(REDACTED);
    expect((output.nested as Record<string, unknown>).safe).toBe(1);
  });
});

describe("email templates", () => {
  it("escapes user-controlled values", () => {
    const email = invitationEmail({
      inviterName: "<script>alert(1)</script>",
      organizationName: "Spa <b>Luxe</b>",
      roleLabel: "Équipe",
      url: "https://app.example/invitations/abc",
      expiresInDays: 7,
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<b>Luxe</b>");
    expect(email.text).toContain("https://app.example/invitations/abc");
  });

  it("includes the reset link and its lifetime", () => {
    const email = passwordResetEmail({ name: "Léa", url: "https://app.example/reset-password?token=abc", expiresInMinutes: 60 });
    expect(email.text).toContain("https://app.example/reset-password?token=abc");
    expect(email.text).toContain("60 minutes");
    expect(escapeHtml(`"&'`)).toBe("&quot;&amp;&#39;");
  });
});

describe("environment validation", () => {
  const base = {
    APP_URL: "http://localhost:3000",
    DATABASE_URL: "postgres://sofia:sofia@localhost:5432/sofia_dev",
    ENCRYPTION_KEY: randomBytes(32).toString("base64"),
  };

  it("accepts a minimal development configuration", () => {
    const env = parseEnv(base);
    expect(env.APP_ENV).toBe("development");
    expect(env.EMAIL_TRANSPORT).toBe("console");
    expect(env.SIGNUP_ENABLED).toBe(true);
  });

  it("demands SMTP and HTTPS in production", () => {
    expect(() => parseEnv({ ...base, APP_ENV: "production" })).toThrow(/EMAIL_TRANSPORT[\s\S]*APP_URL|APP_URL[\s\S]*EMAIL_TRANSPORT/);
    expect(() =>
      parseEnv({ ...base, APP_ENV: "production", APP_URL: "https://app.example", EMAIL_TRANSPORT: "smtp", SMTP_URL: "smtp://localhost:1025" }),
    ).not.toThrow();
  });

  it("rejects weak encryption keys and non-postgres URLs", () => {
    expect(() => parseEnv({ ...base, ENCRYPTION_KEY: "short" })).toThrow(/ENCRYPTION_KEY/);
    expect(() => parseEnv({ ...base, DATABASE_URL: "mysql://localhost/db" })).toThrow(/DATABASE_URL/);
  });

  it("parses boolean flags", () => {
    expect(parseEnv({ ...base, SIGNUP_ENABLED: "false" }).SIGNUP_ENABLED).toBe(false);
    expect(parseEnv({ ...base, SIGNUP_ENABLED: "1" }).SIGNUP_ENABLED).toBe(true);
  });
});
