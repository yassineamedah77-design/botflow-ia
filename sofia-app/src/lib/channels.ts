import type { Channel } from "@/lib/crm";

/**
 * What connecting each channel takes, shown on the channel pages and in the
 * onboarding. Official APIs only: no unofficial WhatsApp or Instagram tools.
 */

export type ChannelSlug = "whatsapp" | "instagram" | "website";

export interface ChannelSetup {
  slug: ChannelSlug;
  channel: Channel;
  title: string;
  provider: "WHATSAPP_CLOUD" | "INSTAGRAM_MESSAGING" | "WEBSITE_WIDGET";
  /** Delivery phase of the connection. */
  phase: number;
  description: string;
  requirements: string[];
}

export const CHANNEL_SETUP: Record<ChannelSlug, ChannelSetup> = {
  whatsapp: {
    slug: "whatsapp",
    channel: "WHATSAPP",
    title: "WhatsApp",
    provider: "WHATSAPP_CLOUD",
    phase: 5,
    description: "SOFIA répond sur votre numéro WhatsApp Business, via l'API officielle de Meta.",
    requirements: [
      "Un compte Meta Business vérifié (justificatifs de l'entreprise)",
      "Un numéro de téléphone dédié, non utilisé dans l'application WhatsApp",
      "La connexion à la WhatsApp Business Platform (Cloud API), sans solution non officielle",
      "Des modèles de messages approuvés par Meta pour les relances au-delà de 24 h",
    ],
  },
  instagram: {
    slug: "instagram",
    channel: "INSTAGRAM",
    title: "Instagram",
    provider: "INSTAGRAM_MESSAGING",
    phase: 6,
    description: "SOFIA répond à vos messages privés Instagram via l'API officielle de Meta.",
    requirements: ["Un compte Instagram professionnel", "Ce compte relié à une page Facebook", "L'autorisation d'accès à la messagerie accordée à SOFIA"],
  },
  website: {
    slug: "website",
    channel: "WEBSITE",
    title: "Site web",
    provider: "WEBSITE_WIDGET",
    phase: 4,
    description: "Un widget de conversation premium sur votre site, ajouté avec une seule ligne de code.",
    requirements: [
      "L'accès à l'administration de votre site (WordPress, Wix, Webflow, Shopify ou code)",
      "La liste des domaines où le widget est autorisé à s'afficher",
    ],
  },
};
