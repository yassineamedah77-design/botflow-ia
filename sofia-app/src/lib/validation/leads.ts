import { z } from "zod";

import { LEAD_STATUSES, MANUAL_SOURCES } from "@/lib/crm";
import { parseAmountToCents } from "@/lib/money";

/** Empty form fields mean "not provided". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `${max} caractères maximum.` })
    .transform((value) => value || null);

const optionalId = z
  .union([z.uuid({ error: "Sélection invalide." }), z.literal("")])
  .transform((value) => value || null);

export const leadFormSchema = z
  .object({
    firstName: optionalText(60),
    lastName: optionalText(60),
    /** Normalised to E.164 on the server with the establishment's country. */
    phone: optionalText(40),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, { error: "Adresse email trop longue." })
      .transform((value) => value || null)
      .refine((value) => value === null || z.email().safeParse(value).success, { error: "Adresse email invalide." }),
    instagramHandle: z
      .string()
      .trim()
      .transform((value) => value.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/+$/, ""))
      .refine((value) => value === "" || /^[A-Za-z0-9._]{1,30}$/.test(value), { error: "Identifiant Instagram invalide." })
      .transform((value) => value || null),
    source: z.enum(MANUAL_SOURCES, { error: "Source invalide." }),
    interestedServiceId: optionalId,
    potentialValue: z
      .string()
      .trim()
      .max(20)
      .transform((value, ctx) => {
        if (!value) return null;
        const cents = parseAmountToCents(value);
        if (cents === null || cents < 0) {
          ctx.addIssue({ code: "custom", message: "Montant invalide (exemple : 180 ou 95,50)." });
          return z.NEVER;
        }
        return cents;
      }),
    assignedToUserId: optionalId,
    marketingConsent: z.enum(["UNKNOWN", "GRANTED", "DENIED"], { error: "Choix invalide." }),
  })
  .superRefine((value, ctx) => {
    if (!value.firstName && !value.lastName && !value.phone && !value.email && !value.instagramHandle) {
      ctx.addIssue({
        code: "custom",
        path: ["firstName"],
        message: "Indiquez au moins un nom, un téléphone, un email ou un compte Instagram.",
      });
    }
  });

export type LeadFormInput = z.infer<typeof leadFormSchema>;

export const leadStatusChangeSchema = z.object({
  leadId: z.uuid({ error: "Contact introuvable." }),
  status: z.enum(LEAD_STATUSES, { error: "Statut invalide." }),
  reason: optionalText(200).optional(),
});

export const leadNoteSchema = z.object({
  leadId: z.uuid({ error: "Contact introuvable." }),
  body: z
    .string()
    .trim()
    .min(1, { error: "La note est vide." })
    .max(2000, { error: "2 000 caractères maximum." }),
});

export const leadAssignmentSchema = z.object({
  leadId: z.uuid({ error: "Contact introuvable." }),
  assignedToUserId: optionalId,
});
