import "server-only";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { hashPassword } from "@/server/auth/password";
import { withSystem, withTenant } from "@/server/db/context";
import {
  businessHours,
  businessProfiles,
  faqs,
  memberships,
  organizations,
  practitionerServices,
  practitioners,
  promotions,
  services,
  users,
} from "@/server/db/schema";
import { provisionOrganization, slugify } from "@/server/services/organizations";

/**
 * Demo establishment "Maison Éclat" (fictional). Phase 1 seeds the business
 * context and the team; conversations, leads, appointments and statistics
 * are added with the dashboard in Phase 2.
 */

export const DEMO_ORGANIZATION_SLUG = "maison-eclat";

export const DEMO_USERS = [
  { email: "camille@maison-eclat.example", name: "Camille Laurent", role: "OWNER" as const },
  { email: "ines@maison-eclat.example", name: "Inès Moreau", role: "ADMIN" as const },
  { email: "lea@maison-eclat.example", name: "Léa Martin", role: "STAFF" as const },
];

const euros = (amount: number) => Math.round(amount * 100);

const SERVICES = [
  {
    name: "Hydrafacial Signature",
    category: "Soins du visage",
    description: "Nettoyage, exfoliation, extraction et hydratation en profondeur en un seul soin.",
    priceType: "FIXED" as const,
    priceCents: euros(180),
    durationMinutes: 60,
    preparation: "Venir sans maquillage si possible. Éviter les gommages dans les 48 h précédentes.",
    contraindications: "Grossesse, rosacée active, coup de soleil, traitement à l'isotrétinoïne en cours.",
  },
  {
    name: "Soin visage Éclat",
    category: "Soins du visage",
    description: "Soin sur-mesure avec diagnostic de peau, massage et masque adapté.",
    priceType: "FIXED" as const,
    priceCents: euros(95),
    durationMinutes: 60,
  },
  {
    name: "Peeling doux",
    category: "Soins du visage",
    description: "Peeling superficiel pour lisser le grain de peau et raviver l'éclat.",
    priceType: "FIXED" as const,
    priceCents: euros(120),
    durationMinutes: 45,
    preparation: "Pas d'exposition solaire dans les 7 jours précédents.",
    contraindications: "Grossesse, allaitement, peau lésée, exposition solaire récente.",
  },
  {
    name: "Microneedling",
    category: "Soins du visage",
    description: "Stimulation du renouvellement cellulaire pour atténuer cicatrices et ridules.",
    priceType: "FIXED" as const,
    priceCents: euros(250),
    durationMinutes: 75,
    contraindications: "Acné active, troubles de la cicatrisation, traitement anticoagulant.",
  },
  {
    name: "LED thérapie",
    category: "Soins du visage",
    description: "Séance de photobiomodulation pour apaiser et régénérer la peau.",
    priceType: "FIXED" as const,
    priceCents: euros(45),
    durationMinutes: 30,
  },
  {
    name: "Épilation laser — aisselles",
    category: "Épilation laser",
    description: "Séance d'épilation laser des aisselles.",
    priceType: "FIXED" as const,
    priceCents: euros(59),
    durationMinutes: 20,
    preparation: "Raser la zone la veille. Pas d'exposition solaire dans les 4 semaines précédentes.",
  },
  {
    name: "Épilation laser — jambes complètes",
    category: "Épilation laser",
    description: "Séance d'épilation laser des jambes complètes.",
    priceType: "FIXED" as const,
    priceCents: euros(189),
    durationMinutes: 60,
    preparation: "Raser la zone la veille. Pas d'exposition solaire dans les 4 semaines précédentes.",
  },
  {
    name: "Massage drainant",
    category: "Corps",
    description: "Massage manuel stimulant la circulation, sensation de légèreté immédiate.",
    priceType: "FIXED" as const,
    priceCents: euros(90),
    durationMinutes: 60,
  },
  {
    name: "Consultation médecine esthétique",
    category: "Médecine esthétique",
    description: "Bilan avec la médecin pour définir un protocole adapté. Déduite du premier acte.",
    priceType: "FIXED" as const,
    priceCents: euros(50),
    durationMinutes: 30,
    requiresConsultation: false,
  },
  {
    name: "Injections d'acide hyaluronique",
    category: "Médecine esthétique",
    description: "Protocole et tarif définis lors de la consultation médicale préalable.",
    priceType: "ON_CONSULTATION" as const,
    priceCents: null,
    durationMinutes: 45,
    requiresConsultation: true,
  },
  {
    name: "Toxine botulique",
    category: "Médecine esthétique",
    description: "Protocole et tarif définis lors de la consultation médicale préalable.",
    priceType: "ON_CONSULTATION" as const,
    priceCents: null,
    durationMinutes: 30,
    requiresConsultation: true,
  },
];

const PRACTITIONERS = [
  {
    name: "Dr Hélène Rousseau",
    title: "Médecin esthétique",
    categories: ["Médecine esthétique"],
  },
  {
    name: "Sarah Benali",
    title: "Esthéticienne experte visage",
    categories: ["Soins du visage", "Corps"],
  },
  {
    name: "Manon Petit",
    title: "Esthéticienne, opératrice laser",
    categories: ["Épilation laser", "Corps"],
  },
];

// ISO weekday → opening ranges (Monday and Sunday closed).
const HOURS: Array<{ day: number; opens: string; closes: string }> = [
  { day: 2, opens: "10:00", closes: "20:00" },
  { day: 3, opens: "10:00", closes: "20:00" },
  { day: 4, opens: "10:00", closes: "20:00" },
  { day: 5, opens: "10:00", closes: "20:00" },
  { day: 6, opens: "09:30", closes: "18:00" },
];

const FAQS = [
  {
    question: "Proposez-vous le paiement en plusieurs fois ?",
    answer: "Oui, en 3 fois sans frais par carte bancaire à partir de 300 € de soins.",
  },
  {
    question: "Où se garer ?",
    answer: "Le parking public le plus proche se trouve à 3 minutes à pied. Nous ne disposons pas de places privées.",
  },
  {
    question: "Vendez-vous des cartes cadeaux ?",
    answer: "Oui, sur place ou par téléphone, pour un soin précis ou un montant libre. Elles sont valables un an.",
  },
  {
    question: "Comment se passe une première visite ?",
    answer: "Nous commençons toujours par un court échange pour comprendre vos attentes, puis nous adaptons le soin.",
  },
];

export interface SeedResult {
  organizationId: string;
  created: boolean;
}

export async function seedMaisonEclat(options: { password: string; reset?: boolean }): Promise<SeedResult> {
  const existing = await withSystem((tx) =>
    tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, DEMO_ORGANIZATION_SLUG)).limit(1),
  );
  if (existing[0] && !options.reset) {
    return { organizationId: existing[0].id, created: false };
  }
  if (existing[0]) {
    await withSystem(async (tx) => {
      await tx.delete(organizations).where(eq(organizations.id, existing[0]!.id));
      for (const user of DEMO_USERS) {
        await tx.delete(users).where(eq(users.email, user.email));
      }
    });
  }

  const passwordHash = await hashPassword(options.password);
  const organizationId = randomUUID();
  const now = new Date();

  await withTenant(organizationId, async (tx) => {
    const userIds = new Map<string, string>();
    for (const demoUser of DEMO_USERS) {
      const [user] = await tx
        .insert(users)
        .values({
          email: demoUser.email,
          name: demoUser.name,
          passwordHash,
          emailVerifiedAt: now,
          termsAcceptedAt: now,
        })
        .onConflictDoUpdate({ target: users.email, set: { name: demoUser.name, passwordHash } })
        .returning({ id: users.id });
      userIds.set(demoUser.email, user!.id);
    }

    const owner = DEMO_USERS[0]!;
    await provisionOrganization(tx, {
      organizationId,
      name: "Maison Éclat",
      ownerUserId: userIds.get(owner.email)!,
    });
    await tx
      .update(organizations)
      .set({ allowedLanguages: ["fr", "en", "pt"], defaultLanguage: "fr" })
      .where(eq(organizations.id, organizationId));

    for (const demoUser of DEMO_USERS.slice(1)) {
      await tx.insert(memberships).values({ organizationId, userId: userIds.get(demoUser.email)!, role: demoUser.role });
    }

    await tx
      .update(businessProfiles)
      .set({
        assistantName: "SOFIA",
        description:
          "Établissement de démonstration. Institut de beauté et de médecine esthétique à Paris : soins du visage, épilation laser, soins du corps et consultations médicales.",
        tone: "Chaleureux et professionnel, vouvoiement, phrases courtes.",
        addressLine: "18 rue de l'Exemple",
        postalCode: "75004",
        city: "Paris",
        country: "FR",
        phone: "+33 1 23 45 67 89",
        email: "contact@maison-eclat.example",
        websiteUrl: "https://maison-eclat.example",
        instagramHandle: "maison.eclat.demo",
        cancellationPolicy:
          "Annulation ou report gratuits jusqu'à 24 h avant le rendez-vous. En deçà, 30 % du soin peuvent être retenus.",
        bookingPolicy: "Un acompte de 30 % est demandé pour les soins de plus de 150 €.",
        importantInfo:
          "Toute question médicale (contre-indication, réaction après un soin, grossesse) est transmise à la Dre Rousseau.",
      })
      .where(eq(businessProfiles.organizationId, organizationId));

    await tx.insert(businessHours).values(
      HOURS.map((range) => ({ organizationId, dayOfWeek: range.day, opensAt: range.opens, closesAt: range.closes })),
    );

    const insertedServices = await tx
      .insert(services)
      .values(
        SERVICES.map((service, index) => ({
          organizationId,
          slug: slugify(service.name),
          sortOrder: index,
          ...service,
        })),
      )
      .returning({ id: services.id, category: services.category, slug: services.slug });

    for (const practitioner of PRACTITIONERS) {
      const [row] = await tx
        .insert(practitioners)
        .values({ organizationId, name: practitioner.name, title: practitioner.title })
        .returning({ id: practitioners.id });
      const linked = insertedServices.filter((service) => practitioner.categories.includes(service.category ?? ""));
      if (linked.length > 0) {
        await tx
          .insert(practitionerServices)
          .values(linked.map((service) => ({ organizationId, practitionerId: row!.id, serviceId: service.id })));
      }
    }

    await tx.insert(faqs).values(FAQS.map((faq, index) => ({ organizationId, sortOrder: index, ...faq })));

    const hydrafacial = insertedServices.find((service) => service.slug === "hydrafacial-signature");
    await tx.insert(promotions).values({
      organizationId,
      serviceId: hydrafacial?.id,
      title: "−15 % sur le premier Hydrafacial",
      description: "Pour toute première visite, sur réservation.",
      startsAt: now,
      endsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
  });

  return { organizationId, created: true };
}
