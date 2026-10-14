import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { businessHoursSchema, establishmentSchema, serviceSchema } from "@/lib/validation/knowledge";
import { withTenant } from "@/server/db/context";
import { services } from "@/server/db/schema";
import { getSetupChecklist } from "@/server/services/organizations";
import {
  archiveService,
  createService,
  getEstablishmentProfile,
  listActiveServices,
  listOpeningHours,
  saveEstablishmentProfile,
  saveOpeningHours,
  updateService,
} from "@/server/services/setup";

import { addMember, createEstablishment, meta } from "./helpers";

const establishment = establishmentSchema.parse({
  assistantName: "Léa",
  description: "Institut de beauté à Lyon.",
  tone: "Chaleureux, vouvoiement",
  addressLine: "3 place Bellecour",
  postalCode: "69002",
  city: "Lyon",
  phone: "04 78 00 00 00",
  email: "",
  websiteUrl: "institut-lyon.fr",
  instagramHandle: "@institut.lyon",
});

describe("onboarding: what SOFIA may tell customers", () => {
  let owner: Awaited<ReturnType<typeof createEstablishment>>;
  let staff: Awaited<ReturnType<typeof addMember>>;

  beforeAll(async () => {
    owner = await createEstablishment("Institut Lyon");
    staff = await addMember(owner.organizationId, "STAFF");
  });

  it("starts with an empty checklist", async () => {
    const checklist = await withTenant(owner.organizationId, (tx) => getSetupChecklist(tx, owner.organizationId));
    expect(Object.values(checklist).every((done) => !done)).toBe(true);
  });

  it("saves the establishment with a normalised phone, then updates it in place", async () => {
    await expect(saveEstablishmentProfile(staff.ctx, establishment, meta)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(saveEstablishmentProfile(owner.ctx, { ...establishment, phone: "12" }, meta)).rejects.toMatchObject({ code: "VALIDATION" });

    await saveEstablishmentProfile(owner.ctx, establishment, meta);
    await saveEstablishmentProfile(owner.ctx, { ...establishment, city: "Lyon 2e" }, meta);
    const profile = await withTenant(owner.organizationId, (tx) => getEstablishmentProfile(tx, owner.organizationId));
    expect(profile).toMatchObject({
      assistantName: "Léa",
      phone: "+33 4 78 00 00 00",
      city: "Lyon 2e",
      websiteUrl: "https://institut-lyon.fr/",
      instagramHandle: "institut.lyon",
      email: null,
    });
  });

  it("manages services with unique slugs, real prices and archiving", async () => {
    const facial = serviceSchema.parse({ name: "Soin Éclat", priceType: "FIXED", price: "85,50", durationMinutes: "60" });
    const first = await createService(owner.ctx, facial, meta);
    const second = await createService(owner.ctx, facial, meta);
    await createService(owner.ctx, serviceSchema.parse({ name: "Injections", priceType: "ON_CONSULTATION", requiresConsultation: "on" }), meta);
    await expect(createService(staff.ctx, facial, meta)).rejects.toMatchObject({ code: "FORBIDDEN" });

    const slugs = await withTenant(owner.organizationId, (tx) => tx.select({ id: services.id, slug: services.slug, priceCents: services.priceCents }).from(services));
    expect(slugs.find((row) => row.id === first)).toMatchObject({ slug: "soin-eclat", priceCents: 8_550 });
    expect(slugs.find((row) => row.id === second)?.slug).toBe("soin-eclat-2");

    await updateService(owner.ctx, second, serviceSchema.parse({ name: "Soin Éclat duo", priceType: "FROM", price: "150" }), meta);
    await archiveService(owner.ctx, first, meta);
    await expect(updateService(owner.ctx, first, facial, meta)).rejects.toMatchObject({ code: "NOT_FOUND" });

    const active = await withTenant(owner.organizationId, (tx) => listActiveServices(tx, owner.organizationId));
    expect(active.map((service) => [service.name, service.priceType, service.priceCents])).toEqual([
      ["Soin Éclat duo", "FROM", 15_000],
      ["Injections", "ON_CONSULTATION", null],
    ]);
  });

  it("replaces the opening hours as a whole week", async () => {
    await saveOpeningHours(
      owner.ctx,
      businessHoursSchema.parse([
        { day: 2, opensAt: "09:00", closesAt: "12:30" },
        { day: 2, opensAt: "14:00", closesAt: "19:00" },
        { day: 6, opensAt: "09:30", closesAt: "18:00" },
      ]),
      meta,
    );
    await saveOpeningHours(owner.ctx, businessHoursSchema.parse([{ day: 3, opensAt: "10:00", closesAt: "20:00" }]), meta);
    expect(await withTenant(owner.organizationId, (tx) => listOpeningHours(tx, owner.organizationId))).toEqual([{ day: 3, opensAt: "10:00", closesAt: "20:00" }]);
    await expect(saveOpeningHours(staff.ctx, [], meta)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ticks the checklist from the real configuration", async () => {
    const checklist = await withTenant(owner.organizationId, (tx) => getSetupChecklist(tx, owner.organizationId));
    expect(checklist).toMatchObject({ profile: true, services: true, hours: true, calendar: false, whatsapp: false, sofiaActive: false });
  });

  it("archives rather than deletes, so history keeps the service", async () => {
    const [archived] = await withTenant(owner.organizationId, (tx) => tx.select({ isActive: services.isActive }).from(services).where(eq(services.slug, "soin-eclat")));
    expect(archived?.isActive).toBe(false);
  });
});
