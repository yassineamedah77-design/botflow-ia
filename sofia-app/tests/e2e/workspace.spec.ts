import { expect, test } from "@playwright/test";

import { DEMO, login } from "./support";

test.describe("inbox", () => {
  test("a member takes over a conversation, replies, then hands it back to SOFIA", async ({ page }) => {
    await login(page, DEMO.staff);
    await page.waitForURL("**/dashboard");
    await page.goto("/inbox?view=human");
    await page.getByRole("list", { name: "Conversations" }).getByRole("link").first().click();
    await page.waitForURL(/conversation=/);

    const composer = page.getByRole("textbox", { name: "Votre réponse" });
    await expect(composer).toBeDisabled();
    await page.getByRole("button", { name: "Prendre la conversation" }).click();
    await expect(page.getByText("Vous avez pris la conversation").first()).toBeVisible();
    await expect(composer).toBeEnabled();

    await composer.fill("Bonjour, ici Léa de l'institut : je regarde votre demande avec la docteure.");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Réponse enregistrée (démonstration").first()).toBeVisible();
    await expect(page.getByLabel("Messages de la conversation").getByText("je regarde votre demande avec la docteure")).toBeVisible();

    await page.getByRole("button", { name: "Rendre à SOFIA" }).click();
    await expect(page.getByText("Conversation rendue à SOFIA.").first()).toBeVisible();
  });
});

test.describe("dashboard and notifications", () => {
  test("shows the recovered revenue, the indicators and the trends", async ({ page }) => {
    await login(page, DEMO.owner);
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "CA récupéré grâce à SOFIA" })).toBeVisible();
    await expect(page.getByText("Établissement de démonstration")).toBeVisible();
    for (const label of ["Leads entrants", "Taux de conversion", "RDV générés", "No-shows récupérés", "CA généré", "Clientes réactivées"]) {
      await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("group", { name: /Conversations par jour/ })).toBeVisible();

    await page.getByRole("navigation", { name: "Période" }).getByRole("link", { name: "Mois dernier" }).click();
    await page.waitForURL("**/dashboard?period=last-month");
    await expect(page.getByRole("navigation", { name: "Période" }).getByRole("link", { name: "Mois dernier" })).toHaveAttribute("aria-current", "page");

    // The keyboard reads the chart values too.
    const chart = page.getByRole("group", { name: /CA récupéré par mois/ });
    await chart.focus();
    await page.keyboard.press("End");
    await expect(chart.locator("[aria-live]")).toContainText("€");
  });

  test("lists notifications and marks them as read", async ({ page }) => {
    await login(page, DEMO.admin);
    await page.waitForURL("**/dashboard");
    const bell = page.getByRole("button", { name: /^Notifications/ });
    await bell.click();
    await expect(page.getByRole("dialog").getByText("Une cliente attend une réponse de l'équipe")).toBeVisible();
    // The seed leaves some unread; a retried attempt may find them read already.
    const markAll = page.getByRole("button", { name: "Tout marquer comme lu" });
    if (await markAll.isVisible()) await markAll.click();
    await expect(page.getByText("Vous êtes à jour")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(bell).toHaveAttribute("aria-label", "Notifications");
    await page.reload();
    await expect(page.getByRole("button", { name: /^Notifications/ })).toHaveAttribute("aria-label", "Notifications");
  });
});

test.describe("onboarding", () => {
  test("walks through the setup and saves the opening hours", async ({ page }) => {
    await login(page, DEMO.admin);
    await page.waitForURL("**/dashboard");
    await page.getByRole("link", { name: "Continuer la mise en route" }).click();
    await page.waitForURL("**/onboarding/**");

    await page.goto("/onboarding/welcome");
    await expect(page.getByRole("heading", { name: "Bienvenue sur SOFIA" })).toBeVisible();
    await page.getByRole("link", { name: "Commencer" }).click();
    await page.waitForURL("**/onboarding/establishment");
    await expect(page.getByLabel("Adresse")).toHaveValue(/\S/);
    await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
    await page.waitForURL("**/onboarding/services");
    await expect(page.getByText("Hydrafacial Signature")).toBeVisible();

    // Opens Sunday (Maison Éclat is closed on Sundays) — or closes it again on a retried attempt.
    await page.goto("/onboarding/hours");
    const sunday = page.getByRole("switch").nth(6);
    const wasOpen = await sunday.isChecked();
    await sunday.click();
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(page.getByText("Horaires enregistrés.")).toBeVisible();
    await page.reload();
    if (wasOpen) await expect(page.getByRole("switch").nth(6)).not.toBeChecked();
    else await expect(page.getByRole("switch").nth(6)).toBeChecked();

    // Steps that depend on later phases say so, without fake buttons.
    await page.goto("/onboarding/whatsapp");
    await expect(page.getByText("Disponible en phase 5", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Connecter/ })).toHaveCount(0);
  });
});
