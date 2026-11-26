import { z } from "zod";

/*
 * The three values that connect a WhatsApp Business number to SOFIA, copied
 * from Meta's WhatsApp Manager. They are checked against Meta before the
 * channel shows "Connecté".
 */

const metaId = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{5,30}$/, { error: `${label} : une suite de chiffres, copiée depuis le WhatsApp Manager de Meta.` });

export const whatsappConnectionSchema = z.object({
  phoneNumberId: metaId("Identifiant du numéro"),
  businessAccountId: metaId("Identifiant du compte WhatsApp Business"),
  accessToken: z
    .string()
    .trim()
    .min(20, { error: "Le jeton d'accès semble incomplet : copiez-le en entier." })
    .max(2048, { error: "Le jeton d'accès est trop long." })
    .regex(/^[A-Za-z0-9_\-.|]+$/, { error: "Le jeton d'accès ne doit contenir ni espace ni retour à la ligne." }),
});

export type WhatsappConnectionInput = z.infer<typeof whatsappConnectionSchema>;
