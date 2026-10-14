import { expect, test } from "@playwright/test";

import { DEMO, linkIn, login, uniqueEmail, waitForEmail } from "./support";

test.describe("team management", () => {
  test("an owner invites a new member who joins with their own account", async ({ page, browser }) => {
    const email = uniqueEmail("nouvelle");

    await login(page, DEMO.owner);
    await page.waitForURL("**/dashboard");
    await page.goto("/team");
    await page.getByRole("button", { name: "Inviter un membre" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email").fill(email);
    await dialog.getByRole("button", { name: "Envoyer l'invitation" }).click();
    await expect(page.getByText(`Invitation envoyée à ${email}.`)).toBeVisible();
    await expect(dialog).toHaveCount(0);
    // Toasts are list items too: look inside the page content only.
    const main = page.getByRole("main");
    await expect(main.getByRole("listitem").filter({ hasText: email })).toBeVisible();

    const invitation = await waitForEmail(email, "invitation");
    expect(invitation.subject).toContain("Maison Éclat");

    // The invitee opens the link in their own browser.
    const inviteeContext = await browser.newContext({ locale: "fr-FR" });
    const invitee = await inviteeContext.newPage();
    await invitee.goto(linkIn(invitation, "/invitations/"));
    await expect(invitee.getByRole("heading", { name: "Rejoindre Maison Éclat" })).toBeVisible();
    await invitee.getByLabel("Votre prénom et nom").fill("Nina Duarte");
    await invitee.getByLabel("Choisissez un mot de passe").fill("une phrase de passe solide");
    await invitee.getByRole("checkbox").check();
    await invitee.getByRole("button", { name: "Créer mon compte et rejoindre l'équipe" }).click();
    await invitee.waitForURL("**/dashboard?joined=1");
    await expect(invitee.getByText("Vous avez rejoint l'équipe de Maison Éclat.")).toBeVisible();
    // Joining through an emailed link proves the address: no verification banner.
    await expect(invitee.getByText("Confirmez votre adresse")).toHaveCount(0);

    // The link cannot be reused.
    await invitee.goto(linkIn(invitation, "/invitations/"));
    await expect(invitee.getByRole("heading", { name: "Invitation déjà utilisée" })).toBeVisible();
    await inviteeContext.close();

    // The owner now sees the new member with the default role.
    await page.reload();
    const row = main.getByRole("listitem").filter({ hasText: "Nina Duarte" });
    await expect(row).toBeVisible();
    await expect(row.getByRole("combobox", { name: "Rôle de Nina Duarte" })).toHaveText("Équipe");
  });

  test("an owner removes a member after confirmation", async ({ page }) => {
    await login(page, DEMO.owner);
    await page.waitForURL("**/dashboard");
    await page.goto("/team");
    const members = page.getByRole("main").getByRole("listitem");
    const row = members.filter({ hasText: "Nina Duarte" });
    await row.getByRole("button", { name: "Retirer" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Retirer de l'équipe" }).click();
    await expect(page.getByText("Membre retiré de l'équipe.")).toBeVisible();
    await expect(members.filter({ hasText: "Nina Duarte" })).toHaveCount(0);
  });
});
