import type { KnowledgeService, KnowledgeSnapshot } from "@/server/ai/knowledge";

/*
 * Clínica Lumina, the fictional clinic of the `sofia/` prototype
 * (sofia/fixtures-clinique-demo.md), as a knowledge snapshot. Used by the
 * unit tests and by the test bench (`npm run ai:bench`). Fictional
 * establishment: never present it as a real clinic.
 */

const service = (slug: string, name: string, priceCents: number | null, durationMinutes: number | null, extra: Partial<KnowledgeService> = {}): KnowledgeService => ({
  slug,
  name,
  category: null,
  description: null,
  priceType: priceCents === null ? "ON_CONSULTATION" : "FIXED",
  priceCents,
  durationMinutes,
  preparation: null,
  contraindications: null,
  aftercare: null,
  requiresConsultation: false,
  ...extra,
});

export const LUMINA_GIFT_CARD_DOCUMENT = {
  title: "Cartes cadeaux",
  passages: [
    "Les cartes cadeaux de la Clínica Lumina sont valables 12 mois à compter de la date d'achat. Elles existent en trois montants : 50 €, 100 € et 150 €. " +
      "Elles s'utilisent sur toutes les prestations esthétiques, pas sur les actes de médecine esthétique.",
    "Une carte cadeau perdue ne peut pas être remplacée. Elle n'est ni remboursable ni échangeable contre des espèces.",
  ],
};

export function luminaSnapshot(overrides: Partial<KnowledgeSnapshot> = {}): KnowledgeSnapshot {
  return {
    organization: {
      name: "Clínica Lumina",
      timezone: "Europe/Lisbon",
      defaultLanguage: "pt",
      allowedLanguages: ["pt", "fr", "en"],
      currency: "EUR",
      isDemo: true,
    },
    profile: {
      assistantName: "Sofia",
      description: "Clinique d'esthétique et de médecine esthétique à Braga (établissement fictif de démonstration).",
      tone: "Chaleureux, vouvoiement, phrases courtes",
      address: "Av. Central 120, 4710-229 Braga",
      phone: "+351 253 000 000",
      email: "ola@clinica-lumina.example",
      websiteUrl: "https://clinica-lumina.example/",
      instagramHandle: "clinica.lumina",
      whatsappNumber: null,
      bookingPolicy: "Première visite : arriver 10 minutes en avance.",
      cancellationPolicy: "Annulation ou déplacement gratuits jusqu'à 24 heures avant le rendez-vous.",
      importantInfo: "Parking gratuit au sous-sol de l'immeuble.",
      medicalReferent: "la Dre Marques",
    },
    hours: [
      ...[1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, opensAt: "09:30", closesAt: "19:00" })),
      { dayOfWeek: 6, opensAt: "09:30", closesAt: "13:00" },
    ],
    closures: [],
    services: [
      service("epilation-laser-aisselles", "Épilation laser — aisselles", 4_500, 20, { category: "Épilation", description: "Séance unique." }),
      service("epilation-laser-maillot", "Épilation laser — maillot", 6_500, 30, { category: "Épilation", description: "Séance unique." }),
      service("epilation-laser-demi-jambes", "Épilation laser — demi-jambes", 9_000, 40, { category: "Épilation", description: "Séance unique." }),
      service("epilation-laser-jambes-completes", "Épilation laser — jambes complètes", 14_000, 60, {
        category: "Épilation",
        description: "Séance unique.",
        contraindications: "Grossesse, peau bronzée récemment, traitement photosensibilisant.",
      }),
      service("soin-visage-hydratant", "Soin du visage hydratant", 7_000, 60, { category: "Visage", description: "Diagnostic de peau inclus." }),
      service("peeling-superficiel", "Peeling superficiel", 8_500, 45, { category: "Visage", description: "Crème post-soin incluse." }),
      service("massage-drainant", "Massage drainant", 6_000, 50, { category: "Corps" }),
      service("consultation-medecine-esthetique", "Consultation médecine esthétique", 4_000, 30, {
        category: "Médecine esthétique",
        description: "Montant déduit du premier acte.",
      }),
      service("injections-acide-hyaluronique", "Injections d'acide hyaluronique", null, null, { category: "Médecine esthétique", requiresConsultation: true }),
      service("toxine-botulique", "Toxine botulique", null, null, { category: "Médecine esthétique", requiresConsultation: true }),
      service("mesotherapie", "Mésothérapie", null, null, { category: "Médecine esthétique", requiresConsultation: true }),
      service("microneedling", "Microneedling", null, 60, { category: "Visage", priceType: "FIXED" }),
    ],
    practitioners: [{ name: "Dre Inês Marques", title: "médecin esthétique", bio: null, services: ["Consultation médecine esthétique", "Toxine botulique"] }],
    faqs: [{ question: "Quels moyens de paiement acceptez-vous ?", answer: "Carte bancaire, MB Way et espèces.", language: "fr", serviceName: null }],
    promotions: [],
    documentCount: 1,
    ...overrides,
  };
}
