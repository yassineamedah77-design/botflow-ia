import { expect, test } from "@playwright/test";

import { DEMO, login } from "./support";

test.describe("mobile", () => {
  test("navigates the application from the drawer menu", async ({ page }) => {
    await login(page, DEMO.admin);
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "Bonjour Inès" })).toBeVisible();
    // No horizontal scrolling on a phone.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Knowledge Base" }).click();
    await page.waitForURL("**/knowledge");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Hydrafacial Signature", { exact: true })).toBeVisible();
    await expect(page.getByText("Sur consultation").first()).toBeVisible();

    // The knowledge base tabs scroll on their own: the page never scrolls sideways.
    await page.goto("/knowledge/test");
    await expect(page.getByRole("textbox", { name: "Message de la cliente" })).toBeVisible();
    const consoleOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(consoleOverflow).toBeLessThanOrEqual(1);

    // The website channel, its preview and SOFIA's switch fit a phone too.
    for (const path of ["/channels/website", "/settings/sofia"]) {
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    }
    await page.goto("/channels/website/preview");
    await page.getByRole("button", { name: "Discuter avec nous" }).click();
    // On a phone the conversation takes the whole screen.
    const frame = page.locator('iframe[title="Conversation"]');
    await expect(page.frameLocator('iframe[title="Conversation"]').getByRole("textbox", { name: "Écrivez votre message…" })).toBeVisible();
    const viewport = page.viewportSize()!;
    // The panel opens with a short scale-in transition, which the bounding box
    // includes: measure once it has settled. (Dynamic viewport units round to a
    // fraction of a pixel.)
    await expect.poll(async () => (await frame.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(viewport.width - 2);
    await expect.poll(async () => (await frame.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(viewport.height - 2);
  });
});
