import "server-only";

import { and, avg, count, desc, eq, inArray, isNotNull, sql, sum } from "drizzle-orm";

import { leadDisplayName } from "@/lib/crm";
import type { Transaction } from "@/server/db/context";
import { campaignRecipients, campaigns, leads, revenueAttributions, services } from "@/server/db/schema";

import { listContactImports } from "./contact-import";
import { inactiveClientConditions } from "./leads";

/*
 * Reactivation segments (specification §11), computed from the client file
 * and SOFIA's own appointments. Who may be contacted, and how, is part of the
 * answer: explicit consent, existing clients reachable by email or SMS under
 * the soft opt-in rule, and people to leave alone.
 */

export const INACTIVITY_OPTIONS = [60, 90, 120, 180] as const;
export type InactivityDays = (typeof INACTIVITY_OPTIONS)[number];

export function parseInactivity(value: string | string[] | undefined): InactivityDays {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return (INACTIVITY_OPTIONS as readonly number[]).includes(parsed) ? (parsed as InactivityDays) : 90;
}

export type SegmentKey = "never_returned" | "lost";

export interface ReactivationSegment {
  key: SegmentKey;
  count: number;
  /** Explicit marketing consent: reachable on any channel, WhatsApp included (with its own opt-in). */
  withConsent: number;
  /** Consent unknown: email or SMS only, under the existing-client exception, with an opt-out in every message. */
  existingClientRule: number;
  /** Refused, withdrew, or asked to stop: never contacted. */
  excluded: number;
  /** What one more visit from each of them is worth (their own average basket, or the establishment's). */
  oneVisitValueCents: number;
  topClients: Array<{
    id: string;
    name: string;
    visitCount: number;
    lastVisitAt: Date | null;
    lifetimeValueCents: number | null;
    consent: (typeof leads.$inferSelect)["marketingConsent"];
    optedOut: boolean;
  }>;
}

async function averageBasketCents(tx: Transaction, organizationId: string): Promise<number | null> {
  const [fromClients] = await tx
    .select({
      spent: sum(leads.lifetimeValueCents).mapWith(Number),
      visits: sum(leads.visitCount).mapWith(Number),
    })
    .from(leads)
    .where(and(eq(leads.organizationId, organizationId), isNotNull(leads.lifetimeValueCents), sql`${leads.visitCount} > 0`));
  if (fromClients?.spent && fromClients.visits) return Math.round(fromClients.spent / fromClients.visits);
  const [fromServices] = await tx
    .select({ value: avg(services.priceCents).mapWith(Number) })
    .from(services)
    .where(and(eq(services.organizationId, organizationId), eq(services.isActive, true), isNotNull(services.priceCents)));
  return fromServices?.value ? Math.round(fromServices.value) : null;
}

async function segment(tx: Transaction, organizationId: string, key: SegmentKey, days: number, now: Date, basket: number | null): Promise<ReactivationSegment> {
  const where = and(
    eq(leads.organizationId, organizationId),
    ...inactiveClientConditions(days, now),
    key === "never_returned" ? sql`${leads.visitCount} <= 1` : sql`${leads.visitCount} >= 2`,
  );
  const reachable = sql`${leads.optedOutAt} is null`;
  const [totals] = await tx
    .select({
      count: count(),
      withConsent: sql<number>`count(*) filter (where ${leads.marketingConsent} = 'GRANTED' and ${reachable})`.mapWith(Number),
      existingClientRule: sql<number>`count(*) filter (where ${leads.marketingConsent} = 'UNKNOWN' and ${reachable})`.mapWith(Number),
      oneVisitValue: sql<number>`coalesce(sum(coalesce(${leads.lifetimeValueCents} / nullif(${leads.visitCount}, 0), ${basket ?? 0})), 0)`.mapWith(Number),
    })
    .from(leads)
    .where(where);

  const top = await tx
    .select({
      id: leads.id,
      firstName: leads.firstName,
      lastName: leads.lastName,
      phone: leads.phone,
      email: leads.email,
      instagramHandle: leads.instagramHandle,
      visitCount: leads.visitCount,
      lastVisitAt: leads.lastAppointmentAt,
      lifetimeValueCents: leads.lifetimeValueCents,
      consent: leads.marketingConsent,
      optedOutAt: leads.optedOutAt,
    })
    .from(leads)
    .where(where)
    .orderBy(sql`${leads.lifetimeValueCents} desc nulls last`, desc(leads.lastAppointmentAt))
    .limit(5);

  const total = totals?.count ?? 0;
  const withConsent = totals?.withConsent ?? 0;
  const existingClientRule = totals?.existingClientRule ?? 0;
  return {
    key,
    count: total,
    withConsent,
    existingClientRule,
    excluded: total - withConsent - existingClientRule,
    oneVisitValueCents: totals?.oneVisitValue ?? 0,
    topClients: top.map((row) => ({
      id: row.id,
      name: leadDisplayName(row),
      visitCount: row.visitCount,
      lastVisitAt: row.lastVisitAt,
      lifetimeValueCents: row.lifetimeValueCents,
      consent: row.consent,
      optedOut: Boolean(row.optedOutAt),
    })),
  };
}

export async function getReactivationOverview(tx: Transaction, organizationId: string, days: InactivityDays, now = new Date()) {
  const basket = await averageBasketCents(tx, organizationId);
  const [clients] = await tx
    .select({
      total: count(),
      withoutVisitDate: sql<number>`count(*) filter (where ${leads.lastAppointmentAt} is null)`.mapWith(Number),
    })
    .from(leads)
    .where(and(eq(leads.organizationId, organizationId), eq(leads.isExistingClient, true)));

  const neverReturned = await segment(tx, organizationId, "never_returned", days, now, basket);
  const lost = await segment(tx, organizationId, "lost", days, now, basket);

  const campaignRows = await tx
    .select({
      id: campaigns.id,
      name: campaigns.name,
      status: campaigns.status,
      channel: campaigns.channel,
      inactivityDays: campaigns.inactivityDays,
      startedAt: campaigns.startedAt,
      completedAt: campaigns.completedAt,
      recipients: count(campaignRecipients.id),
      replied: sql<number>`count(*) filter (where ${campaignRecipients.repliedAt} is not null and ${campaignRecipients.status} <> 'OPTED_OUT')`.mapWith(Number),
      booked: sql<number>`count(*) filter (where ${campaignRecipients.status} = 'BOOKED')`.mapWith(Number),
      optedOut: sql<number>`count(*) filter (where ${campaignRecipients.status} = 'OPTED_OUT')`.mapWith(Number),
    })
    .from(campaigns)
    .leftJoin(campaignRecipients, eq(campaignRecipients.campaignId, campaigns.id))
    .where(eq(campaigns.organizationId, organizationId))
    .groupBy(campaigns.id)
    .orderBy(desc(campaigns.createdAt))
    .limit(5);

  const revenueByCampaign = new Map<string, { confirmed: number; estimated: number }>();
  if (campaignRows.length > 0) {
    const revenue = await tx
      .select({
        campaignId: campaignRecipients.campaignId,
        status: revenueAttributions.status,
        amount: sum(revenueAttributions.amountCents).mapWith(Number),
      })
      .from(campaignRecipients)
      .innerJoin(revenueAttributions, eq(revenueAttributions.appointmentId, campaignRecipients.bookedAppointmentId))
      .where(inArray(campaignRecipients.campaignId, campaignRows.map((row) => row.id)))
      .groupBy(campaignRecipients.campaignId, revenueAttributions.status);
    for (const row of revenue) {
      const entry = revenueByCampaign.get(row.campaignId) ?? { confirmed: 0, estimated: 0 };
      if (row.status === "CONFIRMED") entry.confirmed += row.amount ?? 0;
      if (row.status === "ESTIMATED") entry.estimated += row.amount ?? 0;
      revenueByCampaign.set(row.campaignId, entry);
    }
  }

  return {
    days,
    averageBasketCents: basket,
    totalClients: clients?.total ?? 0,
    clientsWithoutVisitDate: clients?.withoutVisitDate ?? 0,
    segments: { neverReturned, lost },
    campaigns: campaignRows.map((row) => ({ ...row, revenue: revenueByCampaign.get(row.id) ?? { confirmed: 0, estimated: 0 } })),
    imports: await listContactImports(tx, organizationId, 3),
  };
}

export type ReactivationOverview = Awaited<ReturnType<typeof getReactivationOverview>>;
