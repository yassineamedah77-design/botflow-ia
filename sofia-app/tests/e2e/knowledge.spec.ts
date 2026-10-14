import { expect, test } from "@playwright/test";

import { DEMO, login } from "./support";

test.describe("knowledge base", () => {
  test("an admin adds, edits and deletes a question SOFIA can answer", async ({ page }) => {
    await login(page, DEMO.admin);
    await page.waitForURL("**/dashboard");
    await page.goto("/knowledge/faq");

    await page.getByRole("button", { name: "Ajouter une question" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Question").fill("Acceptez-vous les chèques cadeaux d'entreprise ?");
    await dialog.getByLabel("Réponse").fill("Oui, les chèques cadeaux des principaux réseaux sont acceptés.");
    await dialog.getByRole("button", { name: "Ajouter la question" }).click();
    await expect(page.getByText("Question ajoutée.").first()).toBeVisible();
    const item = page.getByRole("listitem").filter({ hasText: "Acceptez-vous les chèques cadeaux d'entreprise ?" });
    await expect(item).toBeVisible();

    await page.getByRole("button", { name: "Modifier « Acceptez-vous les chèques cadeaux d'entreprise ? »" }).click();
    await page.getByRole("dialog").getByLabel("Réponse").fill("Oui, sauf les chèques vacances.");
    await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
    await expect(item.getByText("Oui, sauf les chèques vacances.", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Supprimer « Acceptez-vous les chèques cadeaux d'entreprise ? »" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
    await expect(item).toHaveCount(0);
  });

  test("a document is split into passages and the closures are listed", async ({ page }) => {
    await login(page, DEMO.owner);
    await page.waitForURL("**/dashboard");
    await page.goto("/knowledge/documents");
    // The demo establishment comes with its laser preparation guide.
    await expect(page.getByText("Préparer sa séance d'épilation laser", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Ajouter un document" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Titre").fill("Conditions des cartes cadeaux");
    await dialog.getByLabel("Texte").fill("Les cartes cadeaux sont valables un an.\n\nElles ne sont ni remboursables ni échangeables.");
    await dialog.getByRole("button", { name: "Ajouter le document" }).click();
    const document = page.getByRole("listitem").filter({ hasText: "Conditions des cartes cadeaux" });
    await expect(document.getByText(/1 passage ·/)).toBeVisible();

    await page.getByRole("navigation", { name: "Knowledge Base" }).getByRole("link", { name: "Fermetures" }).click();
    await page.waitForURL("**/knowledge/closures");
    await expect(page.getByText("Formation de l'équipe")).toBeVisible();
  });

  test("the test console shows the answer, what SOFIA understood and what she would do", async ({ page }) => {
    await login(page, DEMO.owner);
    await page.waitForURL("**/dashboard");
    await page.goto("/knowledge/test");
    await expect(page.getByText("Mode de test automatique")).toBeVisible();

    const input = page.getByRole("textbox", { name: "Message de la cliente" });
    await input.fill("Bonjour, je voudrais parler à quelqu'un de l'équipe.");
    await page.getByRole("button", { name: "Envoyer", exact: true }).click();
    await expect(page.getByTestId("sofia-reply").last()).toContainText("Je préviens l'équipe");
    await expect(page.getByText("Transmettrait à l'équipe : demande à parler à l'équipe")).toBeVisible();

    // An invented price never reaches the customer.
    await input.fill("Et ce soin, c'est combien ? #prix-invente");
    await input.press("Enter");
    await expect(page.getByText(/Réponse bloquée par un garde-fou : elle contenait un prix absent de la Knowledge Base/)).toBeVisible();
    await expect(page.getByTestId("sofia-reply").last()).toContainText("Je préfère vérifier ce point avec l'équipe");

    // Suggestions are one click away.
    await page.getByRole("button", { name: /ma peau est rouge et ça brûle/ }).click();
    await expect(page.getByText("Transmettrait à l'équipe : question médicale · urgent")).toBeVisible();

    await page.getByRole("button", { name: "Recommencer" }).click();
    await expect(page.getByTestId("sofia-reply")).toHaveCount(0);
  });

  test("staff members cannot run tests", async ({ page }) => {
    await login(page, DEMO.staff);
    await page.waitForURL("**/dashboard");
    await page.goto("/knowledge/test");
    await expect(page.getByText("Réservé aux propriétaires et administrateurs")).toBeVisible();
    await page.goto("/knowledge/faq");
    await expect(page.getByRole("button", { name: "Ajouter une question" })).toHaveCount(0);
  });
});
