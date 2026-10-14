import { z } from "zod";

/** Languages SOFIA can converse in (specification §24). */
export const SUPPORTED_LANGUAGES = ["fr", "pt", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  fr: "Français",
  pt: "Português (Portugal)",
  en: "English",
};

/** Time zones offered in settings: the establishment markets SOFIA targets first. */
export const TIMEZONES = [
  { value: "Europe/Paris", label: "Paris (France)" },
  { value: "Europe/Lisbon", label: "Lisbonne (Portugal)" },
  { value: "Atlantic/Madeira", label: "Madère (Portugal)" },
  { value: "Atlantic/Azores", label: "Açores (Portugal)" },
  { value: "Europe/Brussels", label: "Bruxelles (Belgique)" },
  { value: "Europe/Luxembourg", label: "Luxembourg" },
  { value: "Europe/Zurich", label: "Zurich (Suisse)" },
  { value: "Europe/Monaco", label: "Monaco" },
  { value: "Indian/Reunion", label: "La Réunion" },
  { value: "America/Martinique", label: "Martinique" },
  { value: "America/Guadeloupe", label: "Guadeloupe" },
  { value: "America/Montreal", label: "Montréal (Canada)" },
] as const;

const timezoneValues = TIMEZONES.map((zone) => zone.value) as [string, ...string[]];

export const organizationSettingsSchema = z
  .object({
    name: z
      .string({ error: "Le nom est requis." })
      .trim()
      .min(2, { error: "Indiquez au moins 2 caractères." })
      .max(80, { error: "80 caractères maximum." }),
    timezone: z.enum(timezoneValues, { error: "Fuseau horaire invalide." }),
    defaultLanguage: z.enum(SUPPORTED_LANGUAGES, { error: "Langue invalide." }),
    allowedLanguages: z
      .array(z.enum(SUPPORTED_LANGUAGES, { error: "Langue invalide." }))
      .min(1, { error: "Choisissez au moins une langue." }),
  })
  .superRefine((value, ctx) => {
    if (!value.allowedLanguages.includes(value.defaultLanguage)) {
      ctx.addIssue({
        code: "custom",
        path: ["defaultLanguage"],
        message: "La langue par défaut doit faire partie des langues autorisées.",
      });
    }
  });

export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>;

export const createOrganizationSchema = z.object({
  organizationName: z
    .string({ error: "Le nom de l'établissement est requis." })
    .trim()
    .min(2, { error: "Indiquez au moins 2 caractères." })
    .max(80, { error: "80 caractères maximum." }),
});
