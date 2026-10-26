import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  inviteMemberSchema,
  passwordProblems,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validation/auth";
import { preparedDemoFromForm, preparedDemoSchema } from "@/lib/validation/demo";
import { organizationSettingsSchema } from "@/lib/validation/organization";

describe("password policy", () => {
  it("accepts a long passphrase", () => {
    expect(passwordProblems("un cafe au soleil de Lisbonne")).toEqual([]);
  });

  it("rejects short, repeated and common passwords", () => {
    expect(passwordProblems("court")).not.toEqual([]);
    expect(passwordProblems("aaaaaaaaaaaa")).toContain("Ce mot de passe est trop simple.");
    expect(passwordProblems("Azertyuiop")).toContain("Ce mot de passe est trop courant, choisissez-en un autre.");
  });

  it("rejects a password containing the email address", () => {
    expect(passwordProblems("camille-2026-secure", { email: "camille@institut.fr" })).toContain(
      "Le mot de passe ne doit pas contenir votre adresse email.",
    );
  });
});

describe("sign-up form", () => {
  const valid = {
    name: "Camille Laurent",
    email: "  Camille@Institut.FR ",
    password: "une phrase de passe solide",
    organizationName: "Institut Lumière",
    acceptTerms: "on",
  };

  it("normalizes the email address", () => {
    const parsed = signUpSchema.parse(valid);
    expect(parsed.email).toBe("camille@institut.fr");
  });

  it("requires accepting the terms", () => {
    const result = signUpSchema.safeParse({ ...valid, acceptTerms: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "pas-un-email" }).success).toBe(false);
  });
});

describe("password change and reset forms", () => {
  it("requires matching confirmation", () => {
    const result = resetPasswordSchema.safeParse({
      token: "x".repeat(43),
      password: "nouvelle phrase secrète",
      confirmPassword: "autre phrase secrète",
    });
    expect(result.success).toBe(false);
  });

  it("refuses reusing the current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "phrase de passe actuelle",
      newPassword: "phrase de passe actuelle",
      confirmPassword: "phrase de passe actuelle",
    });
    expect(result.success).toBe(false);
  });
});

describe("invitation form", () => {
  it("never invites someone as owner", () => {
    expect(inviteMemberSchema.safeParse({ email: "lea@institut.fr", role: "OWNER" }).success).toBe(false);
    expect(inviteMemberSchema.safeParse({ email: "lea@institut.fr", role: "STAFF" }).success).toBe(true);
  });
});

describe("establishment settings form", () => {
  it("requires the default language to be allowed", () => {
    const result = organizationSettingsSchema.safeParse({
      name: "Maison Éclat",
      timezone: "Europe/Paris",
      defaultLanguage: "pt",
      allowedLanguages: ["fr", "en"],
    });
    expect(result.success).toBe(false);
  });

  it("only accepts supported languages and time zones", () => {
    expect(
      organizationSettingsSchema.safeParse({
        name: "Maison Éclat",
        timezone: "Mars/Olympus",
        defaultLanguage: "fr",
        allowedLanguages: ["fr"],
      }).success,
    ).toBe(false);
    expect(
      organizationSettingsSchema.safeParse({
        name: "Maison Éclat",
        timezone: "Europe/Lisbon",
        defaultLanguage: "pt",
        allowedLanguages: ["pt", "de"],
      }).success,
    ).toBe(false);
  });
});

describe("prospect clinic for a demo", () => {
  const filled = (services: Array<[string, string, string?]>, extra: Record<string, string> = {}) => {
    const form: Record<string, string> = { name: "Clínica Sorriso", city: "Porto", language: "pt", weekdayOpens: "09:30", weekdayCloses: "19:00", ...extra };
    services.forEach(([name, price, duration = ""], index) => {
      form[`service${index}Name`] = name;
      form[`service${index}Price`] = price;
      form[`service${index}Duration`] = duration;
    });
    return preparedDemoSchema.safeParse(preparedDemoFromForm(form));
  };

  it("keeps only the prices on the clinic's website, and never invents one", () => {
    const parsed = filled([
      ["Limpeza de pele", "60", "60"],
      ["Peeling", "45,50 €"],
      ["Consulta de medicina estética", ""],
    ]);
    expect(parsed.success && parsed.data.services).toEqual([
      { name: "Limpeza de pele", price: 6_000, duration: 60 },
      { name: "Peeling", price: 4_550, duration: null },
      { name: "Consulta de medicina estética", price: null, duration: null },
    ]);
  });

  it("refuses incomplete or incoherent clinics", () => {
    expect(filled([]).success).toBe(false);
    expect(filled([["Limpeza", "gratuit"]]).success).toBe(false);
    expect(filled([["", "60"]]).success).toBe(false);
    expect(filled([["Limpeza", "60"]], { weekdayOpens: "19:00", weekdayCloses: "09:00" }).success).toBe(false);
    expect(filled([["Limpeza", "60"]], { saturdayOpens: "09:30" }).success).toBe(false);
    expect(filled([["Limpeza", "60"]], { language: "es" }).success).toBe(false);
    expect(filled([["Limpeza", "60"]], { saturdayOpens: "09:30", saturdayCloses: "13:00" }).success).toBe(true);
  });
});
