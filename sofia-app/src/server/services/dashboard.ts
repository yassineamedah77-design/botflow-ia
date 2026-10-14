import "server-only";

import { and, count, eq, gte, inArray, lt, ne, or, sql, type AnyColumn } from "drizzle-orm";

import { CHANNELS, type Channel } from "@/lib/crm";
import type { DateRange } from "@/lib/dashboard";
import { startOfZonedDay, startOfZonedWeek, zonedMonthRange } from "@/lib/timezone";
import type { Transaction } from "@/server/db/context";
import { appointments, campaignRecipients, conversations, leads, messages, revenueAttributions } from "@/server/db/schema";

import { getRecoveredRevenue, type RecoveredRevenue } from "./revenue";

/*
 * Dashboard indicators (specification §12), computed from recorded facts
 * only. Definitions, shown to users next to each figure:
 *
 * - Leads entrants: contacts created in the period, except client-file imports.
 * - Leads qualifiés / ont réservé / sont venues: among those incoming leads,
 *   the ones that reached a qualified status or booked, booked, came, before
 *   the end of the period.
 * - RDV générés: appointments booked by SOFIA in the period. Moving an
 *   appointment is not a new booking; rebooking after a no-show is.
 * - RDV confirmés: appointments booked by SOFIA that took place in the period.
 * - No-shows: missed appointments (any origin) in the period.
 * - No-shows récupérés: new SOFIA bookings in the period replacing a no-show.
 * - Leads récupérés: leads who booked with SOFIA within 30 days of a recovery
 *   follow-up (lead gone silent).
 * - Clientes réactivées: former clients who booked after a reactivation campaign.
 * - CA généré: price of the appointments (any origin) honoured in the period.
 * - CA récupéré: revenue attributed to SOFIA and confirmed (see revenue.ts).
 * - Taux de conversion: incoming leads of the period who booked before its end.
 * - Temps de réponse: delay between a client's last message and the reply
 *   that follows it (SOFIA or team), automated follow-ups excluded.
 */

const SOFIA_SOURCES = ["AI", "WIDGET"] as const;
const QUALIFIED_STATUSES = sql.raw(`('QUALIFIED', 'HOT', 'BOOKING_PENDING', 'BOOKED')`);
const RECOVERY_WINDOW = sql.raw(`interval '30 days'`);

export interface DashboardMetrics {
  incomingLeads: number;
  qualifiedLeads: number;
  bookedLeads: number;
  showedLeads: number;
  appointmentsGenerated: number;
  appointmentsHonoured: number;
  noShows: number;
  noShowsRecovered: number;
  leadsRecovered: number;
  clientsReactivated: number;
  revenueGeneratedCents: number;
  revenue: RecoveredRevenue;
  /** Share of incoming leads who booked; null without incoming leads. */
  conversionRate: number | null;
  /** Average reply delay in seconds; null without any reply. */
  responseTimeSeconds: number | null;
}

const inRange = (column: AnyColumn, range: DateRange) => sql`(${column} >= ${range.from} and ${column} < ${range.to})`;

/**
 * "table"."column" of the outer query, for correlated subqueries. Spelled out
 * because Drizzle leaves columns unqualified in the fields of a single-table
 * select, where they would bind to the subquery's own table instead.
 */
const outer = (table: string, column: string) => sql`${sql.identifier(table)}.${sql.identifier(column)}`;

/** A booking, as opposed to an appointment moved to another slot (rebooking after a no-show counts). */
const isBooking = sql`(${outer("appointments", "rescheduled_from_id")} is null or exists (
  select 1 from ${appointments} as previous where previous.id = ${outer("appointments", "rescheduled_from_id")} and previous.status = 'NO_SHOW'
))`;

/**
 * The lead booked (any outcome) before the end of the period: periods are
 * compared at the same point of their own course, so a month in progress is
 * not measured against a month whose leads had weeks more to decide.
 */
const leadBookedBefore = (end: Date) =>
  sql`exists (select 1 from ${appointments} as a where a.lead_id = ${outer("leads", "id")} and a.created_at < ${end})`;

async function leadFunnel(tx: Transaction, organizationId: string, range: DateRange) {
  const [row] = await tx
    .select({
      incoming: count(),
      qualified: sql<number>`count(*) filter (where ${leadBookedBefore(range.to)} or exists (
        select 1 from lead_status_changes as c
        where c.lead_id = ${outer("leads", "id")} and c.to_status in ${QUALIFIED_STATUSES} and c.created_at < ${range.to}
      ))`.mapWith(Number),
      booked: sql<number>`count(*) filter (where ${leadBookedBefore(range.to)})`.mapWith(Number),
      showed: sql<number>`count(*) filter (where exists (
        select 1 from ${appointments} as a
        where a.lead_id = ${outer("leads", "id")} and a.status = 'COMPLETED' and a.completed_at < ${range.to}
      ))`.mapWith(Number),
    })
    .from(leads)
    .where(and(eq(leads.organizationId, organizationId), gte(leads.createdAt, range.from), lt(leads.createdAt, range.to), ne(leads.source, "IMPORT")));
  return { incoming: row?.incoming ?? 0, qualified: row?.qualified ?? 0, booked: row?.booked ?? 0, showed: row?.showed ?? 0 };
}

async function appointmentMetrics(tx: Transaction, organizationId: string, range: DateRange) {
  const bySofia = inArray(appointments.source, [...SOFIA_SOURCES]);
  const created = inRange(appointments.createdAt, range);
  const [row] = await tx
    .select({
      generated: sql<number>`count(*) filter (where ${bySofia} and ${created} and ${isBooking})`.mapWith(Number),
      honoured: sql<number>`count(*) filter (where ${bySofia} and ${appointments.status} = 'COMPLETED' and ${inRange(appointments.completedAt, range)})`.mapWith(Number),
      noShows: sql<number>`count(*) filter (where ${appointments.status} = 'NO_SHOW' and ${inRange(appointments.noShowAt, range)})`.mapWith(Number),
      noShowsRecovered: sql<number>`count(*) filter (where ${bySofia} and ${created} and ${appointments.rescheduledFromId} is not null and ${isBooking})`.mapWith(Number),
      leadsRecovered: sql<number>`count(distinct ${appointments.leadId}) filter (where ${bySofia} and ${created} and exists (
        select 1 from followups as f
        where f.lead_id = ${outer("appointments", "lead_id")} and f.automation_type = 'LEAD_RECOVERY' and f.status = 'SENT'
          and f.processed_at <= ${outer("appointments", "created_at")} and f.processed_at > ${outer("appointments", "created_at")} - ${RECOVERY_WINDOW}
      ))`.mapWith(Number),
      revenueGenerated: sql<number>`coalesce(sum(${appointments.priceCents}) filter (where ${appointments.status} = 'COMPLETED' and ${inRange(appointments.completedAt, range)}), 0)`.mapWith(Number),
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.organizationId, organizationId),
        or(created, inRange(appointments.completedAt, range), inRange(appointments.noShowAt, range)),
      ),
    );
  return {
    generated: row?.generated ?? 0,
    honoured: row?.honoured ?? 0,
    noShows: row?.noShows ?? 0,
    noShowsRecovered: row?.noShowsRecovered ?? 0,
    leadsRecovered: row?.leadsRecovered ?? 0,
    revenueGeneratedCents: row?.revenueGenerated ?? 0,
  };
}

async function reactivatedClients(tx: Transaction, organizationId: string, range: DateRange) {
  const [row] = await tx
    .select({ value: sql<number>`count(distinct ${campaignRecipients.leadId})`.mapWith(Number) })
    .from(campaignRecipients)
    .innerJoin(appointments, eq(appointments.id, campaignRecipients.bookedAppointmentId))
    .where(
      and(
        eq(campaignRecipients.organizationId, organizationId),
        eq(campaignRecipients.status, "BOOKED"),
        gte(appointments.createdAt, range.from),
        lt(appointments.createdAt, range.to),
      ),
    );
  return row?.value ?? 0;
}

/** Average delay between a client's last message and the reply that follows it. */
async function responseTime(tx: Transaction, organizationId: string, range: DateRange) {
  const margin = sql.raw(`interval '7 days'`);
  const result = await tx.execute<{ replies: number; seconds: number | null }>(sql`
    with ordered as (
      select m.id, m.direction, m.created_at,
        lag(m.direction) over w as previous_direction,
        lag(m.created_at) over w as previous_at
      from ${messages} as m
      where m.organization_id = ${organizationId} and m.author_type <> 'SYSTEM'
        and m.created_at >= ${range.from}::timestamptz - ${margin} and m.created_at < ${range.to}::timestamptz + ${margin}
      window w as (partition by m.conversation_id order by m.created_at, m.id)
    )
    select count(*)::int as replies, avg(extract(epoch from o.created_at - o.previous_at))::float8 as seconds
    from ordered as o
    where o.direction = 'OUTBOUND' and o.previous_direction = 'INBOUND'
      and o.previous_at >= ${range.from} and o.previous_at < ${range.to}
      and not exists (select 1 from followups as f where f.message_id = o.id)
      and not exists (select 1 from ${campaignRecipients} as r where r.message_id = o.id)
  `);
  const row = result.rows[0];
  return row && row.replies > 0 && row.seconds !== null ? Number(row.seconds) : null;
}

export async function getDashboardMetrics(tx: Transaction, organizationId: string, range: DateRange): Promise<DashboardMetrics> {
  // A transaction holds a single connection: queries run one after the other.
  const funnel = await leadFunnel(tx, organizationId, range);
  const booked = await appointmentMetrics(tx, organizationId, range);
  const clientsReactivated = await reactivatedClients(tx, organizationId, range);
  const revenue = await getRecoveredRevenue(tx, organizationId, range);
  const responseTimeSeconds = await responseTime(tx, organizationId, range);
  return {
    incomingLeads: funnel.incoming,
    qualifiedLeads: funnel.qualified,
    bookedLeads: funnel.booked,
    showedLeads: funnel.showed,
    appointmentsGenerated: booked.generated,
    appointmentsHonoured: booked.honoured,
    noShows: booked.noShows,
    noShowsRecovered: booked.noShowsRecovered,
    leadsRecovered: booked.leadsRecovered,
    clientsReactivated,
    revenueGeneratedCents: booked.revenueGeneratedCents,
    revenue,
    conversionRate: funnel.incoming > 0 ? funnel.booked / funnel.incoming : null,
    responseTimeSeconds,
  };
}

// ─── Channels ───────────────────────────────────────────────────────────────

export interface ChannelPerformance {
  channel: Channel;
  conversations: number;
  incomingLeads: number;
  bookedLeads: number;
  appointmentsGenerated: number;
  recoveredCents: number;
}

/** Performance per channel over the period. A booking belongs to the channel of its conversation. */
export async function getChannelPerformance(tx: Transaction, organizationId: string, range: DateRange): Promise<ChannelPerformance[]> {
  const conversationRows = await tx
    .select({ channel: conversations.channel, value: sql<number>`count(distinct ${messages.conversationId})`.mapWith(Number) })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(and(eq(messages.organizationId, organizationId), eq(messages.direction, "INBOUND"), gte(messages.createdAt, range.from), lt(messages.createdAt, range.to)))
    .groupBy(conversations.channel);

  const leadRows = await tx
    .select({
      channel: leads.channel,
      incoming: count(),
      booked: sql<number>`count(*) filter (where ${leadBookedBefore(range.to)})`.mapWith(Number),
    })
    .from(leads)
    .where(and(eq(leads.organizationId, organizationId), gte(leads.createdAt, range.from), lt(leads.createdAt, range.to), ne(leads.source, "IMPORT")))
    .groupBy(leads.channel);

  const bookingChannel = sql<Channel | null>`coalesce(${conversations.channel}, ${leads.channel})`;
  const appointmentRows = await tx
    .select({ channel: bookingChannel, value: count() })
    .from(appointments)
    .innerJoin(leads, eq(leads.id, appointments.leadId))
    .leftJoin(conversations, eq(conversations.id, appointments.conversationId))
    .where(
      and(
        eq(appointments.organizationId, organizationId),
        inArray(appointments.source, [...SOFIA_SOURCES]),
        gte(appointments.createdAt, range.from),
        lt(appointments.createdAt, range.to),
        isBooking,
      ),
    )
    .groupBy(bookingChannel);

  const revenueRows = await tx
    .select({ channel: bookingChannel, value: sql<number>`coalesce(sum(${revenueAttributions.amountCents}), 0)`.mapWith(Number) })
    .from(revenueAttributions)
    .innerJoin(appointments, eq(appointments.id, revenueAttributions.appointmentId))
    .innerJoin(leads, eq(leads.id, revenueAttributions.leadId))
    .leftJoin(conversations, eq(conversations.id, appointments.conversationId))
    .where(
      and(
        eq(revenueAttributions.organizationId, organizationId),
        eq(revenueAttributions.status, "CONFIRMED"),
        gte(revenueAttributions.confirmedAt, range.from),
        lt(revenueAttributions.confirmedAt, range.to),
      ),
    )
    .groupBy(bookingChannel);

  return CHANNELS.map((channel) => {
    const lead = leadRows.find((row) => row.channel === channel);
    return {
      channel,
      conversations: conversationRows.find((row) => row.channel === channel)?.value ?? 0,
      incomingLeads: lead?.incoming ?? 0,
      bookedLeads: lead?.booked ?? 0,
      appointmentsGenerated: appointmentRows.find((row) => row.channel === channel)?.value ?? 0,
      recoveredCents: revenueRows.find((row) => row.channel === channel)?.value ?? 0,
    };
  });
}

// ─── Trends ─────────────────────────────────────────────────────────────────

export interface TrendPoint {
  /** Start of the bucket (day, week or month) in the establishment's time zone. */
  start: Date;
  values: Record<string, number>;
}

export interface DashboardTrends {
  conversationsPerDay: TrendPoint[];
  leadsPerWeek: TrendPoint[];
  appointmentsPerWeek: TrendPoint[];
  recoveredPerMonth: TrendPoint[];
}

/** Wall-clock key of a bucket start, as `to_char` returns it. */
function bucketKey(date: Date, timeZone: string, unit: "day" | "month") {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return unit === "month" ? parts.slice(0, 7) : parts;
}

/**
 * Fixed windows, whatever the selected period: 30 days of conversations,
 * 12 weeks of leads, 8 past and 4 coming weeks of appointments, 6 months of
 * recovered revenue.
 */
export async function getDashboardTrends(tx: Transaction, organizationId: string, now: Date, timeZone: string): Promise<DashboardTrends> {
  const days = Array.from({ length: 30 }, (_, index) => startOfZonedDay(now, timeZone, index - 29));
  const leadWeeks = Array.from({ length: 12 }, (_, index) => startOfZonedWeek(now, timeZone, index - 11));
  const appointmentWeeks = Array.from({ length: 12 }, (_, index) => startOfZonedWeek(now, timeZone, index - 8));
  const months = Array.from({ length: 6 }, (_, index) => zonedMonthRange(now, timeZone, index - 5).from);

  // Grouped by position: the time zone is a parameter, so the select and
  // group by expressions would not be recognised as the same.
  const local = (column: AnyColumn) => sql`(${column} at time zone ${timeZone})`;
  const dayKey = (column: AnyColumn) => sql<string>`to_char(${local(column)}, 'YYYY-MM-DD')`;
  const weekKey = (column: AnyColumn) => sql<string>`to_char(date_trunc('week', ${local(column)}), 'YYYY-MM-DD')`;
  const monthKey = (column: AnyColumn) => sql<string>`to_char(date_trunc('month', ${local(column)}), 'YYYY-MM')`;

  const conversationRows = await tx
    .select({ key: dayKey(messages.createdAt), value: sql<number>`count(distinct ${messages.conversationId})`.mapWith(Number) })
    .from(messages)
    .where(and(eq(messages.organizationId, organizationId), eq(messages.direction, "INBOUND"), gte(messages.createdAt, days[0]!)))
    .groupBy(sql`1`);

  const leadRows = await tx
    .select({ key: weekKey(leads.createdAt), value: count() })
    .from(leads)
    .where(and(eq(leads.organizationId, organizationId), ne(leads.source, "IMPORT"), gte(leads.createdAt, leadWeeks[0]!)))
    .groupBy(sql`1`);

  const appointmentRows = await tx
    .select({
      key: weekKey(appointments.startsAt),
      honoured: sql<number>`count(*) filter (where ${appointments.status} = 'COMPLETED')`.mapWith(Number),
      missed: sql<number>`count(*) filter (where ${appointments.status} in ('NO_SHOW', 'CANCELLED'))`.mapWith(Number),
      noShow: sql<number>`count(*) filter (where ${appointments.status} = 'NO_SHOW')`.mapWith(Number),
      planned: sql<number>`count(*) filter (where ${appointments.status} in ('PENDING', 'CONFIRMED'))`.mapWith(Number),
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.organizationId, organizationId),
        inArray(appointments.source, [...SOFIA_SOURCES]),
        ne(appointments.status, "RESCHEDULED"),
        gte(appointments.startsAt, appointmentWeeks[0]!),
        lt(appointments.startsAt, startOfZonedWeek(now, timeZone, 4)),
      ),
    )
    .groupBy(sql`1`);

  const revenueRows = await tx
    .select({ key: monthKey(revenueAttributions.confirmedAt), value: sql<number>`coalesce(sum(${revenueAttributions.amountCents}), 0)`.mapWith(Number) })
    .from(revenueAttributions)
    .where(and(eq(revenueAttributions.organizationId, organizationId), eq(revenueAttributions.status, "CONFIRMED"), gte(revenueAttributions.confirmedAt, months[0]!)))
    .groupBy(sql`1`);

  return {
    conversationsPerDay: days.map((start) => ({
      start,
      values: { conversations: conversationRows.find((row) => row.key === bucketKey(start, timeZone, "day"))?.value ?? 0 },
    })),
    leadsPerWeek: leadWeeks.map((start) => ({
      start,
      values: { leads: leadRows.find((row) => row.key === bucketKey(start, timeZone, "day"))?.value ?? 0 },
    })),
    appointmentsPerWeek: appointmentWeeks.map((start) => {
      const row = appointmentRows.find((candidate) => candidate.key === bucketKey(start, timeZone, "day"));
      return {
        start,
        values: { honoured: row?.honoured ?? 0, missed: row?.missed ?? 0, noShow: row?.noShow ?? 0, planned: row?.planned ?? 0 },
      };
    }),
    recoveredPerMonth: months.map((start) => ({
      start,
      values: { recovered: revenueRows.find((row) => row.key === bucketKey(start, timeZone, "month"))?.value ?? 0 },
    })),
  };
}
