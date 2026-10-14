import "server-only";

import { and, asc, eq, gt, isNull, or } from "drizzle-orm";

import type { Transaction } from "@/server/db/context";
import {
  businessClosures,
  businessHours,
  businessProfiles,
  faqs,
  practitionerServices,
  practitioners,
  promotions,
  services,
} from "@/server/db/schema";

/** Everything SOFIA is allowed to tell customers about an establishment. */
export async function getKnowledgeOverview(tx: Transaction, organizationId: string, now = new Date()) {
  const [profile] = await tx
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.organizationId, organizationId))
    .limit(1);

  const hours = await tx
    .select({ dayOfWeek: businessHours.dayOfWeek, opensAt: businessHours.opensAt, closesAt: businessHours.closesAt })
    .from(businessHours)
    .where(eq(businessHours.organizationId, organizationId))
    .orderBy(asc(businessHours.dayOfWeek), asc(businessHours.opensAt));

  const closures = await tx
    .select({ startsOn: businessClosures.startsOn, endsOn: businessClosures.endsOn, reason: businessClosures.reason })
    .from(businessClosures)
    .where(eq(businessClosures.organizationId, organizationId))
    .orderBy(asc(businessClosures.startsOn));

  const serviceRows = await tx
    .select({
      id: services.id,
      name: services.name,
      category: services.category,
      description: services.description,
      priceType: services.priceType,
      priceCents: services.priceCents,
      durationMinutes: services.durationMinutes,
      requiresConsultation: services.requiresConsultation,
      preparation: services.preparation,
      contraindications: services.contraindications,
    })
    .from(services)
    .where(and(eq(services.organizationId, organizationId), eq(services.isActive, true)))
    .orderBy(asc(services.sortOrder), asc(services.name));

  const practitionerRows = await tx
    .select({ id: practitioners.id, name: practitioners.name, title: practitioners.title })
    .from(practitioners)
    .where(and(eq(practitioners.organizationId, organizationId), eq(practitioners.isActive, true)))
    .orderBy(asc(practitioners.name));

  const links = await tx
    .select({ practitionerId: practitionerServices.practitionerId, serviceId: practitionerServices.serviceId })
    .from(practitionerServices)
    .where(eq(practitionerServices.organizationId, organizationId));

  const faqRows = await tx
    .select({ id: faqs.id, question: faqs.question, answer: faqs.answer, serviceId: faqs.serviceId })
    .from(faqs)
    .where(and(eq(faqs.organizationId, organizationId), eq(faqs.isActive, true)))
    .orderBy(asc(faqs.sortOrder));

  const activePromotions = await tx
    .select({ id: promotions.id, title: promotions.title, description: promotions.description, endsAt: promotions.endsAt })
    .from(promotions)
    .where(
      and(
        eq(promotions.organizationId, organizationId),
        eq(promotions.isActive, true),
        or(isNull(promotions.endsAt), gt(promotions.endsAt, now)),
      ),
    );

  const serviceNames = new Map(serviceRows.map((service) => [service.id, service.name]));
  return {
    profile: profile ?? null,
    hours,
    closures,
    services: serviceRows,
    practitioners: practitionerRows.map((practitioner) => ({
      ...practitioner,
      services: links
        .filter((link) => link.practitionerId === practitioner.id)
        .map((link) => serviceNames.get(link.serviceId))
        .filter((name): name is string => Boolean(name)),
    })),
    faqs: faqRows,
    promotions: activePromotions,
  };
}

export type KnowledgeOverview = Awaited<ReturnType<typeof getKnowledgeOverview>>;
