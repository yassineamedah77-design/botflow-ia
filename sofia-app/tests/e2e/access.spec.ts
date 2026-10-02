import { expect, test } from "@playwright/test";

import { DEMO, login } from "./support";

test.describe("access control", () => {
  test("sends visitors to the login page and back to where they were going", async ({ page }) => {
    await page.goto("/team");
    await expect(page).toHaveURL(/\/login\?next=%2Fteam$/);
    await login(page, DEMO.owner, undefined, { stay: true });
    await page.waitForURL("**/team");
    await expect(page.getByRole("heading", { name: "Équipe", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Inviter un membre" })).toBeVisible();
  });

  test("never redirects outside the application after login", async ({ page }) => {
    await page.goto("/login?next=//evil.example");
    await page.getByLabel("Email professionnel").fill(DEMO.owner);
    await page.getByLabel("Mot de passe", { exact: true }).fill("Eclat-Demo-2026");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL("**/dashboard");
  });

  test("limits a staff member to their role", async ({ page }) => {
    await login(page, DEMO.staff);
    await page.waitForURL("**/dashboard");
    const navigation = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(navigation.getByRole("link", { name: "Équipe" })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Facturation" })).toHaveCount(0);

    await page.goto("/billing");
    await expect(page.getByText("La facturation est réservée aux propriétaires")).toBeVisible();

    await page.goto("/team");
    await expect(page.getByRole("button", { name: "Inviter un membre" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Retirer" })).toHaveCount(0);

    await page.goto("/settings");
    await expect(page.getByText("Seuls les propriétaires et administrateurs peuvent modifier ces réglages.")).toBeVisible();
    await expect(page.getByLabel("Nom de l'établissement")).toBeDisabled();
  });

  test("shows real channel statuses and no fake connection button", async ({ page }) => {
    await login(page, DEMO.owner);
    await page.waitForURL("**/dashboard");
    await page.goto("/channels/whatsapp");
    await expect(page.getByText("Non connecté").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Connecter WhatsApp" })).toBeDisabled();
    await page.goto("/channels/unknown");
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  });

  test("serves strict security headers and a per-request CSP nonce", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const first = await page.goto("/login");
    const csp = first!.headers()["content-security-policy"] ?? "";
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(first!.headers()["x-frame-options"]).toBe("DENY");
    expect(first!.headers()["x-content-type-options"]).toBe("nosniff");
    expect(first!.headers()["x-powered-by"]).toBeUndefined();

    const second = await page.goto("/login");
    expect(second!.headers()["content-security-policy"]).not.toBe(csp);

    // The page is interactive under the CSP (scripts carry the nonce).
    await page.getByRole("button", { name: "Afficher le mot de passe" }).click();
    await expect(page.getByRole("button", { name: "Masquer le mot de passe" })).toBeVisible();
    expect(errors.filter((error) => /Content Security Policy|CSP/i.test(error))).toEqual([]);
  });

  test("reports health for monitoring", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
