import { expect, test } from "@playwright/test";

import { linkIn, login, logout, uniqueEmail, waitForEmail } from "./support";

test.describe("authentication journey", () => {
  test("sign up, verify email, sign out, recover the password and sign back in", async ({ page }) => {
    const email = uniqueEmail("institut");
    const password = "une phrase de passe solide";
    const newPassword = "une nouvelle phrase solide";

    // Sign up creates the establishment and opens the setup.
    await page.goto("/signup");
    await page.getByLabel("Votre prénom et nom").fill("Sabrina Costa");
    await page.getByLabel("Nom de l'établissement").fill("Institut Azulejo");
    await page.getByLabel("Email professionnel").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Créer mon espace SOFIA" }).click();

    await page.waitForURL("**/onboarding/welcome");
    await expect(page.getByRole("heading", { name: "Bienvenue sur SOFIA" })).toBeVisible();
    await expect(page.getByText("Institut Azulejo · Mise en route")).toBeVisible();
    await page.getByRole("link", { name: "Quitter" }).click();
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "Bonjour Sabrina" })).toBeVisible();
    await expect(page.getByText("0 étape sur 8 validée")).toBeVisible();

    // Email verification: the banner disappears once the link is confirmed.
    await expect(page.getByText(`Confirmez votre adresse ${email}`)).toBeVisible();
    const verification = await waitForEmail(email, "email_verification");
    await page.goto(linkIn(verification, "/verify-email"));
    await page.getByRole("button", { name: "Confirmer mon adresse" }).click();
    await expect(page.getByText("Adresse email confirmée")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByText(`Confirmez votre adresse ${email}`)).toHaveCount(0);

    await logout(page);

    // Wrong password: generic error, no account enumeration.
    await login(page, email, "pas le bon mot de passe");
    await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();

    // Forgot password → email → reset page → signed in with the new password.
    const requestedAt = Date.now();
    await page.goto("/forgot-password");
    await page.getByLabel("Email du compte").fill(email);
    await page.getByRole("button", { name: "Recevoir le lien" }).click();
    await expect(page.getByText(`Si un compte existe pour ${email}`)).toBeVisible();

    const reset = await waitForEmail(email, "password_reset", { after: requestedAt });
    await page.goto(linkIn(reset, "/reset-password"));
    await page.getByLabel("Nouveau mot de passe").fill(newPassword);
    await page.getByLabel("Confirmez le mot de passe").fill(newPassword);
    await page.getByRole("button", { name: "Enregistrer et me connecter" }).click();
    await page.waitForURL("**/dashboard?password=reset");
    await expect(page.getByText("Votre mot de passe a été modifié")).toBeVisible();

    // The link only works once.
    await page.goto(linkIn(reset, "/reset-password"));
    await expect(page.getByRole("heading", { name: "Lien expiré" })).toBeVisible();

    await page.goto("/dashboard");
    await logout(page);
    await login(page, email, password);
    await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();
    await login(page, email, newPassword);
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "Bonjour Sabrina" })).toBeVisible();
  });

  test("validates the sign-up form on the server", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Votre prénom et nom").fill("A");
    await page.getByLabel("Nom de l'établissement").fill("Spa");
    await page.getByLabel("Email professionnel").fill("pas-un-email");
    await page.getByLabel("Mot de passe", { exact: true }).fill("court");
    await page.getByRole("button", { name: "Créer mon espace SOFIA" }).click();
    await expect(page.getByText("Vérifiez les champs indiqués.")).toBeVisible();
    await expect(page.getByText("Adresse email invalide.")).toBeVisible();
    await expect(page.getByText("Au moins 10 caractères.")).toBeVisible();
    await expect(page.getByText("Vous devez accepter les conditions d'utilisation.")).toBeVisible();
    // What the user typed is kept (except the password).
    await expect(page.getByLabel("Nom de l'établissement")).toHaveValue("Spa");
    await expect(page.getByLabel("Mot de passe", { exact: true })).toHaveValue("");
  });
});
