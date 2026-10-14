import "server-only";

import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

import { chunkDocument, normalizeForSearch } from "@/lib/knowledge-text";
import { zonedTimeToUtc } from "@/lib/timezone";
import type { ClosureInput, DocumentInput, FaqInput, PractitionerInput, PromotionInput } from "@/lib/validation/knowledge";
import type { TenantContext } from "@/server/auth/context";
import { withTenant, type Transaction } from "@/server/db/context";
import {
  businessClosures,
  faqs,
  knowledgeChunks,
  knowledgeDocuments,
  practitionerServices,
  practitioners,
  promotions,
  services,
} from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { recordAudit } from "@/server/observability/audit";
import type { RequestMeta } from "@/server/security/request";

import { requirePermission } from "./guards";

/*
 * Knowledge base entries added in Phase 3: questions and answers, promotions,
 * practitioners, exceptional closures and documents. Everything here is what
 * SOFIA may tell customers, so every write is reserved to owners and admins
 * and traced in the audit log.
 */

const FORBIDDEN = "Seuls les propriétaires et administrateurs peuvent modifier la Knowledge Base.";

async function audit(tx: Transaction, ctx: TenantContext, meta: RequestMeta, action: string, entityType: string, entityId: string, metadata = {}) {
  await recordAudit(tx, {
    organizationId: ctx.organization.id,
    actorType: "USER",
    actorUserId: ctx.user.id,
    action,
    entityType,
    entityId,
    metadata,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

/** A service id typed by hand could belong to another establishment: only this one's count. */
async function assertServices(tx: Transaction, organizationId: string, serviceIds: Array<string | null>) {
  const ids = [...new Set(serviceIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return;
  const [row] = await tx
    .select({ value: count() })
    .from(services)
    .where(and(eq(services.organizationId, organizationId), inArray(services.id, ids)));
  if ((row?.value ?? 0) !== ids.length) throw new AppError("NOT_FOUND", "Une des prestations choisies n'existe plus.");
}

function notFound(what: string): never {
  throw new AppError("NOT_FOUND", `${what} n'existe plus. Rechargez la page.`);
}

// ─── Questions and answers ──────────────────────────────────────────────────

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  language: string;
  serviceId: string | null;
  serviceName: string | null;
}

export async function listFaqs(tx: Transaction, organizationId: string): Promise<FaqItem[]> {
  return tx
    .select({
      id: faqs.id,
      question: faqs.question,
      answer: faqs.answer,
      language: faqs.language,
      serviceId: faqs.serviceId,
      serviceName: services.name,
    })
    .from(faqs)
    .leftJoin(services, eq(services.id, faqs.serviceId))
    .where(and(eq(faqs.organizationId, organizationId), eq(faqs.isActive, true)))
    .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
}

export async function createFaq(ctx: TenantContext, input: FaqInput, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  return withTenant(ctx.organization.id, async (tx) => {
    await assertServices(tx, ctx.organization.id, [input.serviceId]);
    const [order] = await tx
      .select({ value: sql<number>`coalesce(max(${faqs.sortOrder}), 0)`.mapWith(Number) })
      .from(faqs)
      .where(eq(faqs.organizationId, ctx.organization.id));
    const [created] = await tx
      .insert(faqs)
      .values({ organizationId: ctx.organization.id, sortOrder: (order?.value ?? 0) + 1, ...input })
      .returning({ id: faqs.id });
    await audit(tx, ctx, meta, "knowledge.faq_created", "faq", created!.id, { language: input.language, serviceId: input.serviceId });
    return created!.id;
  });
}

export async function updateFaq(ctx: TenantContext, faqId: string, input: FaqInput, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  await withTenant(ctx.organization.id, async (tx) => {
    await assertServices(tx, ctx.organization.id, [input.serviceId]);
    const updated = await tx
      .update(faqs)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(faqs.id, faqId), eq(faqs.organizationId, ctx.organization.id), eq(faqs.isActive, true)))
      .returning({ id: faqs.id });
    if (updated.length === 0) notFound("Cette question");
    await audit(tx, ctx, meta, "knowledge.faq_updated", "faq", faqId, { language: input.language });
  });
}

export async function deleteFaq(ctx: TenantContext, faqId: string, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  await withTenant(ctx.organization.id, async (tx) => {
    const deleted = await tx
      .delete(faqs)
      .where(and(eq(faqs.id, faqId), eq(faqs.organizationId, ctx.organization.id)))
      .returning({ question: faqs.question });
    if (deleted.length === 0) notFound("Cette question");
    await audit(tx, ctx, meta, "knowledge.faq_deleted", "faq", faqId, { question: deleted[0]!.question.slice(0, 120) });
  });
}

// ─── Promotions ─────────────────────────────────────────────────────────────

export interface PromotionItem {
  id: string;
  title: string;
  description: string | null;
  serviceId: string | null;
  serviceName: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
}

export async function listPromotions(tx: Transaction, organizationId: string): Promise<PromotionItem[]> {
  return tx
    .select({
      id: promotions.id,
      title: promotions.title,
      description: promotions.description,
      serviceId: promotions.serviceId,
      serviceName: services.name,
      startsAt: promotions.startsAt,
      endsAt: promotions.endsAt,
    })
    .from(promotions)
    .leftJoin(services, eq(services.id, promotions.serviceId))
    .where(and(eq(promotions.organizationId, organizationId), eq(promotions.isActive, true)))
    .orderBy(sql`${promotions.endsAt} desc nulls first`, desc(promotions.createdAt));
}

/** "2026-11-01" → midnight of that day in the establishment's time zone. */
function dayStart(isoDate: string, timeZone: string, addDays = 0) {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  return zonedTimeToUtc({ year, month, day: day + addDays }, timeZone);
}

/** The last day is included: the promotion ends at midnight after it. */
function promotionValues(input: PromotionInput, timeZone: string) {
  const { startsOn, endsOn, ...rest } = input;
  return {
    ...rest,
    startsAt: startsOn ? dayStart(startsOn, timeZone) : null,
    endsAt: endsOn ? dayStart(endsOn, timeZone, 1) : null,
  };
}

export async function createPromotion(ctx: TenantContext, input: PromotionInput, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  return withTenant(ctx.organization.id, async (tx) => {
    await assertServices(tx, ctx.organization.id, [input.serviceId]);
    const [created] = await tx
      .insert(promotions)
      .values({ organizationId: ctx.organization.id, ...promotionValues(input, ctx.organization.timezone) })
      .returning({ id: promotions.id });
    await audit(tx, ctx, meta, "knowledge.promotion_created", "promotion", created!.id, { title: input.title });
    return created!.id;
  });
}

export async function updatePromotion(ctx: TenantContext, promotionId: string, input: PromotionInput, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  await withTenant(ctx.organization.id, async (tx) => {
    await assertServices(tx, ctx.organization.id, [input.serviceId]);
    const updated = await tx
      .update(promotions)
      .set({ ...promotionValues(input, ctx.organization.timezone), updatedAt: new Date() })
      .where(and(eq(promotions.id, promotionId), eq(promotions.organizationId, ctx.organization.id), eq(promotions.isActive, true)))
      .returning({ id: promotions.id });
    if (updated.length === 0) notFound("Cette promotion");
    await audit(tx, ctx, meta, "knowledge.promotion_updated", "promotion", promotionId, { title: input.title });
  });
}

export async function deletePromotion(ctx: TenantContext, promotionId: string, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  await withTenant(ctx.organization.id, async (tx) => {
    const deleted = await tx
      .delete(promotions)
      .where(and(eq(promotions.id, promotionId), eq(promotions.organizationId, ctx.organization.id)))
      .returning({ title: promotions.title });
    if (deleted.length === 0) notFound("Cette promotion");
    await audit(tx, ctx, meta, "knowledge.promotion_deleted", "promotion", promotionId, { title: deleted[0]!.title });
  });
}

// ─── Practitioners ──────────────────────────────────────────────────────────

export interface PractitionerItem {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  serviceIds: string[];
}

export async function listPractitioners(tx: Transaction, organizationId: string): Promise<PractitionerItem[]> {
  const rows = await tx
    .select({ id: practitioners.id, name: practitioners.name, title: practitioners.title, bio: practitioners.bio })
    .from(practitioners)
    .where(and(eq(practitioners.organizationId, organizationId), eq(practitioners.isActive, true)))
    .orderBy(asc(practitioners.name));
  const links = await tx
    .select({ practitionerId: practitionerServices.practitionerId, serviceId: practitionerServices.serviceId })
    .from(practitionerServices)
    .where(eq(practitionerServices.organizationId, organizationId));
  return rows.map((row) => ({
    ...row,
    serviceIds: links.filter((link) => link.practitionerId === row.id).map((link) => link.serviceId),
  }));
}

async function replacePractitionerServices(tx: Transaction, organizationId: string, practitionerId: string, serviceIds: string[]) {
  await tx.delete(practitionerServices).where(eq(practitionerServices.practitionerId, practitionerId));
  const unique = [...new Set(serviceIds)];
  if (unique.length > 0) {
    await tx.insert(practitionerServices).values(unique.map((serviceId) => ({ organizationId, practitionerId, serviceId })));
  }
}

export async function createPractitioner(ctx: TenantContext, input: PractitionerInput, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  return withTenant(ctx.organization.id, async (tx) => {
    await assertServices(tx, ctx.organization.id, input.serviceIds);
    const { serviceIds, ...values } = input;
    const [created] = await tx
      .insert(practitioners)
      .values({ organizationId: ctx.organization.id, ...values })
      .returning({ id: practitioners.id });
    await replacePractitionerServices(tx, ctx.organization.id, created!.id, serviceIds);
    await audit(tx, ctx, meta, "knowledge.practitioner_created", "practitioner", created!.id, { name: input.name, services: serviceIds.length });
    return created!.id;
  });
}

export async function updatePractitioner(ctx: TenantContext, practitionerId: string, input: PractitionerInput, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  await withTenant(ctx.organization.id, async (tx) => {
    await assertServices(tx, ctx.organization.id, input.serviceIds);
    const { serviceIds, ...values } = input;
    const updated = await tx
      .update(practitioners)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(practitioners.id, practitionerId), eq(practitioners.organizationId, ctx.organization.id), eq(practitioners.isActive, true)))
      .returning({ id: practitioners.id });
    if (updated.length === 0) notFound("Cette fiche");
    await replacePractitionerServices(tx, ctx.organization.id, practitionerId, serviceIds);
    await audit(tx, ctx, meta, "knowledge.practitioner_updated", "practitioner", practitionerId, { name: input.name, services: serviceIds.length });
  });
}

/** Archived, not deleted: past appointments keep their practitioner. */
export async function archivePractitioner(ctx: TenantContext, practitionerId: string, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  return withTenant(ctx.organization.id, async (tx) => {
    const archived = await tx
      .update(practitioners)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(practitioners.id, practitionerId), eq(practitioners.organizationId, ctx.organization.id), eq(practitioners.isActive, true)))
      .returning({ name: practitioners.name });
    if (archived.length === 0) notFound("Cette fiche");
    await tx.delete(practitionerServices).where(eq(practitionerServices.practitionerId, practitionerId));
    await audit(tx, ctx, meta, "knowledge.practitioner_archived", "practitioner", practitionerId, { name: archived[0]!.name });
    return archived[0]!.name;
  });
}

// ─── Exceptional closures ───────────────────────────────────────────────────

export interface ClosureItem {
  id: string;
  startsOn: string;
  endsOn: string;
  reason: string | null;
}

export async function listClosures(tx: Transaction, organizationId: string): Promise<ClosureItem[]> {
  return tx
    .select({ id: businessClosures.id, startsOn: businessClosures.startsOn, endsOn: businessClosures.endsOn, reason: businessClosures.reason })
    .from(businessClosures)
    .where(eq(businessClosures.organizationId, organizationId))
    .orderBy(desc(businessClosures.startsOn));
}

export async function createClosure(ctx: TenantContext, input: ClosureInput, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  return withTenant(ctx.organization.id, async (tx) => {
    const [created] = await tx
      .insert(businessClosures)
      .values({ organizationId: ctx.organization.id, ...input })
      .returning({ id: businessClosures.id });
    await audit(tx, ctx, meta, "knowledge.closure_created", "business_closure", created!.id, { startsOn: input.startsOn, endsOn: input.endsOn });
    return created!.id;
  });
}

export async function deleteClosure(ctx: TenantContext, closureId: string, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  await withTenant(ctx.organization.id, async (tx) => {
    const deleted = await tx
      .delete(businessClosures)
      .where(and(eq(businessClosures.id, closureId), eq(businessClosures.organizationId, ctx.organization.id)))
      .returning({ startsOn: businessClosures.startsOn, endsOn: businessClosures.endsOn });
    if (deleted.length === 0) notFound("Cette fermeture");
    await audit(tx, ctx, meta, "knowledge.closure_deleted", "business_closure", closureId, deleted[0]!);
  });
}

// ─── Documents ──────────────────────────────────────────────────────────────

export interface DocumentItem {
  id: string;
  title: string;
  content: string;
  status: (typeof knowledgeDocuments.$inferSelect)["status"];
  chunkCount: number;
  updatedAt: Date;
}

export async function listDocuments(tx: Transaction, organizationId: string): Promise<DocumentItem[]> {
  const rows = await tx
    .select({
      id: knowledgeDocuments.id,
      title: knowledgeDocuments.title,
      content: knowledgeDocuments.content,
      status: knowledgeDocuments.status,
      updatedAt: knowledgeDocuments.updatedAt,
    })
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.organizationId, organizationId))
    .orderBy(desc(knowledgeDocuments.updatedAt));
  const counts = await tx
    .select({ documentId: knowledgeChunks.documentId, value: count() })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.organizationId, organizationId))
    .groupBy(knowledgeChunks.documentId);
  const byDocument = new Map(counts.map((row) => [row.documentId, row.value]));
  return rows.map((row) => ({ ...row, content: row.content ?? "", chunkCount: byDocument.get(row.id) ?? 0 }));
}

/** Replaces the passages of a document: they always match its current text. */
async function writeChunks(tx: Transaction, organizationId: string, documentId: string, content: string) {
  await tx.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, documentId));
  const chunks = chunkDocument(content);
  if (chunks.length > 0) {
    await tx.insert(knowledgeChunks).values(
      chunks.map((chunk, position) => ({ organizationId, documentId, position, content: chunk, searchText: normalizeForSearch(chunk) })),
    );
  }
  return chunks.length;
}

export async function createDocument(ctx: TenantContext, input: DocumentInput, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  return withTenant(ctx.organization.id, async (tx) => {
    const [created] = await tx
      .insert(knowledgeDocuments)
      .values({ organizationId: ctx.organization.id, type: "TEXT", title: input.title, content: input.content, status: "READY", createdByUserId: ctx.user.id })
      .returning({ id: knowledgeDocuments.id });
    const chunks = await writeChunks(tx, ctx.organization.id, created!.id, input.content);
    await audit(tx, ctx, meta, "knowledge.document_created", "knowledge_document", created!.id, { title: input.title, length: input.content.length, chunks });
    return created!.id;
  });
}

export async function updateDocument(ctx: TenantContext, documentId: string, input: DocumentInput, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  await withTenant(ctx.organization.id, async (tx) => {
    const updated = await tx
      .update(knowledgeDocuments)
      .set({ title: input.title, content: input.content, status: "READY", error: null, updatedAt: new Date() })
      .where(and(eq(knowledgeDocuments.id, documentId), eq(knowledgeDocuments.organizationId, ctx.organization.id)))
      .returning({ id: knowledgeDocuments.id });
    if (updated.length === 0) notFound("Ce document");
    const chunks = await writeChunks(tx, ctx.organization.id, documentId, input.content);
    await audit(tx, ctx, meta, "knowledge.document_updated", "knowledge_document", documentId, { title: input.title, length: input.content.length, chunks });
  });
}

export async function deleteDocument(ctx: TenantContext, documentId: string, meta: RequestMeta) {
  requirePermission(ctx.can("knowledge:write"), FORBIDDEN);
  await withTenant(ctx.organization.id, async (tx) => {
    const deleted = await tx
      .delete(knowledgeDocuments)
      .where(and(eq(knowledgeDocuments.id, documentId), eq(knowledgeDocuments.organizationId, ctx.organization.id)))
      .returning({ title: knowledgeDocuments.title });
    if (deleted.length === 0) notFound("Ce document");
    await audit(tx, ctx, meta, "knowledge.document_deleted", "knowledge_document", documentId, { title: deleted[0]!.title });
  });
}
