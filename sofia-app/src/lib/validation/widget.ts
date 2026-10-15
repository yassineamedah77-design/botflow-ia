import { z } from "zod";

import { MAX_ALLOWED_DOMAINS, normalizeDomain, VISITOR_MESSAGE_MAX_LENGTH, WIDGET_LANGUAGES } from "@/lib/widget";

/*
 * Inputs of the website widget: its settings (team side) and what a visitor
 * sends (public side, untrusted).
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `${max} caractères maximum.` })
    .optional()
    .transform((value) => value || null);

export const widgetSettingsSchema = z.object({
  enabled: z.boolean(),
  allowedDomains: z
    .array(z.string())
    .max(MAX_ALLOWED_DOMAINS, { error: `${MAX_ALLOWED_DOMAINS} domaines maximum.` })
    .transform((domains, ctx) => {
      const normalized: string[] = [];
      for (const domain of domains) {
        if (!domain.trim()) continue;
        const hostname = normalizeDomain(domain);
        if (!hostname) {
          ctx.addIssue({ code: "custom", message: `« ${domain.trim().slice(0, 60)} » n'est pas un nom de domaine valide (exemple : institut-eclat.fr).` });
          return z.NEVER;
        }
        if (!normalized.includes(hostname)) normalized.push(hostname);
      }
      return normalized;
    }),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, { error: "Couleur au format #RRGGBB." })
    .transform((value) => value.toLowerCase()),
  position: z.enum(["right", "left"]),
  greeting: optionalText(300),
  whatsappButton: z.boolean(),
  privacyUrl: z
    .string()
    .trim()
    .max(300, { error: "300 caractères maximum." })
    .optional()
    .transform((value, ctx) => {
      if (!value) return null;
      try {
        const url = new URL(value);
        if (url.protocol === "https:") return url.toString();
      } catch {
        // Reported below.
      }
      ctx.addIssue({ code: "custom", message: "Adresse complète en https://, par exemple https://institut-eclat.fr/confidentialite." });
      return z.NEVER;
    }),
});
export type WidgetSettingsInput = z.infer<typeof widgetSettingsSchema>;

export const visitorLanguageSchema = z.enum(WIDGET_LANGUAGES);

export const visitorMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: "Message vide." })
    .max(VISITOR_MESSAGE_MAX_LENGTH, { error: "Message trop long." }),
  language: visitorLanguageSchema.optional(),
  /** Page of the website the conversation started on, for the team. */
  pageUrl: z.string().max(500).optional(),
});

export const visitorContactSchema = z
  .object({
    firstName: z.string().trim().min(1, { error: "Prénom requis." }).max(80),
    lastName: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((value) => value || null),
    phone: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => value || null),
    email: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) => value?.toLowerCase() || null)
      .refine((value) => value === null || z.email().safeParse(value).success, { error: "Email invalide." }),
    marketingConsent: z.boolean(),
    /** Honeypot: hidden from people, filled by bots. */
    website: z.string().max(200).optional(),
  })
  .refine((value) => value.phone || value.email, { error: "Téléphone ou email requis.", path: ["phone"] });
export type VisitorContactInput = z.infer<typeof visitorContactSchema>;
