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
  });
});
