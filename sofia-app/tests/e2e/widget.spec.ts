import { expect, test, type Page } from "@playwright/test";

import { DEMO, login } from "./support";

/*
 * The widget on a real third-party page: Playwright serves the
 * establishment's "website" on its own domain, which loads widget.js from
 * SOFIA exactly as the installation snippet does. The sites use *.localhost
 * names so the browser lets them reach the local SOFIA server.
 */

const CLIENT_SITE = "http://client-site.localhost";
const OTHER_SITE = "http://other-site.localhost";

function websitePage(baseURL: string, publicId: string) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Institut client</title></head><body>
<h1>Nos soins</h1><p>Tarifs et réservations.</p>
<script src="${baseURL}/widget.js" data-sofia="${publicId}" async></script></body></html>`;
}

async function widgetPublicId(page: Page) {
  await page.goto("/channels/website");
  const snippet = (await page.getByTestId("widget-snippet").textContent()) ?? "";
  return /data-sofia="([^"]+)"/.exec(snippet)![1]!;
}

test.describe("website widget", () => {
  test("an owner installs the widget, a visitor talks to SOFIA, then to the team", async ({ page, browser, baseURL }) => {
    await login(page, DEMO.owner);
    await page.waitForURL("**/dashboard");
    const publicId = await widgetPublicId(page);
    await page.getByLabel("Domaines autorisés").fill("client-site.localhost");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Réglages du widget enregistrés.").first()).toBeVisible();

    // The browser itself refuses to show the conversation anywhere else.
    const chatPage = await page.request.get(`/widget/${publicId}`);
    expect(chatPage.headers()["content-security-policy"]).toContain("frame-ancestors 'self' client-site.localhost *.client-site.localhost");
    expect(chatPage.headers()["x-frame-options"]).toBeUndefined();
    expect((await page.request.get("/dashboard", { maxRedirects: 0 })).headers()["x-frame-options"]).toBe("DENY");

    await page.goto("/settings/sofia");
    await page.getByRole("button", { name: "Activer SOFIA" }).click();
    await expect(page.getByRole("button", { name: "Mettre SOFIA en pause" })).toBeVisible();

    const visitorContext = await browser.newContext({ locale: "fr-FR" });
    const visitor = await visitorContext.newPage();
    await visitorContext.route(`${CLIENT_SITE}/**`, (route) => route.fulfill({ contentType: "text/html", body: websitePage(baseURL!, publicId) }));
    await visitor.goto(`${CLIENT_SITE}/tarifs`);
    await visitor.getByRole("button", { name: "Discuter avec nous" }).click();
    const chat = visitor.frameLocator('iframe[title="Conversation"]');
    await expect(chat.getByText("l'assistante virtuelle de Maison Éclat")).toBeVisible();
    await expect(chat.getByText(/Assistante virtuelle : les réponses sont générées automatiquement/)).toBeVisible();

    await chat.getByRole("textbox", { name: "Écrivez votre message…" }).fill("Bonjour, je voudrais parler à quelqu'un de l'équipe.");
    await chat.getByRole("button", { name: "Envoyer", exact: true }).click();
    await expect(chat.getByTestId("widget-reply").last()).toContainText("Je préviens l'équipe");

    // Handed over: the window asks how the team can reach her.
    await chat.getByPlaceholder("Prénom").fill("Julie");
    await chat.getByPlaceholder("Nom", { exact: true }).fill("Widget");
    await chat.getByPlaceholder("Téléphone").fill("06 12 34 56 99");
    await chat.getByRole("button", { name: "Envoyer mes coordonnées" }).click();
    await expect(chat.getByText("Merci, l'équipe a bien vos coordonnées.")).toBeVisible();

    // The team takes over from the inbox; the visitor reads the reply in the widget.
    await page.goto("/inbox?channel=WEBSITE");
    await page.getByRole("list", { name: "Conversations" }).getByRole("link", { name: /Julie Widget/ }).first().click();
    await page.waitForURL(/conversation=/);
    await page.getByRole("button", { name: "Prendre la conversation" }).click();
    const composer = page.getByRole("textbox", { name: "Votre réponse" });
    await expect(composer).toBeEnabled();
    await composer.fill("Bonjour Julie, ici Camille. Je vous rappelle dans la journée.");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Réponse envoyée.").first()).toBeVisible();
    await expect(chat.getByText("Bonjour Julie, ici Camille. Je vous rappelle dans la journée.")).toBeVisible({ timeout: 20_000 });
    await expect(chat.getByText("Équipe Maison Éclat").first()).toBeVisible();
    await page.getByRole("button", { name: "Rendre à SOFIA" }).click();
    await expect(page.getByText("Conversation rendue à SOFIA.").first()).toBeVisible();

    // Loaded on the allowed domain: the channel is verified.
    await page.goto("/channels/website");
    await expect(page.getByTestId("widget-status")).toContainText("Installé sur client-site.localhost");

    // Back to the state the other tests expect.
    await page.goto("/settings/sofia");
    await page.getByRole("button", { name: "Mettre SOFIA en pause" }).click();
    await expect(page.getByRole("button", { name: "Reprendre SOFIA" })).toBeVisible();
    await visitorContext.close();
  });

  test("stays off on a site that is not allowed", async ({ page, browser, baseURL }) => {
    await login(page, DEMO.owner);
    await page.waitForURL("**/dashboard");
    const publicId = await widgetPublicId(page);

    const visitorContext = await browser.newContext();
    const visitor = await visitorContext.newPage();
    await visitorContext.route(`${OTHER_SITE}/**`, (route) => route.fulfill({ contentType: "text/html", body: websitePage(baseURL!, publicId) }));
    const config = visitor.waitForResponse((response) => response.url().includes(`/api/widget/${publicId}/config`));
    await visitor.goto(OTHER_SITE);
    expect(await (await config).json()).toMatchObject({ enabled: false });
    await expect(visitor.getByRole("button", { name: "Discuter avec nous" })).toHaveCount(0);
    await visitorContext.close();
  });

  test("the preview shows the real widget inside SOFIA", async ({ page }) => {
    await login(page, DEMO.admin);
    await page.waitForURL("**/dashboard");
    await page.goto("/channels/website/preview");
    await page.getByRole("button", { name: "Discuter avec nous" }).click();
    await expect(page.frameLocator('iframe[title="Conversation"]').getByRole("textbox", { name: "Écrivez votre message…" })).toBeVisible();
    // Leaving the preview takes the widget away.
    await page.getByRole("link", { name: "Réglages du widget" }).click();
    await page.waitForURL("**/channels/website");
    await expect(page.getByRole("button", { name: "Discuter avec nous" })).toHaveCount(0);
  });
});
