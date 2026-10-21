import { describe, expect, it } from "vitest";

import { visitorContactSchema, widgetSettingsSchema } from "@/lib/validation/widget";
import {
  conversationReference,
  DEFAULT_WIDGET_SETTINGS,
  fillText,
  frameAncestors,
  isOriginAllowed,
  normalizeDomain,
  pickWidgetLanguage,
  readableTextColor,
  readWidgetSettings,
  whatsappDigits,
  WIDGET_TEXTS,
} from "@/lib/widget";
import { WIDGET_LOADER } from "@/server/widget/loader";

describe("allowed domains", () => {
  it("keeps the hostname of whatever the establishment pastes", () => {
    expect(normalizeDomain("https://www.Institut-Eclat.fr/contact?x=1")).toBe("institut-eclat.fr");
    expect(normalizeDomain("  boutique.institut-eclat.fr ")).toBe("boutique.institut-eclat.fr");
    expect(normalizeDomain("clínica-lumina.pt")).toBe("xn--clnica-lumina-xib.pt");
    expect(normalizeDomain("localhost")).toBe("localhost");
    for (const invalid of ["", "*.eclat.fr", "eclat", "192.168.1.10", "eclat fr", "javascript:alert(1)", "https://"]) {
      expect(normalizeDomain(invalid)).toBeNull();
    }
  });

  it("allows a domain and its subdomains, nothing else", () => {
    const domains = ["institut-eclat.fr"];
    expect(isOriginAllowed("https://institut-eclat.fr", domains)).toBe(true);
    expect(isOriginAllowed("https://www.institut-eclat.fr", domains)).toBe(true);
    expect(isOriginAllowed("https://institut-eclat.fr.evil.com", domains)).toBe(false);
    expect(isOriginAllowed("https://faux-institut-eclat.fr", domains)).toBe(false);
    expect(isOriginAllowed(null, domains)).toBe(false);
    expect(isOriginAllowed("not a url", domains)).toBe(false);
  });

  it("lets only SOFIA and the allowed domains frame the chat window", () => {
    expect(frameAncestors([])).toBe("'self'");
    expect(frameAncestors(["institut-eclat.fr"])).toBe("'self' institut-eclat.fr *.institut-eclat.fr");
    // A value that is not a clean hostname never reaches the header.
    expect(frameAncestors(["eclat.fr; script-src *"])).toBe("'self'");
  });
});

describe("widget settings", () => {
  it("completes and cleans what is stored", () => {
    expect(readWidgetSettings(null)).toEqual(DEFAULT_WIDGET_SETTINGS);
    expect(readWidgetSettings({ accentColor: "red", position: "top", allowedDomains: ["WWW.Eclat.fr", "eclat.fr", "*"], enabled: false })).toMatchObject({
      accentColor: "#d97757",
      position: "right",
      allowedDomains: ["eclat.fr"],
      enabled: false,
    });
  });

  it("validates the settings form", () => {
    const valid = widgetSettingsSchema.safeParse({
      enabled: true,
      allowedDomains: ["https://www.eclat.fr", "", "eclat.fr", "boutique.eclat.fr"],
      accentColor: "#B5593A",
      position: "left",
      greeting: "  ",
      whatsappButton: false,
      privacyUrl: "https://eclat.fr/confidentialite",
    });
    expect(valid.success && valid.data).toMatchObject({ allowedDomains: ["eclat.fr", "boutique.eclat.fr"], accentColor: "#b5593a", greeting: null });
    const domain = widgetSettingsSchema.safeParse({ ...valid.data, allowedDomains: ["mon site"] });
    expect(domain.success).toBe(false);
    expect(JSON.stringify(domain.error)).toContain("n'est pas un nom de domaine valide");
    expect(widgetSettingsSchema.safeParse({ ...valid.data, privacyUrl: "http://eclat.fr/privacy" }).success).toBe(false);
    expect(widgetSettingsSchema.safeParse({ ...valid.data, accentColor: "orange" }).success).toBe(false);
  });

  it("asks a visitor for a phone or an email", () => {
    expect(visitorContactSchema.safeParse({ firstName: "Julie", marketingConsent: false }).success).toBe(false);
    expect(visitorContactSchema.safeParse({ firstName: "Julie", email: "pas-un-email", marketingConsent: false }).success).toBe(false);
    const parsed = visitorContactSchema.safeParse({ firstName: " Julie ", email: "Julie@Example.org", marketingConsent: true });
    expect(parsed.success && parsed.data).toMatchObject({ firstName: "Julie", email: "julie@example.org", phone: null, lastName: null });
  });
});

describe("chat window", () => {
  it("speaks the visitor's language when the establishment does", () => {
    expect(pickWidgetLanguage(["pt-PT", "en"], ["fr", "pt"], "fr")).toBe("pt");
    expect(pickWidgetLanguage(["de-DE", "en-GB"], ["fr", "en"], "fr")).toBe("en");
    expect(pickWidgetLanguage(["de"], ["pt"], "pt")).toBe("pt");
    expect(pickWidgetLanguage([], ["fr"], "fr")).toBe("fr");
  });

  it("has every text in the three languages", () => {
    const keys = Object.keys(WIDGET_TEXTS.fr).sort();
    expect(Object.keys(WIDGET_TEXTS.pt).sort()).toEqual(keys);
    expect(Object.keys(WIDGET_TEXTS.en).sort()).toEqual(keys);
    // European Portuguese: equipa, never the Brazilian equipe.
    expect(JSON.stringify(WIDGET_TEXTS.pt)).not.toMatch(/\bequipe\b|agendar|celular/);
    expect(fillText(WIDGET_TEXTS.fr.greetingAi, { org: "Maison Éclat", assistant: "Sofia" })).toBe(
      "Bonjour ! Je suis Sofia, l'assistante virtuelle de Maison Éclat. Comment puis-je vous aider ?",
    );
  });

  it("keeps text readable on the establishment's color (highest contrast wins)", () => {
    // SOFIA's terracotta: dark text reaches 5.8:1, white only 3.1:1.
    expect(readableTextColor("#d97757")).toBe("#161514");
    expect(readableTextColor("#b5593a")).toBe("#ffffff");
    expect(readableTextColor("#161514")).toBe("#ffffff");
    expect(readableTextColor("#f5e663")).toBe("#161514");
    expect(readableTextColor("#ffffff")).toBe("#161514");
  });

  it("builds WhatsApp links and conversation references", () => {
    expect(whatsappDigits("+33 6 12 34 56 78")).toBe("33612345678");
    expect(whatsappDigits("12")).toBeNull();
    expect(whatsappDigits(null)).toBeNull();
    expect(conversationReference("3f9a2c1e-0000-4000-8000-000000000000")).toBe("W-3F9A2C");
  });
});

describe("widget.js", () => {
  it("is valid standalone JavaScript that touches nothing until SOFIA allows the domain", () => {
    expect(() => new Function(WIDGET_LOADER)).not.toThrow();
    // Config first: no launcher, no iframe before the server said yes.
    expect(WIDGET_LOADER.indexOf("/config")).toBeGreaterThan(0);
    expect(WIDGET_LOADER).toContain("if (config && config.enabled) mount(config)");
    // The conversation runs sandboxed, without access to the host page.
    expect(WIDGET_LOADER).toContain('"allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"');
    expect(WIDGET_LOADER).not.toContain("allow-top-navigation");
    // Messages from the iframe are only trusted from SOFIA's origin.
    expect(WIDGET_LOADER).toContain("event.origin !== base");
    expect(WIDGET_LOADER).not.toMatch(/document\.cookie|eval\(/);
  });
});
