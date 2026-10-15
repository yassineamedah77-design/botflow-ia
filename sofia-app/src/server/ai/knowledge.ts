import "server-only";

import { and, asc, count, desc, eq, gt, gte, isNull, lte, or, sql } from "drizzle-orm";

import { buildSearchQuery, normalizeForSearch } from "@/lib/knowledge-text";
import { isoDayInZone } from "@/lib/knowledge-dates";
import { withTenant, type Transaction } from "@/server/db/context";
import {
  businessClosures,
  businessHours,
  businessProfiles,
  faqs,
  knowledgeChunks,
  knowledgeDocuments,
  practitionerServices,
  practitioners,
  promotions,
  services,
} from "@/server/db/schema";

/*
 * What SOFIA knows about one establishment, read once per answer in a short
 * transaction: the model call itself never holds a database connection.
 * Plain data, so the prompt builder, the guards and the test bench work the
 * same on a real establishment and on a fixture.
 */

export interface KnowledgeService {
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  priceType: "FIXED" | "FROM" | "ON_CONSULTATION" | "FREE";
  priceCents: number | null;
  durationMinutes: number | null;
  preparation: string | null;
  contraindications: string | null;
  aftercare: string | null;
  requiresConsultation: boolean;
}

export interface KnowledgeSnapshot {
  organization: {
    name: string;
    timezone: string;
    defaultLanguage: string;
    allowedLanguages: string[];
    currency: string;
    isDemo: boolean;
  };
  profile: {
    assistantName: string;
    description: string | null;
    tone: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    websiteUrl: string | null;
    instagramHandle: string | null;
    whatsappNumber: string | null;
    bookingPolicy: string | null;
    cancellationPolicy: string | null;
    importantInfo: string | null;
    medicalReferent: string | null;
  } | null;
  /** ISO weekday 1-7, "HH:MM". */
  hours: Array<{ dayOfWeek: number; opensAt: string; closesAt: string }>;
  /** Current and upcoming closures, "YYYY-MM-DD", last day included. */
  closures: Array<{ startsOn: string; endsOn: string; reason: string | null }>;
  services: KnowledgeService[];
  practitioners: Array<{ name: string; title: string | null; bio: string | null; services: string[] }>;
  faqs: Array<{ question: string; answer: string; language: string; serviceName: string | null }>;
  /** Running promotions only. */
  promotions: Array<{ title: string; description: string | null; serviceName: string | null; endsOn: string | null }>;
  documentCount: number;
}

export interface SearchHit {
  documentTitle: string;
  content: string;
}

/** Looks up passages of the establishment's documents for a question. */
export type KnowledgeSearch = (query: string) => Promise<SearchHit[]>;

export interface SnapshotOrganization {
  id: string;
  name: string;
  timezone: string;
  defaultLanguage: string;
  allowedLanguages: string[];
  currency: string;
  isDemo: boolean;
}

export async function loadKnowledgeSnapshot(tx: Transaction, organization: SnapshotOrganization, now = new Date()): Promise<KnowledgeSnapshot> {
  const organizationId = organization.id;
  const today = isoDayInZone(now, organization.timezone);
  const horizon = isoDayInZone(now, organization.timezone, 366);

  const [profile] = await tx.select().from(businessProfiles).where(eq(businessProfiles.organizationId, organizationId)).limit(1);

  const hours = await tx
    .select({ dayOfWeek: businessHours.dayOfWeek, opensAt: businessHours.opensAt, closesAt: businessHours.closesAt })
    .from(businessHours)
    .where(eq(businessHours.organizationId, organizationId))
    .orderBy(asc(businessHours.dayOfWeek), asc(businessHours.opensAt));

  const closures = await tx
    .select({ startsOn: businessClosures.startsOn, endsOn: businessClosures.endsOn, reason: businessClosures.reason })
    .from(businessClosures)
    .where(and(eq(businessClosures.organizationId, organizationId), gte(businessClosures.endsOn, today), lte(businessClosures.startsOn, horizon)))
    .orderBy(asc(businessClosures.startsOn));

  const serviceRows = await tx
    .select({
      id: services.id,
      slug: services.slug,
      name: services.name,
      category: services.category,
      description: services.description,
      priceType: services.priceType,
      priceCents: services.priceCents,
      durationMinutes: services.durationMinutes,
      preparation: services.preparation,
      contraindications: services.contraindications,
      aftercare: services.aftercare,
      requiresConsultation: services.requiresConsultation,
    })
    .from(services)
    .where(and(eq(services.organizationId, organizationId), eq(services.isActive, true)))
    .orderBy(asc(services.sortOrder), asc(services.name));
  const serviceNames = new Map(serviceRows.map((service) => [service.id, service.name]));

  const practitionerRows = await tx
    .select({ id: practitioners.id, name: practitioners.name, title: practitioners.title, bio: practitioners.bio })
    .from(practitioners)
    .where(and(eq(practitioners.organizationId, organizationId), eq(practitioners.isActive, true)))
    .orderBy(asc(practitioners.name));
  const links = await tx
    .select({ practitionerId: practitionerServices.practitionerId, serviceId: practitionerServices.serviceId })
    .from(practitionerServices)
    .where(eq(practitionerServices.organizationId, organizationId));

  const faqRows = await tx
    .select({ question: faqs.question, answer: faqs.answer, language: faqs.language, serviceId: faqs.serviceId })
    .from(faqs)
    .where(and(eq(faqs.organizationId, organizationId), eq(faqs.isActive, true)))
    .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));

  const promotionRows = await tx
    .select({ title: promotions.title, description: promotions.description, serviceId: promotions.serviceId, endsAt: promotions.endsAt })
    .from(promotions)
    .where(
      and(
        eq(promotions.organizationId, organizationId),
        eq(promotions.isActive, true),
        or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
        or(isNull(promotions.endsAt), gt(promotions.endsAt, now)),
      ),
    )
    .orderBy(asc(promotions.endsAt), asc(promotions.title));

  const [documents] = await tx
    .select({ value: count() })
    .from(knowledgeDocuments)
    .where(and(eq(knowledgeDocuments.organizationId, organizationId), eq(knowledgeDocuments.status, "READY")));

  const address = profile?.addressLine ? [profile.addressLine, [profile.postalCode, profile.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") : null;

  return {
    organization: {
      name: organization.name,
      timezone: organization.timezone,
      defaultLanguage: organization.defaultLanguage,
      allowedLanguages: organization.allowedLanguages,
      currency: organization.currency,
      isDemo: organization.isDemo,
    },
    profile: profile
      ? {
          assistantName: profile.assistantName,
          description: profile.description,
          tone: profile.tone,
          address,
          phone: profile.phone,
          email: profile.email,
          websiteUrl: profile.websiteUrl,
          instagramHandle: profile.instagramHandle,
          whatsappNumber: profile.whatsappNumber,
          bookingPolicy: profile.bookingPolicy,
          cancellationPolicy: profile.cancellationPolicy,
          importantInfo: profile.importantInfo,
          medicalReferent: profile.medicalReferent,
        }
      : null,
    hours: hours.map((range) => ({ dayOfWeek: range.dayOfWeek, opensAt: range.opensAt.slice(0, 5), closesAt: range.closesAt.slice(0, 5) })),
    closures,
    services: serviceRows.map(({ id: _id, ...service }) => service),
    practitioners: practitionerRows.map((practitioner) => ({
      name: practitioner.name,
      title: practitioner.title,
      bio: practitioner.bio,
      services: links
        .filter((link) => link.practitionerId === practitioner.id)
        .map((link) => serviceNames.get(link.serviceId))
        .filter((name): name is string => Boolean(name)),
    })),
    faqs: faqRows.map((faq) => ({
      question: faq.question,
      answer: faq.answer,
      language: faq.language,
      serviceName: faq.serviceId ? (serviceNames.get(faq.serviceId) ?? null) : null,
    })),
    promotions: promotionRows.map((promotion) => ({
      title: promotion.title,
      description: promotion.description,
      serviceName: promotion.serviceId ? (serviceNames.get(promotion.serviceId) ?? null) : null,
      endsOn: promotion.endsAt ? isoDayInZone(promotion.endsAt, organization.timezone, -1) : null,
    })),
    documentCount: documents?.value ?? 0,
  };
}

const SEARCH_LIMIT = 4;

/**
 * Full-text search over the establishment's document passages, ranked by
 * relevance. The expression matches the GIN index of `knowledge_chunks`.
 * Each call is its own short transaction under the establishment's tenant.
 */
export function databaseKnowledgeSearch(organizationId: string): KnowledgeSearch {
  return async (query) => {
    const tsquery = buildSearchQuery(query);
    if (!tsquery) return [];
    return withTenant(organizationId, async (tx) => {
      const vector = sql`to_tsvector('simple', ${knowledgeChunks.searchText})`;
      const parsed = sql`to_tsquery('simple', ${tsquery})`;
      return tx
        .select({ documentTitle: knowledgeDocuments.title, content: knowledgeChunks.content })
        .from(knowledgeChunks)
        .innerJoin(knowledgeDocuments, eq(knowledgeDocuments.id, knowledgeChunks.documentId))
        .where(and(eq(knowledgeChunks.organizationId, organizationId), eq(knowledgeDocuments.status, "READY"), sql`${vector} @@ ${parsed}`))
        .orderBy(desc(sql`ts_rank(${vector}, ${parsed})`), asc(knowledgeChunks.position))
        .limit(SEARCH_LIMIT);
    });
  };
}

/** Same ranking idea without a database, for the test bench and unit tests. */
export function memoryKnowledgeSearch(documents: Array<{ title: string; passages: string[] }>): KnowledgeSearch {
  return async (query) => {
    const tsquery = buildSearchQuery(query);
    if (!tsquery) return [];
    const terms = tsquery.split(" | ").map((term) => term.replace(":*", ""));
    return documents
      .flatMap((document) => document.passages.map((content) => ({ documentTitle: document.title, content })))
      .map((hit) => {
        const words = normalizeForSearch(hit.content).split(/[^a-z0-9]+/);
        const score = terms.filter((term) => words.some((word) => word.startsWith(term))).length;
        return { hit, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, SEARCH_LIMIT)
      .map((entry) => entry.hit);
  };
}
