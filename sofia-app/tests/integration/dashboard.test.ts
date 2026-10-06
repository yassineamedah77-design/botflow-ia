import { beforeAll, describe, expect, it } from "vitest";

import type { Transaction } from "@/server/db/context";
import { withTenant } from "@/server/db/context";
import {
  appointments,
  campaignRecipients,
  campaigns,
  conversations,
  followups,
  leadStatusChanges,
  leads,
  messages,
  revenueAttributions,
} from "@/server/db/schema";
import { getChannelPerformance, getDashboardMetrics, getDashboardTrends, type DashboardMetrics } from "@/server/services/dashboard";
import { getPendingRevenue } from "@/server/services/revenue";

import { createEstablishment } from "./helpers";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/**
 * One establishment, one period, every indicator of the dashboard checked
 * against facts written by hand: what counts, what does not, and why.
 */
describe("dashboard indicators", () => {
  const now = new Date();
  const range = { from: new Date(now.getTime() - 10 * DAY), to: now };
  const inRange = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY);
  let organizationId: string;
  let metrics: DashboardMetrics;

  beforeAll(async () => {
    ({ organizationId } = await createEstablishment("Institut Dashboard"));

    await withTenant(organizationId, async (tx: Transaction) => {
      const lead = async (values: Partial<typeof leads.$inferInsert>) =>
        (await tx.insert(leads).values({ organizationId, ...values }).returning({ id: leads.id }))[0]!.id;
      const conversation = async (leadId: string, channel: "WHATSAPP" | "INSTAGRAM" | "WEBSITE") =>
        (await tx.insert(conversations).values({ organizationId, leadId, channel }).returning({ id: conversations.id }))[0]!.id;
      const message = async (conversationId: string, direction: "INBOUND" | "OUTBOUND", createdAt: Date) =>
        (
          await tx
            .insert(messages)
            .values({ organizationId, conversationId, direction, authorType: direction === "INBOUND" ? "CONTACT" : "AI", body: "…", status: direction === "INBOUND" ? "RECEIVED" : "SENT", createdAt })
            .returning({ id: messages.id })
        )[0]!.id;
      const appointment = async (values: Partial<typeof appointments.$inferInsert> & { leadId: string; createdAt: Date }) => {
        const startsAt = values.startsAt ?? new Date(values.createdAt.getTime() + 2 * DAY);
        return (
          await tx
            .insert(appointments)
            .values({ organizationId, source: "AI", createdByType: "AI", startsAt, endsAt: new Date(startsAt.getTime() + HOUR), ...values })
            .returning({ id: appointments.id })
        )[0]!.id;
      };

      // Incoming lead, qualified, booked by SOFIA and honoured: 100 € recovered. Replied to in 20 s.
      const l1 = await lead({ firstName: "Un", source: "WHATSAPP", channel: "WHATSAPP", createdAt: inRange(8) });
      await tx.insert(leadStatusChanges).values({ organizationId, leadId: l1, fromStatus: "CONTACTED", toStatus: "QUALIFIED", actorType: "AI", createdAt: inRange(8) });
      const c1 = await conversation(l1, "WHATSAPP");
      await message(c1, "INBOUND", inRange(8));
      await message(c1, "OUTBOUND", new Date(inRange(8).getTime() + 20_000));
      const a1 = await appointment({ leadId: l1, conversationId: c1, createdAt: inRange(7.9), startsAt: inRange(6), status: "COMPLETED", completedAt: inRange(6), priceCents: 10_000 });
      await tx.insert(revenueAttributions).values({
        organizationId, leadId: l1, appointmentId: a1, attributionType: "APPOINTMENT_GENERATED", revenueSource: "AI_CONVERSATION", amountCents: 10_000, status: "CONFIRMED", attributedAt: inRange(7.9), confirmedAt: inRange(6),
      });

      // Incoming lead never qualified; SOFIA's follow-up two days later is not a "reply".
      const l3 = await lead({ firstName: "Trois", source: "INSTAGRAM", channel: "INSTAGRAM", createdAt: inRange(5) });
      await tx.insert(leadStatusChanges).values({ organizationId, leadId: l3, fromStatus: "NEW", toStatus: "CONTACTED", actorType: "AI", createdAt: inRange(5) });
      const c3 = await conversation(l3, "INSTAGRAM");
      await message(c3, "INBOUND", inRange(5));
      const followUp = await message(c3, "OUTBOUND", inRange(3));
      await tx.insert(followups).values({ organizationId, automationType: "LEAD_RECOVERY", leadId: l3, conversationId: c3, scheduledAt: inRange(3), status: "SENT", processedAt: inRange(3), messageId: followUp, step: 2 });

      // Client from the imported file, back after a reactivation campaign (estimate: not honoured yet).
      const l2 = await lead({ firstName: "Deux", source: "IMPORT", isExistingClient: true, createdAt: inRange(9) });
      const c2 = await conversation(l2, "WHATSAPP");
      const a10 = await appointment({ leadId: l2, conversationId: c2, createdAt: inRange(2), startsAt: new Date(now.getTime() + 3 * DAY), priceCents: 7_000 });
      await tx.insert(revenueAttributions).values({
        organizationId, leadId: l2, appointmentId: a10, attributionType: "CLIENT_REACTIVATED", revenueSource: "REACTIVATION_CAMPAIGN", amountCents: 7_000, status: "ESTIMATED", attributedAt: inRange(2),
      });
      const [campaign] = await tx.insert(campaigns).values({ organizationId, name: "Inactives 90 j", channel: "WHATSAPP", messageTemplate: "…", status: "COMPLETED" }).returning({ id: campaigns.id });
      await tx.insert(campaignRecipients).values({ organizationId, campaignId: campaign!.id, leadId: l2, status: "BOOKED", bookedAppointmentId: a10 });

      // Older lead gone silent, recovered by a follow-up: booked in the period, then moved to another slot.
      const l4 = await lead({ firstName: "Quatre", source: "WEBSITE", channel: "WEBSITE", createdAt: inRange(20) });
      await tx.insert(followups).values({ organizationId, automationType: "LEAD_RECOVERY", leadId: l4, scheduledAt: inRange(4), status: "SENT", processedAt: inRange(4), step: 2 });
      const a4 = await appointment({ leadId: l4, createdAt: inRange(3.5), status: "RESCHEDULED" });
      await appointment({ leadId: l4, createdAt: inRange(1), rescheduledFromId: a4 });

      // A no-show in the period, rebooked with SOFIA: one no-show, one recovered.
      const l5 = await lead({ firstName: "Cinq", source: "INSTAGRAM", channel: "INSTAGRAM", createdAt: inRange(30) });
      const a5 = await appointment({ leadId: l5, createdAt: inRange(15), startsAt: inRange(4), status: "NO_SHOW", noShowAt: inRange(4), priceCents: 9_000 });
      await appointment({ leadId: l5, createdAt: inRange(3), rescheduledFromId: a5 });

      // Booked by the team by phone, honoured: part of the revenue generated, not of SOFIA's.
      const l6 = await lead({ firstName: "Six", source: "MANUAL", createdAt: inRange(40) });
      await appointment({ leadId: l6, source: "STAFF", createdByType: "USER", createdAt: inRange(12), startsAt: inRange(2), status: "COMPLETED", completedAt: inRange(2), priceCents: 5_000 });
    });

    metrics = await withTenant(organizationId, (tx) => getDashboardMetrics(tx, organizationId, range));
  });

  it("counts incoming leads without the imported file, and follows them through the funnel", () => {
    expect(metrics).toMatchObject({ incomingLeads: 2, qualifiedLeads: 1, bookedLeads: 1, showedLeads: 1, conversionRate: 0.5 });
  });

  it("counts SOFIA's bookings, not moves, and the appointments honoured", () => {
    // a1, a4, the no-show rebooking and the reactivated client; the moved copy of a4 is not a booking.
    expect(metrics.appointmentsGenerated).toBe(4);
    expect(metrics.appointmentsHonoured).toBe(1);
    expect(metrics.noShows).toBe(1);
    expect(metrics.noShowsRecovered).toBe(1);
    expect(metrics.leadsRecovered).toBe(1);
    expect(metrics.clientsReactivated).toBe(1);
  });

  it("separates the revenue generated, the revenue recovered and the estimate", async () => {
    expect(metrics.revenueGeneratedCents).toBe(15_000);
    expect(metrics.revenue.totalCents).toBe(10_000);
    expect(metrics.revenue.byType.APPOINTMENT_GENERATED.amountCents).toBe(10_000);
    expect(await withTenant(organizationId, (tx) => getPendingRevenue(tx, organizationId))).toEqual({ amountCents: 7_000, appointments: 1 });
  });

  it("measures the reply delay without counting automated follow-ups", () => {
    expect(metrics.responseTimeSeconds).toBe(20);
  });

  it("splits activity by the channel of each conversation", async () => {
    const channels = await withTenant(organizationId, (tx) => getChannelPerformance(tx, organizationId, range));
    const by = Object.fromEntries(channels.map((row) => [row.channel, row]));
    expect(by.WHATSAPP).toMatchObject({ conversations: 1, incomingLeads: 1, bookedLeads: 1, appointmentsGenerated: 2, recoveredCents: 10_000 });
    expect(by.INSTAGRAM).toMatchObject({ conversations: 1, incomingLeads: 1, bookedLeads: 0, appointmentsGenerated: 1, recoveredCents: 0 });
    expect(by.WEBSITE).toMatchObject({ conversations: 0, incomingLeads: 0, appointmentsGenerated: 1 });
  });

  it("returns fixed windows for the trends", async () => {
    const trends = await withTenant(organizationId, (tx) => getDashboardTrends(tx, organizationId, now, "Europe/Paris"));
    expect(trends.conversationsPerDay).toHaveLength(30);
    expect(trends.leadsPerWeek).toHaveLength(12);
    expect(trends.appointmentsPerWeek).toHaveLength(12);
    expect(trends.recoveredPerMonth).toHaveLength(6);
    // Six leads, one from the imported file: five in the weekly chart (all within 12 weeks).
    expect(trends.leadsPerWeek.reduce((sum, point) => sum + (point.values.leads ?? 0), 0)).toBe(5);
    expect(trends.recoveredPerMonth.reduce((sum, point) => sum + (point.values.recovered ?? 0), 0)).toBe(10_000);
    expect(trends.conversationsPerDay.reduce((sum, point) => sum + (point.values.conversations ?? 0), 0)).toBe(2);
  });
});
