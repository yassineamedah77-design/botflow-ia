import { z } from "zod";

/*
 * A prospect clinic prepared for a sales call: only what is on its own
 * website. A service without a price is shown and quoted "on consultation":
 * SOFIA never gets a price nobody gave her.
 */

export const DEMO_LANGUAGES = ["pt", "fr"] as const;
export type DemoLanguage = (typeof DEMO_LANGUAGES)[number];

export const MAX_DEMO_SERVICES = 6;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const clock = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure au format 09:30.");

const optionalClock = z
  .string()
  .trim()
  .transform((value) => value || null)
  .pipe(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure au format 09:30.").nullable());

/** "45", "45,50", "45.5 €" → cents; empty → null (price on consultation). */
const price = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const cleaned = value.replace(/€|eur/gi, "").replace(/\s/g, "").replace(",", ".");
    if (!cleaned) return null;
    const amount = Number(cleaned);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000) {
      ctx.addIssue({ code: "custom", message: "Prix invalide : un nombre en euros, ou vide pour « sur consultation »." });
      return z.NEVER;
    }
    return Math.round(amount * 100);
  });

const duration = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (!value) return null;
    const minutes = Number(value);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 600) {
      ctx.addIssue({ code: "custom", message: "Durée en minutes, entre 5 et 600." });
      return z.NEVER;
    }
    return minutes;
  });

export const demoServiceSchema = z.object({ name: z.string().trim().max(120), price, duration });

export const preparedDemoSchema = z
  .object({
    name: z.string().trim().min(2, "Le nom de la clinique est requis.").max(80),
    city: z.string().trim().min(2, "La ville est requise.").max(80),
    addressLine: optionalText(160),
    postalCode: optionalText(20),
    phone: optionalText(40),
    language: z.enum(DEMO_LANGUAGES),
    weekdayOpens: clock,
    weekdayCloses: clock,
    saturdayOpens: optionalClock,
    saturdayCloses: optionalClock,
    services: z.array(demoServiceSchema).length(MAX_DEMO_SERVICES),
  })
  .superRefine((input, ctx) => {
    if (input.weekdayOpens >= input.weekdayCloses) {
      ctx.addIssue({ code: "custom", path: ["weekdayCloses"], message: "La fermeture doit être après l'ouverture." });
    }
    if (Boolean(input.saturdayOpens) !== Boolean(input.saturdayCloses)) {
      ctx.addIssue({ code: "custom", path: ["saturdayCloses"], message: "Indiquez l'ouverture et la fermeture du samedi, ou aucune des deux." });
    } else if (input.saturdayOpens && input.saturdayCloses && input.saturdayOpens >= input.saturdayCloses) {
      ctx.addIssue({ code: "custom", path: ["saturdayCloses"], message: "La fermeture doit être après l'ouverture." });
    }
    const filled = input.services.filter((service) => service.name);
    if (filled.length < 1) {
      ctx.addIssue({ code: "custom", path: ["services"], message: "Ajoutez au moins un soin." });
    }
    input.services.forEach((service, index) => {
      if (!service.name && (service.price !== null || service.duration !== null)) {
        ctx.addIssue({ code: "custom", path: ["services", index, "name"], message: "Nommez ce soin, ou videz la ligne." });
      }
    });
  })
  .transform((input) => ({ ...input, services: input.services.filter((service) => service.name) }));

export type PreparedDemoInput = z.output<typeof preparedDemoSchema>;

/** Reads the flat form fields (service0Name, service0Price…) into the schema's shape. */
export function preparedDemoFromForm(form: Record<string, string>) {
  return {
    name: form.name ?? "",
    city: form.city ?? "",
    addressLine: form.addressLine ?? "",
    postalCode: form.postalCode ?? "",
    phone: form.phone ?? "",
    language: form.language ?? "pt",
    weekdayOpens: form.weekdayOpens ?? "",
    weekdayCloses: form.weekdayCloses ?? "",
    saturdayOpens: form.saturdayOpens ?? "",
    saturdayCloses: form.saturdayCloses ?? "",
    services: Array.from({ length: MAX_DEMO_SERVICES }, (_, index) => ({
      name: form[`service${index}Name`] ?? "",
      price: form[`service${index}Price`] ?? "",
      duration: form[`service${index}Duration`] ?? "",
    })),
  };
}
