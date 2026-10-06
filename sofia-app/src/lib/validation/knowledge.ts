import { z } from "zod";

import { parseAmountToCents } from "@/lib/money";

/*
 * What SOFIA may tell customers (specification §14), as entered during the
 * onboarding: the establishment, its services and its opening hours.
 */

/** Optional free text: trimmed, empty becomes null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `${max} caractères maximum.` })
    .optional()
    .transform((value) => value || null);

const requiredText = (min: number, max: number, message: string) =>
  z
    .string({ error: message })
    .trim()
    .min(min, { error: message })
    .max(max, { error: `${max} caractères maximum.` });

export const establishmentSchema = z.object({
  assistantName: requiredText(1, 40, "Donnez un prénom à votre assistante."),
  description: optionalText(1500),
  tone: optionalText(300),
  addressLine: requiredText(3, 200, "Indiquez l'adresse de l'établissement."),
  postalCode: requiredText(2, 12, "Indiquez le code postal."),
  city: requiredText(2, 80, "Indiquez la ville."),
  /** Checked and normalised against the establishment's country by the service. */
  phone: requiredText(1, 40, "Indiquez le téléphone de l'établissement."),
  email: z
    .string()
    .trim()
    .max(200, { error: "200 caractères maximum." })
    .optional()
    .transform((value, ctx) => {
      if (!value) return null;
      if (z.email().safeParse(value).success) return value.toLowerCase();
      ctx.addIssue({ code: "custom", message: "Adresse email invalide." });
      return z.NEVER;
    }),
  websiteUrl: z
    .string()
    .trim()
    .max(200, { error: "200 caractères maximum." })
    .optional()
    .transform((value, ctx) => {
      if (!value) return null;
      try {
        const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
        if (url.hostname.includes(".")) return url.toString();
      } catch {
        // Reported below.
      }
      ctx.addIssue({ code: "custom", message: "Adresse de site invalide (ex. maison-eclat.fr)." });
      return z.NEVER;
    }),
  instagramHandle: z
    .string()
    .trim()
    .max(80, { error: "80 caractères maximum." })
    .optional()
    .transform((value, ctx) => {
      if (!value) return null;
      // Accepts "@compte", "compte" or a profile link.
      const handle = value.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
      if (/^[A-Za-z0-9._]{1,30}$/.test(handle)) return handle;
      ctx.addIssue({ code: "custom", message: "Identifiant Instagram invalide." });
      return z.NEVER;
    }),
  cancellationPolicy: optionalText(1000),
  bookingPolicy: optionalText(1000),
  importantInfo: optionalText(1000),
});

export type EstablishmentInput = z.infer<typeof establishmentSchema>;

export const PRICE_TYPES = ["FIXED", "FROM", "ON_CONSULTATION", "FREE"] as const;

export const PRICE_TYPE_LABELS: Record<(typeof PRICE_TYPES)[number], string> = {
  FIXED: "Prix fixe",
  FROM: "À partir de",
  ON_CONSULTATION: "Sur consultation",
  FREE: "Offert",
};

const MAX_PRICE_CENTS = 10_000_000;

export const serviceSchema = z
  .object({
    name: requiredText(2, 80, "Indiquez le nom de la prestation."),
    category: optionalText(60),
    description: optionalText(1000),
    priceType: z.enum(PRICE_TYPES, { error: "Type de prix invalide." }),
    price: z.string().trim().max(20).optional(),
    durationMinutes: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? Number(value) : null))
      .refine((value) => value === null || (Number.isInteger(value) && value >= 5 && value <= 600), {
        error: "Durée en minutes, entre 5 et 600.",
      }),
    preparation: optionalText(1000),
    contraindications: optionalText(1000),
    requiresConsultation: z
      .string()
      .optional()
      .transform((value) => value === "on"),
  })
  .transform((value, ctx) => {
    const { price, ...rest } = value;
    if (value.priceType !== "FIXED" && value.priceType !== "FROM") return { ...rest, priceCents: null };
    const cents = price ? parseAmountToCents(price) : null;
    if (cents === null || cents < 0 || cents > MAX_PRICE_CENTS) {
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message: price ? "Prix invalide (ex. 85 ou 85,50)." : "Indiquez le prix.",
      });
      return z.NEVER;
    }
    return { ...rest, priceCents: cents };
  });

export type ServiceInput = z.infer<typeof serviceSchema>;

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Heure invalide." });

/** The whole week at once: a day without range is closed. */
export const businessHoursSchema = z
  .array(z.object({ day: z.number().int().min(1).max(7), opensAt: clock, closesAt: clock }))
  .max(21, { error: "Trois plages par jour au maximum." })
  .superRefine((ranges, ctx) => {
    ranges.forEach((range, index) => {
      if (range.closesAt <= range.opensAt) {
        ctx.addIssue({ code: "custom", path: [index], message: "L'heure de fermeture doit suivre l'heure d'ouverture." });
      }
    });
    for (let day = 1; day <= 7; day++) {
      const sorted = ranges.filter((range) => range.day === day).sort((a, b) => a.opensAt.localeCompare(b.opensAt));
      if (sorted.length > 3) ctx.addIssue({ code: "custom", path: [], message: "Trois plages par jour au maximum." });
      for (let index = 1; index < sorted.length; index++) {
        if (sorted[index]!.opensAt < sorted[index - 1]!.closesAt) {
          ctx.addIssue({ code: "custom", path: [], message: "Deux plages d'un même jour se chevauchent." });
        }
      }
    }
  });

export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;
