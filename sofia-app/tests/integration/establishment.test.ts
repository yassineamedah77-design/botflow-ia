import { describe, expect, it } from "vitest";

import { signIn } from "@/server/auth/service";
import { validateSessionToken } from "@/server/auth/sessions";
import { withSystem, withTenant } from "@/server/db/context";
import {
  appointments,
  businessHours,
  businessProfiles,
  eventLogs,
  leads,
  organizations,
  revenueAttributions,
  services,
} from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { recordEventDetached } from "@/server/observability/audit";
import { consumeRateLimit, resetRateLimit } from "@/server/security/rate-limit";
import { getKnowledgeOverview } from "@/server/services/knowledge";
import {
  createOrganizationForUser,
  getSetupChecklist,
  switchActiveOrganization,
  updateOrganizationSettings,
} from "@/server/services/organizations";
import { getRevenueSummary } from "@/server/services/revenue";
import { DEMO_USERS, seedMaisonEclat } from "@/server/seed/maison-eclat";
import { eq } from "drizzle-orm";

import { addMember, createEstablishment, meta, PASSWORD, uniqueEmail } from "./helpers";

describe("onboarding checklist", () => {
  it("starts empty and only ticks steps backed by real data", async () => {
    const { organizationId } = await createEstablishment();
    const empty = await withTenant(organizationId, (tx) => getSetupChecklist(tx, organizationId));
    expect(Object.values(empty).every((done) => done === false)).toBe(true);

    await withTenant(organizationId, async (tx) => {
      await tx.update(businessProfiles).set({ phone: "+33 1 00 00 00 00", addressLine: "1 rue Test", city: "Lyon" });
      await tx.insert(services).values({ organizationId, name: "Soin", slug: "soin", priceCents: 5000 });
      await tx.insert(businessHours).values({ organizationId, dayOfWeek: 2, opensAt: "09:00", closesAt: "18:00" });
    });
    const filled = await withTenant(organizationId, (tx) => getSetupChecklist(tx, organizationId));
    expect(filled).toMatchObject({ profile: true, services: true, hours: true, whatsapp: false, instagram: false, widget: false, calendar: false, sofiaActive: false });
  });
});

describe("establishment settings", () => {
  it("lets owners and admins update settings, not staff", async () => {
    const { organizationId, ctx: owner } = await createEstablishment();
    const staff = await addMember(organizationId, "STAFF");
    const input = { name: "Nouveau nom", timezone: "Europe/Lisbon", defaultLanguage: "pt", allowedLanguages: ["pt", "fr"] };

    await expect(updateOrganizationSettings(staff.ctx, input, meta)).rejects.toBeInstanceOf(AppError);
    await updateOrganizationSettings(owner, input, meta);
    const [organization] = await withTenant(organizationId, (tx) => tx.select().from(organizations));
    expect(organization).toMatchObject({ name: "Nouveau nom", timezone: "Europe/Lisbon", defaultLanguage: "pt", allowedLanguages: ["pt", "fr"] });
  });

  it("only switches to establishments the user belongs to", async () => {
    const a = await createEstablishment("Switch A");
    const b = await createEstablishment("Switch B");
    const session = (await validateSessionToken(a.sessionToken))!;
    await expect(switchActiveOrganization(session, b.organizationId)).rejects.toBeInstanceOf(AppError);
    expect((await validateSessionToken(a.sessionToken))?.activeOrganizationId).toBe(a.organizationId);
  });

  it("lets an account without establishment create one, once", async () => {
    const { organizationId, ctx } = await createEstablishment();
    const member = await addMember(organizationId, "STAFF");
    await withTenant(organizationId, (tx) => tx.delete(organizations).where(eq(organizations.id, organizationId)));
    const grant = await signIn({ email: member.email, password: PASSWORD }, meta);
    const session = (await validateSessionToken(grant.sessionToken))!;
    expect(session.activeOrganizationId).toBeNull();

    const created = await createOrganizationForUser(session, { organizationName: "Mon nouvel institut" }, meta, { signupEnabled: true });
    expect((await validateSessionToken(grant.sessionToken))?.activeOrganizationId).toBe(created);
    await expect(createOrganizationForUser(session, { organizationName: "Un autre" }, meta, { signupEnabled: true })).rejects.toBeInstanceOf(AppError);
    void ctx;
  });
});

describe("revenue attribution summary", () => {
  it("separates confirmed from estimated revenue and ignores cancellations", async () => {
    const { organizationId } = await createEstablishment();
    const now = new Date();
    await withTenant(organizationId, async (tx) => {
      const [lead] = await tx.insert(leads).values({ organizationId, firstName: "Marie" }).returning({ id: leads.id });
      const makeAppointment = async (offsetDays: number) => {
        const startsAt = new Date(now.getTime() + offsetDays * 24 * 3600 * 1000);
        const [row] = await tx
          .insert(appointments)
          .values({ organizationId, leadId: lead!.id, source: "AI", createdByType: "AI", startsAt, endsAt: new Date(startsAt.getTime() + 3600_000), priceCents: 18_000 })
          .returning({ id: appointments.id });
        return row!.id;
      };
      const [done, upcoming, cancelled] = [await makeAppointment(-1), await makeAppointment(2), await makeAppointment(3)];
      await tx.insert(revenueAttributions).values([
        { organizationId, leadId: lead!.id, appointmentId: done, attributionType: "LEAD_RECOVERED", revenueSource: "LEAD_FOLLOWUP", amountCents: 18_000, status: "CONFIRMED" },
        { organizationId, leadId: lead!.id, appointmentId: upcoming, attributionType: "APPOINTMENT_GENERATED", revenueSource: "AI_CONVERSATION", amountCents: 9_500, status: "ESTIMATED" },
        { organizationId, leadId: lead!.id, appointmentId: cancelled, attributionType: "APPOINTMENT_GENERATED", revenueSource: "AI_CONVERSATION", amountCents: 12_000, status: "CANCELLED" },
      ]);
      // The same appointment can never be counted twice for the same reason.
      await expect(
        tx.transaction((savepoint) =>
          savepoint.insert(revenueAttributions).values({ organizationId, leadId: lead!.id, appointmentId: done, attributionType: "LEAD_RECOVERED", revenueSource: "LEAD_FOLLOWUP", amountCents: 18_000 }),
        ),
      ).rejects.toThrow();
    });

    const summary = await withTenant(organizationId, (tx) =>
      getRevenueSummary(tx, organizationId, { from: new Date(now.getTime() - 3600_000), to: new Date(now.getTime() + 3600_000) }),
    );
    expect(summary).toEqual({ confirmedCents: 18_000, estimatedCents: 9_500, attributedAppointments: 2 });
  });
});

describe("rate limiting", () => {
  it("counts attempts per key and window, and can be reset", async () => {
    const key = uniqueEmail("rate");
    const results = [];
    for (let attempt = 0; attempt < 4; attempt++) results.push(await consumeRateLimit("passwordResetByEmail", key));
    expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
    expect(results[3]!.retryAfterSeconds).toBeGreaterThan(0);
    await resetRateLimit("passwordResetByEmail", key);
    expect((await consumeRateLimit("passwordResetByEmail", key)).allowed).toBe(true);
    // Keys are case-insensitive: the same email in capitals shares the bucket.
    expect((await consumeRateLimit("passwordResetByEmail", key.toUpperCase())).remaining).toBe(1);
  });
});

describe("event log", () => {
  it("persists operational events without secrets", async () => {
    const { organizationId } = await createEstablishment();
    await recordEventDetached({
      organizationId,
      type: "INTEGRATION_ERROR",
      level: "ERROR",
      message: "WhatsApp refused the message",
      details: { status: 401, accessToken: "EAAG-secret" },
    });
    const [event] = await withTenant(organizationId, (tx) => tx.select().from(eventLogs).where(eq(eventLogs.type, "INTEGRATION_ERROR")));
    expect(event?.level).toBe("ERROR");
    expect(event?.details).toEqual({ status: 401, accessToken: "[REDACTED]" });
  });
});

describe("demo establishment seed", () => {
  it("creates Maison Éclat with a usable team and knowledge base, idempotently", async () => {
    const first = await seedMaisonEclat({ password: PASSWORD, reset: true });
    expect(first.created).toBe(true);
    const again = await seedMaisonEclat({ password: PASSWORD });
    expect(again).toEqual({ organizationId: first.organizationId, created: false });

    const knowledge = await withTenant(first.organizationId, (tx) => getKnowledgeOverview(tx, first.organizationId));
    expect(knowledge.services).toHaveLength(11);
    expect(knowledge.services.find((service) => service.name === "Hydrafacial Signature")?.priceCents).toBe(18_000);
    expect(knowledge.services.filter((service) => service.priceType === "ON_CONSULTATION")).toHaveLength(2);
    expect(knowledge.hours).toHaveLength(5);
    expect(knowledge.practitioners).toHaveLength(3);
    expect(knowledge.faqs).toHaveLength(4);
    expect(knowledge.promotions).toHaveLength(1);

    for (const user of DEMO_USERS) {
      const grant = await signIn({ email: user.email, password: PASSWORD }, meta);
      expect(grant.organizationId).toBe(first.organizationId);
    }

    const recreated = await seedMaisonEclat({ password: PASSWORD, reset: true });
    expect(recreated.organizationId).not.toBe(first.organizationId);
    const organizationsLeft = await withSystem((tx) => tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, "maison-eclat")));
    expect(organizationsLeft).toEqual([{ id: recreated.organizationId }]);
  });
});
