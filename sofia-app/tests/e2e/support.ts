import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "Eclat-Demo-2026";
export const DEMO = {
  owner: "camille@maison-eclat.example",
  admin: "ines@maison-eclat.example",
  staff: "lea@maison-eclat.example",
};

const OUTBOX = path.resolve(".mail-outbox/e2e");

interface StoredEmail {
  id: string;
  to: string;
  subject: string;
  text: string;
  template: string;
}

/** Waits for the latest email sent to `to` (file transport) and returns it. */
export async function waitForEmail(to: string, template: string, options: { after?: number } = {}): Promise<StoredEmail> {
  let found: StoredEmail | undefined;
  await expect
    .poll(
      async () => {
        const files = (await readdir(OUTBOX).catch(() => [] as string[])).filter((file) => file.endsWith(".json")).sort();
        for (const file of files.reverse()) {
          if (options.after && Number(file.split("-")[0]) < options.after) break;
          const email = JSON.parse(await readFile(path.join(OUTBOX, file), "utf8")) as StoredEmail;
          if (email.to === to && email.template === template) {
            found = email;
            return true;
          }
        }
        return false;
      },
      { timeout: 15_000, message: `email "${template}" to ${to}` },
    )
    .toBe(true);
  return found!;
}

export function linkIn(email: StoredEmail, pathPrefix: string): string {
  const match = email.text.match(new RegExp(`https?://[^\\s]*${pathPrefix.replace(/[/?]/g, "\\$&")}[^\\s]*`));
  if (!match) throw new Error(`No link to ${pathPrefix} in "${email.subject}"`);
  return match[0];
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.example`;
}

/** Signs in from the login page; pass `stay` when already on it (keeps `?next=`). */
export async function login(page: Page, email: string, password = DEMO_PASSWORD, options: { stay?: boolean } = {}) {
  if (!options.stay) await page.goto("/login");
  await page.getByLabel("Email professionnel").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Menu du compte" }).click();
  await page.getByRole("menuitem", { name: "Se déconnecter" }).click();
  await page.waitForURL("**/login");
}
