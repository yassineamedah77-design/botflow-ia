import { expect, test } from "@playwright/test";

import { DEMO, login } from "./support";

/*
 * Phone numbers come from 06 39 98 9x xx: the fiction range reserved by
 * ARCEP, above the numbers the demo seed hands out (from 06 39 98 00 00).
 * The contact's number changes on every run, so a retried test never meets
 * the contact its first attempt created.
 */
const suffix = String(Date.now() % 1000).padStart(3, "0");
const PHONE = {
  typed: `06 39 98 9${suffix[0]} ${suffix.slice(1)}`,
  international: `+33 6 39 98 9${suffix[0]} ${suffix.slice(1)}`,
  e164: `+33639989${suffix}`,
};

test.describe("CRM", () => {
  test("creates a contact, refuses a duplicate and follows the lead through the pipeline", async ({ page }) => {
    await login(page, DEMO.admin);
    await page.waitForURL("**/dashboard");
    await page.goto("/leads");
    await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();

    await page.getByRole("button", { name: "Nouveau contact" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Prénom").fill("Zélie");
    await dialog.getByLabel("Nom", { exact: true }).fill("Testeuse");
    await dialog.getByLabel("Téléphone").fill(PHONE.typed);
    await dialog.getByRole("button", { name: "Créer le contact" }).click();
    await page.waitForURL(/\/leads\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: "Zélie Testeuse" })).toBeVisible();
    await expect(page.getByText(PHONE.international).first()).toBeVisible();

    // Same number typed differently: refused, naming the existing contact.
    await page.goto("/leads");
    await page.getByRole("button", { name: "Nouveau contact" }).click();
    await page.getByRole("dialog").getByLabel("Téléphone").fill(PHONE.e164);
    await page.getByRole("dialog").getByRole("button", { name: "Créer le contact" }).click();
    await expect(page.getByText(/existe déjà avec ce numéro \(Zélie Testeuse\)/).first()).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/leads?q=testeuse");
    await page.getByRole("link", { name: "Zélie Testeuse" }).first().click();
    await page.waitForURL(/\/leads\/[0-9a-f-]{36}$/);
    await page.getByPlaceholder("Préférences, informations utiles pour l'équipe…").fill("Préfère être rappelée le samedi.");
    await page.getByRole("button", { name: "Ajouter la note" }).click();
    await expect(page.getByText("Préfère être rappelée le samedi.")).toBeVisible();

    await page.getByRole("combobox", { name: "Étape du pipeline" }).click();
    await page.getByRole("option", { name: "Chaud" }).click();
    await expect(page.getByText("Statut mis à jour.")).toBeVisible();

    await page.getByRole("combobox", { name: "Assigné à" }).click();
    await page.getByRole("option", { name: "Léa Martin" }).click();
    await expect(page.getByText("Contact assigné.")).toBeVisible();
  });

  test("shows the pipeline as a Kanban board", async ({ page }) => {
    await login(page, DEMO.staff);
    await page.waitForURL("**/dashboard");
    await page.goto("/leads");
    await page.getByRole("group", { name: "Affichage" }).getByRole("link", { name: "Kanban" }).click();
    await page.waitForURL("**/leads?view=kanban");
    for (const column of ["Nouveau", "Qualifié", "Chaud", "RDV pris"]) {
      await expect(page.getByRole("heading", { name: column }).first()).toBeVisible();
    }
  });
});

test.describe("client file and reactivation", () => {
  test("imports a client file and shows who can be reactivated", async ({ page }) => {
    await login(page, DEMO.owner);
    await page.waitForURL("**/dashboard");
    await page.goto("/leads/import");
    await expect(page.getByRole("heading", { name: "Importer votre fichier clients" })).toBeVisible();

    const csv = [
      "Nom;Prénom;Téléphone;Email;Dernière visite;Nombre de visites;Total dépensé;Accepte les offres",
      "Fontaine;Margaux;06 39 98 98 01;margaux.fontaine@example.com;12/01/2026;4;480;oui",
      "Garnier;Sofia;06 39 98 98 02;;03/02/2026;1;95;non",
      "Sans;Contact;;;10/02/2026;2;150;oui",
    ].join("\n");
    await page.setInputFiles("#client-file", { name: "clients.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
    await page.getByRole("button", { name: "Vérifier le fichier" }).click();
    await expect(page.getByText("Lignes lues")).toBeVisible();

    const importButton = page.getByRole("button", { name: /^Importer \d+ contact/ });
    await expect(importButton).toBeDisabled();
    await page.getByRole("checkbox").check();
    await importButton.click();
    await expect(page.getByText("Fichier importé")).toBeVisible();

    await page.goto("/reactivation");
    await expect(page.getByRole("heading", { name: "Réactivation" })).toBeVisible();
    await expect(page.getByText("Jamais revenues").first()).toBeVisible();
    await expect(page.getByText("Clientes perdues").first()).toBeVisible();
  });
});
