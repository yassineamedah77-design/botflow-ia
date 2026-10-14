import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, isNull, lte, or, sql, sum, type SQL } from "drizzle-orm";

import { LEAD_STATUSES, LEAD_STATUS_META, leadDisplayName, type LeadStatus } from "@/lib/crm";
import { normalizePhone } from "@/lib/phone";
import { LEADS_PAGE_SIZE, type LeadFilters } from "@/lib/leads-filters";
import type { LeadFormInput } from "@/lib/validation/leads";
import type { TenantContext } from "@/server/auth/context";
import { withTenant, type Transaction } from "@/server/db/context";
import {
  appointments,
  consentRecords,
  contactImports,
  conversations,
  leadNotes,
  leadStatusChanges,
  leads,
  memberships,
  revenueAttributions,
  services,
  users,
} from "@/server/db/schema";
import { AppError, isUniqueViolation } from "@/server/errors";
import { recordAudit, recordEvent } from "@/server/observability/audit";
import type { RequestMeta } from "@/server/security/request";

import { requirePermission } from "./guards";
import { notify } from "./notifications";

/*
 * CRM (specification §5): one lead per person, from first message to loyal
 * client. Every pipeline move is kept in lead_status_changes, the source of
 * the funnel analytics and of "lead recovered" attribution.
 */

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/** WHERE clause shared by the table and the Kanban. */
function filterConditions(organizationId: string, filters: LeadFilters, userId: string, now: Date): SQL[] {
  const conditions: SQL[] = [eq(leads.organizationId, organizationId)];
  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    const digits = filters.q.replace(/\D/g, "");
    const matches: SQL[] = [
      ilike(sql`coalesce(${leads.firstName}, '') || ' ' || coalesce(${leads.lastName}, '')`, pattern),
      ilike(sql`coalesce(${leads.lastName}, '') || ' ' || coalesce(${leads.firstName}, '')`, pattern),
      ilike(leads.email, pattern),
      ilike(leads.instagramHandle, `%${escapeLike(filters.q.replace(/^@/, ""))}%`),
    ];
    // "06 39 98" matches +33639980012: compare digits, ignoring the leading 0 of national numbers.
    if (digits.length >= 4) matches.push(sql`${leads.phone} like ${`%${digits.replace(/^0/, "")}%`}`);
    conditions.push(or(...matches)!);
  }
  if (filters.statuses.length) conditions.push(inArray(leads.status, filters.statuses));
  if (filters.source) conditions.push(eq(leads.source, filters.source));
  if (filters.channel) conditions.push(eq(leads.channel, filters.channel));
  if (filters.assignee === "me") conditions.push(eq(leads.assignedToUserId, userId));
  else if (filters.assignee === "none") conditions.push(isNull(leads.assignedToUserId));
  else if (filters.assignee) conditions.push(eq(leads.assignedToUserId, filters.assignee));
  if (filters.followUpDue) conditions.push(lte(leads.nextFollowUpAt, now));
  if (filters.inactiveDays) conditions.push(...inactiveClientConditions(filters.inactiveDays, now));
  if (filters.visits === "once") conditions.push(lte(leads.visitCount, 1));
  if (filters.visits === "repeat") conditions.push(sql`${leads.visitCount} >= 2`);
  return conditions;
}

/**
 * Former clients with no visit for `days` days and nothing booked: the
 * reactivation segments (specification §11). Contacts already being booked or
 * reactivated are left out, so nobody is targeted twice.
 */
export function inactiveClientConditions(days: number, now: Date): SQL[] {
  const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return [
    eq(leads.isExistingClient, true),
    lte(leads.lastAppointmentAt, threshold),
    sql`${leads.status} not in ('BOOKED', 'BOOKING_PENDING', 'REACTIVATION')`,
    sql`not exists (
      select 1 from ${appointments}
      where ${appointments.leadId} = ${leads.id}
        and ${appointments.status} in ('PENDING', 'CONFIRMED')
        and ${appointments.startsAt} > ${now}
    )`,
  ];
}

function orderBy(filters: LeadFilters): SQL[] {
  const direction = filters.direction === "asc" ? sql`asc` : sql`desc`;
  const nulls = sql`nulls last`;
  switch (filters.sort) {
    case "created":
      return [sql`${leads.createdAt} ${direction}`];
    case "score":
      return [sql`${leads.score} ${direction}`, desc(leads.lastInteractionAt)];
    case "value":
      return [sql`${leads.potentialValueCents} ${direction} ${nulls}`, desc(leads.lastInteractionAt)];
    case "spent":
      return [sql`${leads.lifetimeValueCents} ${direction} ${nulls}`, desc(leads.lastAppointmentAt)];
    case "name":
      return [sql`lower(coalesce(${leads.firstName}, ${leads.lastName}, '')) ${direction}`, sql`lower(coalesce(${leads.lastName}, '')) ${direction}`];
    case "followup":
      return [sql`${leads.nextFollowUpAt} ${direction} ${nulls}`];
    case "recent":
    default:
      return [sql`${leads.lastInteractionAt} ${direction} ${nulls}`, desc(leads.createdAt)];
  }
}

const listColumns = {
  id: leads.id,
  firstName: leads.firstName,
  lastName: leads.lastName,
  phone: leads.phone,
  email: leads.email,
  instagramHandle: leads.instagramHandle,
  source: leads.source,
  channel: leads.channel,
  status: leads.status,
  score: leads.score,
  potentialValueCents: leads.potentialValueCents,
  generatedValueCents: leads.generatedValueCents,
  lifetimeValueCents: leads.lifetimeValueCents,
  lastInteractionAt: leads.lastInteractionAt,
  nextFollowUpAt: leads.nextFollowUpAt,
  lastAppointmentAt: leads.lastAppointmentAt,
  visitCount: leads.visitCount,
  isExistingClient: leads.isExistingClient,
  optedOutAt: leads.optedOutAt,
  tags: leads.tags,
  createdAt: leads.createdAt,
  assignedToUserId: leads.assignedToUserId,
  interestedServiceId: leads.interestedServiceId,
};

export interface LeadListRow {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  instagramHandle: string | null;
  source: (typeof leads.$inferSelect)["source"];
  channel: (typeof leads.$inferSelect)["channel"];
  status: LeadStatus;
  score: number;
  potentialValueCents: number | null;
  generatedValueCents: number;
  lifetimeValueCents: number | null;
  lastInteractionAt: Date | null;
  nextFollowUpAt: Date | null;
  nextAppointmentAt: Date | null;
  lastAppointmentAt: Date | null;
  visitCount: number;
  isExistingClient: boolean;
  optedOutAt: Date | null;
  tags: string[];
  createdAt: Date;
  assignee: { id: string; name: string } | null;
  serviceName: string | null;
}

/** Members and services are few: resolve their names in memory instead of joining every row. */
async function lookups(tx: Transaction, organizationId: string) {
  const [members, serviceRows] = [
    await tx
      .select({ id: users.id, name: users.name })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.organizationId, organizationId)),
    await tx.select({ id: services.id, name: services.name }).from(services).where(eq(services.organizationId, organizationId)),
  ];
  return {
    member: new Map(members.map((member) => [member.id, member])),
    service: new Map(serviceRows.map((service) => [service.id, service.name])),
  };
}

type RawRow = { [K in keyof typeof listColumns]: (typeof leads.$inferSelect)[K] } & { nextAppointmentAt: Date | null };

function toListRow(row: RawRow, names: Awaited<ReturnType<typeof lookups>>): LeadListRow {
  const assignee = row.assignedToUserId ? names.member.get(row.assignedToUserId) : undefined;
  return {
    ...row,
    name: leadDisplayName(row),
    assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
    serviceName: row.interestedServiceId ? (names.service.get(row.interestedServiceId) ?? null) : null,
  };
}

function nextAppointmentColumn(now: Date) {
  return sql<Date | null>`(
    select min(${appointments.startsAt}) from ${appointments}
    where ${appointments.leadId} = ${leads.id}
      and ${appointments.status} in ('PENDING', 'CONFIRMED')
      and ${appointments.startsAt} > ${now}
  )`.mapWith((value) => (value ? new Date(value as string) : null));
}

export interface LeadPage {
  rows: LeadListRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listLeads(
  tx: Transaction,
  organizationId: string,
  filters: LeadFilters,
  options: { userId: string; now?: Date; pageSize?: number },
): Promise<LeadPage> {
  const now = options.now ?? new Date();
  const pageSize = options.pageSize ?? LEADS_PAGE_SIZE;
  const where = and(...filterConditions(organizationId, filters, options.userId, now));
  const [{ total } = { total: 0 }] = await tx.select({ total: count() }).from(leads).where(where);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(filters.page, lastPage);
  const rows = await tx
    .select({ ...listColumns, nextAppointmentAt: nextAppointmentColumn(now) })
    .from(leads)
    .where(where)
    .orderBy(...orderBy(filters))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const names = await lookups(tx, organizationId);
  return { rows: rows.map((row) => toListRow(row, names)), total, page, pageSize };
}

export interface PipelineColumn {
  status: LeadStatus;
  label: string;
  count: number;
  potentialValueCents: number;
  leads: LeadListRow[];
}

/** Kanban: every pipeline step with its count and its most recent leads. */
export async function getLeadPipeline(
  tx: Transaction,
  organizationId: string,
  filters: LeadFilters,
  options: { userId: string; now?: Date; perColumn?: number },
): Promise<PipelineColumn[]> {
  const now = options.now ?? new Date();
  const perColumn = options.perColumn ?? 20;
  const where = and(...filterConditions(organizationId, { ...filters, statuses: [] }, options.userId, now));

  const totals = await tx
    .select({ status: leads.status, count: count(), potential: sum(leads.potentialValueCents).mapWith(Number) })
    .from(leads)
    .where(where)
    .groupBy(leads.status);

  const ranked = tx.$with("ranked").as(
    tx
      .select({
        ...listColumns,
        nextAppointmentAt: nextAppointmentColumn(now).as("next_appointment_at"),
        rank: sql<number>`row_number() over (partition by ${leads.status} order by ${leads.lastInteractionAt} desc nulls last, ${leads.createdAt} desc)`.as(
          "rank",
        ),
      })
      .from(leads)
      .where(where),
  );
  const rows = await tx.with(ranked).select().from(ranked).where(lte(ranked.rank, perColumn)).orderBy(asc(ranked.rank));
  const names = await lookups(tx, organizationId);

  return LEAD_STATUSES.map((status) => {
    const total = totals.find((row) => row.status === status);
    return {
      status,
      label: LEAD_STATUS_META[status].label,
      count: total?.count ?? 0,
      potentialValueCents: total?.potential ?? 0,
      leads: rows
        .filter((row) => row.status === status)
        .map((row) => {
          const { rank: _rank, ...rest } = row;
          return toListRow({ ...rest, nextAppointmentAt: rest.nextAppointmentAt ? new Date(rest.nextAppointmentAt) : null }, names);
        }),
    };
  });
}

// ─── Detail ─────────────────────────────────────────────────────────────────

export async function getLeadDetail(tx: Transaction, organizationId: string, leadId: string) {
  const [lead] = await tx
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.organizationId, organizationId)))
    .limit(1);
  if (!lead) return null;

  const names = await lookups(tx, organizationId);
  const service = lead.interestedServiceId
    ? (
        await tx
          .select({ id: services.id, name: services.name, priceCents: services.priceCents, priceType: services.priceType })
          .from(services)
          .where(eq(services.id, lead.interestedServiceId))
      )[0]
    : undefined;

  const notes = await tx
    .select({ id: leadNotes.id, body: leadNotes.body, createdAt: leadNotes.createdAt, authorUserId: leadNotes.authorUserId })
    .from(leadNotes)
    .where(eq(leadNotes.leadId, leadId))
    .orderBy(desc(leadNotes.createdAt));

  const history = await tx
    .select({
      id: leadStatusChanges.id,
      fromStatus: leadStatusChanges.fromStatus,
      toStatus: leadStatusChanges.toStatus,
      actorType: leadStatusChanges.actorType,
      actorUserId: leadStatusChanges.actorUserId,
      reason: leadStatusChanges.reason,
      createdAt: leadStatusChanges.createdAt,
    })
    .from(leadStatusChanges)
    .where(eq(leadStatusChanges.leadId, leadId))
    .orderBy(desc(leadStatusChanges.createdAt), desc(leadStatusChanges.id));

  const leadAppointments = await tx
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      source: appointments.source,
      priceCents: appointments.priceCents,
      serviceId: appointments.serviceId,
    })
    .from(appointments)
    .where(eq(appointments.leadId, leadId))
    .orderBy(desc(appointments.startsAt));

  const leadConversations = await tx
    .select({
      id: conversations.id,
      channel: conversations.channel,
      handlingMode: conversations.handlingMode,
      lastMessageAt: conversations.lastMessageAt,
      lastMessagePreview: conversations.lastMessagePreview,
      unreadCount: conversations.unreadCount,
    })
    .from(conversations)
    .where(eq(conversations.leadId, leadId))
    .orderBy(desc(conversations.lastMessageAt));

  const revenue = await tx
    .select({
      appointmentId: revenueAttributions.appointmentId,
      attributionType: revenueAttributions.attributionType,
      amountCents: revenueAttributions.amountCents,
      status: revenueAttributions.status,
    })
    .from(revenueAttributions)
    .where(eq(revenueAttributions.leadId, leadId));

  const consents = await tx
    .select({
      id: consentRecords.id,
      purpose: consentRecords.purpose,
      status: consentRecords.status,
      channel: consentRecords.channel,
      source: consentRecords.source,
      createdAt: consentRecords.createdAt,
    })
    .from(consentRecords)
    .where(eq(consentRecords.leadId, leadId))
    .orderBy(desc(consentRecords.createdAt));

  const importInfo = lead.importId
    ? (
        await tx
          .select({ fileName: contactImports.fileName, createdAt: contactImports.createdAt })
          .from(contactImports)
          .where(eq(contactImports.id, lead.importId))
      )[0]
    : undefined;

  const memberName = (id: string | null) => (id ? (names.member.get(id)?.name ?? "Ancien membre") : null);
  return {
    lead: { ...lead, name: leadDisplayName(lead) },
    assignee: lead.assignedToUserId ? (names.member.get(lead.assignedToUserId) ?? null) : null,
    service: service ?? null,
    notes: notes.map((note) => ({ ...note, authorName: memberName(note.authorUserId) })),
    history: history.map((change) => ({ ...change, actorName: memberName(change.actorUserId) })),
    appointments: leadAppointments.map((appointment) => ({
      ...appointment,
      serviceName: appointment.serviceId ? (names.service.get(appointment.serviceId) ?? null) : null,
      attribution: revenue.find((row) => row.appointmentId === appointment.id) ?? null,
    })),
    conversations: leadConversations,
    revenue,
    consents,
    importInfo: importInfo ?? null,
  };
}

export type LeadDetail = NonNullable<Awaited<ReturnType<typeof getLeadDetail>>>;

export async function listAssignableMembers(tx: Transaction, organizationId: string) {
  return tx
    .select({ id: users.id, name: users.name, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, organizationId))
    .orderBy(asc(users.name));
}

export async function listServiceOptions(tx: Transaction, organizationId: string) {
  return tx
    .select({ id: services.id, name: services.name, category: services.category })
    .from(services)
    .where(and(eq(services.organizationId, organizationId), eq(services.isActive, true)))
    .orderBy(asc(services.sortOrder), asc(services.name));
}

// ─── Mutations ──────────────────────────────────────────────────────────────

async function assertMember(tx: Transaction, organizationId: string, userId: string | null) {
  if (!userId) return;
  const [member] = await tx
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.organizationId, organizationId), eq(memberships.userId, userId)));
  if (!member) {
    throw new AppError("VALIDATION", "Cette personne ne fait pas partie de l'équipe.", {
      fieldErrors: { assignedToUserId: ["Cette personne ne fait pas partie de l'équipe."] },
    });
  }
}

async function assertService(tx: Transaction, organizationId: string, serviceId: string | null) {
  if (!serviceId) return;
  const [service] = await tx
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.organizationId, organizationId), eq(services.id, serviceId)));
  if (!service) {
    throw new AppError("VALIDATION", "Prestation introuvable.", { fieldErrors: { interestedServiceId: ["Prestation introuvable."] } });
  }
}

type ConsentStatus = (typeof leads.$inferSelect)["marketingConsent"];

/**
 * Consent changes a team member may record. A STOP (WITHDRAWN) can only be
 * lifted by the person, and a known answer never goes back to "unknown".
 * Returns the new status, or null when nothing changes.
 */
export function nextMarketingConsent(current: ConsentStatus, requested: ConsentStatus, optedOut: boolean): ConsentStatus | null {
  if (requested === current) return null;
  if (current === "WITHDRAWN" || requested === "WITHDRAWN") return null;
  if (requested === "UNKNOWN") return null;
  if (requested === "GRANTED" && optedOut) return null;
  return requested;
}

function normalizedPhoneOrError(ctx: TenantContext, phone: string | null) {
  if (!phone) return null;
  const normalized = normalizePhone(phone, ctx.organization.country);
  if (!normalized) {
    throw new AppError("VALIDATION", "Numéro de téléphone invalide.", {
      fieldErrors: { phone: ["Numéro invalide. Exemple : 06 12 34 56 78 ou +351 912 345 678."] },
    });
  }
  return normalized;
}

/** Maps a unique violation to a clear message on the duplicated field. */
async function duplicateError(tx: Transaction, organizationId: string, error: unknown, values: { phone: string | null; email: string | null }) {
  const field = isUniqueViolation(error, "leads_organization_phone_unique")
    ? "phone"
    : isUniqueViolation(error, "leads_organization_email_unique")
      ? "email"
      : null;
  if (!field) return null;
  const value = field === "phone" ? values.phone : values.email;
  const [existing] = value
    ? await tx
        .select({ id: leads.id, firstName: leads.firstName, lastName: leads.lastName, phone: leads.phone, email: leads.email })
        .from(leads)
        .where(and(eq(leads.organizationId, organizationId), eq(field === "phone" ? leads.phone : leads.email, value)))
    : [];
  const who = existing ? ` (${leadDisplayName(existing)})` : "";
  const message = field === "phone" ? `Un contact existe déjà avec ce numéro${who}.` : `Un contact existe déjà avec cet email${who}.`;
  return new AppError("CONFLICT", message, { fieldErrors: { [field]: [message] } });
}

export async function createLead(ctx: TenantContext, input: LeadFormInput, meta: RequestMeta): Promise<{ id: string }> {
  requirePermission(ctx.can("leads:write"));
  const phone = normalizedPhoneOrError(ctx, input.phone);
  const organizationId = ctx.organization.id;
  return withTenant(organizationId, async (tx) => {
    await assertMember(tx, organizationId, input.assignedToUserId);
    await assertService(tx, organizationId, input.interestedServiceId);
    try {
      return await tx.transaction(async (savepoint) => {
        const now = new Date();
        const [lead] = await savepoint
          .insert(leads)
          .values({
            organizationId,
            firstName: input.firstName,
            lastName: input.lastName,
            phone,
            email: input.email,
            instagramHandle: input.instagramHandle,
            source: input.source,
            channel: input.source === "WHATSAPP" || input.source === "INSTAGRAM" || input.source === "WEBSITE" ? input.source : null,
            interestedServiceId: input.interestedServiceId,
            potentialValueCents: input.potentialValue,
            assignedToUserId: input.assignedToUserId,
            marketingConsent: input.marketingConsent,
            marketingConsentUpdatedAt: input.marketingConsent === "UNKNOWN" ? null : now,
            lastInteractionAt: now,
          })
          .returning({ id: leads.id });
        const leadId = lead!.id;
        await savepoint.insert(leadStatusChanges).values({
          organizationId,
          leadId,
          toStatus: "NEW",
          actorType: "USER",
          actorUserId: ctx.user.id,
          reason: "Contact créé par l'équipe",
        });
        if (input.marketingConsent !== "UNKNOWN") {
          await savepoint.insert(consentRecords).values({
            organizationId,
            leadId,
            purpose: "MARKETING",
            status: input.marketingConsent,
            source: "staff_manual",
            proof: { recordedFrom: "lead_form" },
            recordedByUserId: ctx.user.id,
          });
        }
        await recordAudit(savepoint, {
          organizationId,
          actorType: "USER",
          actorUserId: ctx.user.id,
          action: "lead.created",
          entityType: "lead",
          entityId: leadId,
          metadata: { source: input.source },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });
        await recordEvent(savepoint, { organizationId, type: "LEAD_CREATED", message: "Lead created by a team member", entityType: "lead", entityId: leadId });
        if (input.assignedToUserId && input.assignedToUserId !== ctx.user.id) {
          await notify(savepoint, {
            organizationId,
            type: "LEAD_ASSIGNED",
            title: `${ctx.user.name} vous a confié ${leadDisplayName({ ...input, phone })}`,
            linkUrl: `/leads/${leadId}`,
            entityType: "lead",
            entityId: leadId,
            recipients: [input.assignedToUserId],
          });
        }
        return { id: leadId };
      });
    } catch (error) {
      throw (await duplicateError(tx, organizationId, error, { phone, email: input.email })) ?? error;
    }
  });
}

export async function updateLead(ctx: TenantContext, leadId: string, input: LeadFormInput, meta: RequestMeta) {
  requirePermission(ctx.can("leads:write"));
  const phone = normalizedPhoneOrError(ctx, input.phone);
  const organizationId = ctx.organization.id;
  await withTenant(organizationId, async (tx) => {
    const [current] = await tx
      .select({ id: leads.id, marketingConsent: leads.marketingConsent, assignedToUserId: leads.assignedToUserId, optedOutAt: leads.optedOutAt })
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.organizationId, organizationId)))
      .for("update");
    if (!current) throw new AppError("NOT_FOUND", "Ce contact n'existe plus.");
    await assertMember(tx, organizationId, input.assignedToUserId);
    await assertService(tx, organizationId, input.interestedServiceId);
    // A STOP request can only be lifted by the person: the team cannot re-grant consent.
    if (current.optedOutAt && input.marketingConsent === "GRANTED") {
      throw new AppError("VALIDATION", "Ce contact a demandé à ne plus recevoir de messages.", {
        fieldErrors: { marketingConsent: ["Ce contact a demandé à ne plus recevoir de messages (STOP) : seul son propre accord peut le rétablir."] },
      });
    }
    try {
      await tx.transaction(async (savepoint) => {
        const consent = nextMarketingConsent(current.marketingConsent, input.marketingConsent, Boolean(current.optedOutAt));
        await savepoint
          .update(leads)
          .set({
            firstName: input.firstName,
            lastName: input.lastName,
            phone,
            email: input.email,
            instagramHandle: input.instagramHandle,
            source: input.source,
            interestedServiceId: input.interestedServiceId,
            potentialValueCents: input.potentialValue,
            assignedToUserId: input.assignedToUserId,
            ...(consent ? { marketingConsent: consent, marketingConsentUpdatedAt: new Date() } : {}),
          })
          .where(eq(leads.id, leadId));
        if (consent) {
          await savepoint.insert(consentRecords).values({
            organizationId,
            leadId,
            purpose: "MARKETING",
            status: consent,
            source: "staff_manual",
            proof: { recordedFrom: "lead_form", previous: current.marketingConsent },
            recordedByUserId: ctx.user.id,
          });
        }
        await recordAudit(savepoint, {
          organizationId,
          actorType: "USER",
          actorUserId: ctx.user.id,
          action: "lead.updated",
          entityType: "lead",
          entityId: leadId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });
        await recordEvent(savepoint, { organizationId, type: "LEAD_UPDATED", message: "Lead updated by a team member", entityType: "lead", entityId: leadId });
        if (input.assignedToUserId && input.assignedToUserId !== current.assignedToUserId && input.assignedToUserId !== ctx.user.id) {
          await notify(savepoint, {
            organizationId,
            type: "LEAD_ASSIGNED",
            title: `${ctx.user.name} vous a confié ${leadDisplayName({ ...input, phone })}`,
            linkUrl: `/leads/${leadId}`,
            entityType: "lead",
            entityId: leadId,
            recipients: [input.assignedToUserId],
          });
        }
      });
    } catch (error) {
      throw (await duplicateError(tx, organizationId, error, { phone, email: input.email })) ?? error;
    }
  });
}

/** Moves a lead in the pipeline (Kanban drag and drop, status menu) and keeps the history. */
export async function changeLeadStatus(
  ctx: TenantContext,
  input: { leadId: string; status: LeadStatus; reason?: string | null },
  meta: RequestMeta,
): Promise<{ changed: boolean }> {
  requirePermission(ctx.can("leads:write"));
  const organizationId = ctx.organization.id;
  return withTenant(organizationId, async (tx) => {
    const [current] = await tx
      .select({ status: leads.status, firstName: leads.firstName, lastName: leads.lastName, phone: leads.phone, email: leads.email })
      .from(leads)
      .where(and(eq(leads.id, input.leadId), eq(leads.organizationId, organizationId)))
      .for("update");
    if (!current) throw new AppError("NOT_FOUND", "Ce contact n'existe plus.");
    if (current.status === input.status) return { changed: false };

    await tx.update(leads).set({ status: input.status }).where(eq(leads.id, input.leadId));
    await tx.insert(leadStatusChanges).values({
      organizationId,
      leadId: input.leadId,
      fromStatus: current.status,
      toStatus: input.status,
      actorType: "USER",
      actorUserId: ctx.user.id,
      reason: input.reason ?? null,
    });
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "lead.status_changed",
      entityType: "lead",
      entityId: input.leadId,
      metadata: { from: current.status, to: input.status },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    await recordEvent(tx, {
      organizationId,
      type: "LEAD_UPDATED",
      message: `Lead moved from ${current.status} to ${input.status}`,
      entityType: "lead",
      entityId: input.leadId,
    });
    if (input.status === "HOT") {
      await notify(tx, {
        organizationId,
        type: "HOT_LEAD",
        title: `${leadDisplayName(current)} est prêt·e à réserver`,
        body: `Passé en lead chaud par ${ctx.user.name}.`,
        linkUrl: `/leads/${input.leadId}`,
        entityType: "lead",
        entityId: input.leadId,
        recipients: "team",
        excludeUserId: ctx.user.id,
      });
    }
    return { changed: true };
  });
}

export async function assignLead(ctx: TenantContext, input: { leadId: string; assignedToUserId: string | null }, meta: RequestMeta) {
  requirePermission(ctx.can("leads:write"));
  const organizationId = ctx.organization.id;
  await withTenant(organizationId, async (tx) => {
    await assertMember(tx, organizationId, input.assignedToUserId);
    const [current] = await tx
      .select({ assignedToUserId: leads.assignedToUserId, firstName: leads.firstName, lastName: leads.lastName, phone: leads.phone, email: leads.email })
      .from(leads)
      .where(and(eq(leads.id, input.leadId), eq(leads.organizationId, organizationId)))
      .for("update");
    if (!current) throw new AppError("NOT_FOUND", "Ce contact n'existe plus.");
    if (current.assignedToUserId === input.assignedToUserId) return;
    await tx.update(leads).set({ assignedToUserId: input.assignedToUserId }).where(eq(leads.id, input.leadId));
    // The inbox shows the same owner for the person's conversations.
    await tx.update(conversations).set({ assignedToUserId: input.assignedToUserId }).where(eq(conversations.leadId, input.leadId));
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "lead.assigned",
      entityType: "lead",
      entityId: input.leadId,
      metadata: { assignedToUserId: input.assignedToUserId },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    if (input.assignedToUserId && input.assignedToUserId !== ctx.user.id) {
      await notify(tx, {
        organizationId,
        type: "LEAD_ASSIGNED",
        title: `${ctx.user.name} vous a confié ${leadDisplayName(current)}`,
        linkUrl: `/leads/${input.leadId}`,
        entityType: "lead",
        entityId: input.leadId,
        recipients: [input.assignedToUserId],
      });
    }
  });
}

export async function addLeadNote(ctx: TenantContext, input: { leadId: string; body: string }, meta: RequestMeta) {
  requirePermission(ctx.can("leads:write"));
  const organizationId = ctx.organization.id;
  return withTenant(organizationId, async (tx) => {
    const [lead] = await tx
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, input.leadId), eq(leads.organizationId, organizationId)));
    if (!lead) throw new AppError("NOT_FOUND", "Ce contact n'existe plus.");
    const [note] = await tx
      .insert(leadNotes)
      .values({ organizationId, leadId: input.leadId, authorUserId: ctx.user.id, body: input.body })
      .returning({ id: leadNotes.id });
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "lead.note_added",
      entityType: "lead",
      entityId: input.leadId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return { id: note!.id };
  });
}

/** Authors delete their own notes; owners and admins can delete any note. */
export async function deleteLeadNote(ctx: TenantContext, noteId: string, meta: RequestMeta) {
  requirePermission(ctx.can("leads:write"));
  const organizationId = ctx.organization.id;
  await withTenant(organizationId, async (tx) => {
    const [note] = await tx
      .select({ id: leadNotes.id, leadId: leadNotes.leadId, authorUserId: leadNotes.authorUserId })
      .from(leadNotes)
      .where(and(eq(leadNotes.id, noteId), eq(leadNotes.organizationId, organizationId)));
    if (!note) throw new AppError("NOT_FOUND", "Cette note n'existe plus.");
    requirePermission(note.authorUserId === ctx.user.id || ctx.can("leads:delete"), "Seul l'auteur de la note ou un administrateur peut la supprimer.");
    await tx.delete(leadNotes).where(eq(leadNotes.id, noteId));
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "lead.note_deleted",
      entityType: "lead",
      entityId: note.leadId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
}

/**
 * Deletes a contact and everything attached to it (conversations, notes,
 * appointments, attributed revenue). Also how a GDPR erasure request is
 * honoured for one person. The audit trail keeps the id, never the data.
 */
export async function deleteLead(ctx: TenantContext, leadId: string, meta: RequestMeta) {
  requirePermission(ctx.can("leads:delete"), "Seuls les propriétaires et administrateurs peuvent supprimer un contact.");
  const organizationId = ctx.organization.id;
  await withTenant(organizationId, async (tx) => {
    const deleted = await tx
      .delete(leads)
      .where(and(eq(leads.id, leadId), eq(leads.organizationId, organizationId)))
      .returning({ id: leads.id });
    if (deleted.length === 0) throw new AppError("NOT_FOUND", "Ce contact n'existe plus.");
    await recordAudit(tx, {
      organizationId,
      actorType: "USER",
      actorUserId: ctx.user.id,
      action: "lead.deleted",
      entityType: "lead",
      entityId: leadId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });
}

/** Leads whose next follow-up is due. */
export async function countDueFollowUps(tx: Transaction, organizationId: string, now = new Date()) {
  const [row] = await tx
    .select({ value: count() })
    .from(leads)
    .where(and(eq(leads.organizationId, organizationId), lte(leads.nextFollowUpAt, now)));
  return row?.value ?? 0;
}
