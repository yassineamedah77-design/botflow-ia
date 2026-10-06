import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import type { ImportMapping } from "@/lib/client-file";
import { leadFormSchema } from "@/lib/validation/leads";
import { withTenant } from "@/server/db/context";
import { consentRecords, contactImports, leadStatusChanges, leads, notifications } from "@/server/db/schema";
import { previewContactImport, runContactImport } from "@/server/services/contact-import";
import { addLeadNote, assignLead, changeLeadStatus, createLead, deleteLead } from "@/server/services/leads";
import { countUnreadNotifications, listNotifications, markNotificationsRead, notify } from "@/server/services/notifications";
import { getReactivationOverview } from "@/server/services/reactivation";

import { addMember, createEstablishment, meta } from "./helpers";

const lead = (fields: Record<string, string>) =>
  leadFormSchema.parse({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    instagramHandle: "",
    source: "MANUAL",
    interestedServiceId: "",
    potentialValue: "",
    assignedToUserId: "",
    marketingConsent: "UNKNOWN",
    ...fields,
  });

const DAY = 24 * 3600 * 1000;

function frenchDate(date: Date) {
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

describe("CRM", () => {
  let owner: Awaited<ReturnType<typeof createEstablishment>>;
  let admin: Awaited<ReturnType<typeof addMember>>;
  let staff: Awaited<ReturnType<typeof addMember>>;

  beforeAll(async () => {
    owner = await createEstablishment("Institut CRM");
    admin = await addMember(owner.organizationId, "ADMIN", "Inès Admin");
    staff = await addMember(owner.organizationId, "STAFF", "Léa Équipe");
  });

  it("creates a contact with a normalised phone and notifies the member it is assigned to", async () => {
    const { id } = await createLead(
      owner.ctx,
      lead({ firstName: "Chloé", lastName: "Martin", phone: "06 12 34 56 78", marketingConsent: "GRANTED", assignedToUserId: staff.userId }),
      meta,
    );
    const [row] = await withTenant(owner.organizationId, (tx) => tx.select().from(leads).where(eq(leads.id, id)));
    expect(row).toMatchObject({ phone: "+33612345678", source: "MANUAL", marketingConsent: "GRANTED", assignedToUserId: staff.userId });

    const consents = await withTenant(owner.organizationId, (tx) => tx.select().from(consentRecords).where(eq(consentRecords.leadId, id)));
    expect(consents.map((consent) => consent.status)).toEqual(["GRANTED"]);

    const staffNotifications = await withTenant(owner.organizationId, (tx) => listNotifications(tx, owner.organizationId, staff.userId));
    expect(staffNotifications.map((item) => item.type)).toContain("LEAD_ASSIGNED");
    const ownerNotifications = await withTenant(owner.organizationId, (tx) => listNotifications(tx, owner.organizationId, owner.userId));
    expect(ownerNotifications.some((item) => item.type === "LEAD_ASSIGNED")).toBe(false);
  });

  it("refuses a duplicate phone and names the existing contact", async () => {
    await expect(createLead(admin.ctx, lead({ firstName: "Autre", phone: "+33 6 12 34 56 78" }), meta)).rejects.toThrow(/Chloé Martin/);
  });

  it("keeps the pipeline history and tells the rest of the team about a hot lead", async () => {
    const { id } = await createLead(owner.ctx, lead({ firstName: "Inès", phone: "06 98 76 54 32" }), meta);
    await changeLeadStatus(staff.ctx, { leadId: id, status: "HOT" }, meta);
    const history = await withTenant(owner.organizationId, (tx) =>
      tx.select({ from: leadStatusChanges.fromStatus, to: leadStatusChanges.toStatus }).from(leadStatusChanges).where(eq(leadStatusChanges.leadId, id)),
    );
    expect(history).toContainEqual({ from: "NEW", to: "HOT" });

    const hotFor = async (userId: string) =>
      (await withTenant(owner.organizationId, (tx) => listNotifications(tx, owner.organizationId, userId))).filter((item) => item.type === "HOT_LEAD").length;
    expect(await hotFor(owner.userId)).toBe(1);
    expect(await hotFor(admin.userId)).toBe(1);
    // The member who made the change is not notified of their own action.
    expect(await hotFor(staff.userId)).toBe(0);

    await addLeadNote(staff.ctx, { leadId: id, body: "Préfère être rappelée le matin." }, meta);
    await assignLead(owner.ctx, { leadId: id, assignedToUserId: admin.userId }, meta);
    expect((await withTenant(owner.organizationId, (tx) => listNotifications(tx, owner.organizationId, admin.userId))).map((item) => item.type)).toContain(
      "LEAD_ASSIGNED",
    );
  });

  it("only lets owners and admins delete a contact", async () => {
    const { id } = await createLead(owner.ctx, lead({ firstName: "À supprimer", email: "supprimer@test.example" }), meta);
    await expect(deleteLead(staff.ctx, id, meta)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await deleteLead(admin.ctx, id, meta);
    const remaining = await withTenant(owner.organizationId, (tx) => tx.select({ id: leads.id }).from(leads).where(eq(leads.id, id)));
    expect(remaining).toEqual([]);
  });
});

describe("client file import and reactivation segments", () => {
  let owner: Awaited<ReturnType<typeof createEstablishment>>;
  let staff: Awaited<ReturnType<typeof addMember>>;
  const now = new Date();
  const longAgo = new Date(now.getTime() - 200 * DAY);
  const recently = new Date(now.getTime() - 20 * DAY);
  const mapping: ImportMapping = {
    externalId: "N° client",
    fullName: "Nom complet",
    phone: "Téléphone",
    email: "Email",
    lastVisitAt: "Dernière visite",
    visitCount: "Visites",
    lifetimeValue: "Total dépensé",
    marketingConsent: "Accepte marketing",
  };
  const csv = [
    "N° client;Nom complet;Téléphone;Email;Dernière visite;Visites;Total dépensé;Accepte marketing",
    `C1;BERNARD Emma;06 11 22 33 44;emma@test.example;${frenchDate(longAgo)};1;95;oui`,
    `C2;Petit Jade;0611223355;;${frenchDate(longAgo)};6;1 240,50;non`,
    `C3;Roux Léna;+33 6 11 22 33 66;lena@test.example;${frenchDate(recently)};3;300;`,
    `C4;Sans Contact;;;${frenchDate(longAgo)};2;100;oui`,
    `C5;Martin Chloé;06 12 34 56 78;;${frenchDate(longAgo)};2;180;oui`,
  ].join("\n");
  const file = () => new File([csv], "clients.csv", { type: "text/csv" });

  beforeAll(async () => {
    owner = await createEstablishment("Institut Import");
    staff = await addMember(owner.organizationId, "STAFF");
    // Already in the CRM: the file completes this contact instead of duplicating it.
    await createLead(owner.ctx, lead({ firstName: "Chloé", lastName: "Martin", phone: "06 12 34 56 78" }), meta);
  });

  it("previews without writing anything", async () => {
    const report = await previewContactImport(owner.ctx, file(), mapping);
    expect(report).toMatchObject({ totalRows: 5, toCreate: 3, toUpdate: 1, rejectedCount: 1 });
    // Line 5 of the file (the header is line 1): no phone and no email.
    expect(report.rejected[0]?.line).toBe(5);
    const count = await withTenant(owner.organizationId, (tx) => tx.select({ id: leads.id }).from(leads));
    expect(count).toHaveLength(1);
  });

  it("is reserved to owners and admins and requires the data declaration", async () => {
    await expect(previewContactImport(staff.ctx, file(), mapping)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(runContactImport(owner.ctx, { file: file(), mapping, declarationAccepted: false }, meta)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("imports, completes the existing contact and records consent and history", async () => {
    const result = await runContactImport(owner.ctx, { file: file(), mapping, declarationAccepted: true }, meta);
    expect(result).toMatchObject({ toCreate: 3, toUpdate: 1, rejectedCount: 1 });

    const rows = await withTenant(owner.organizationId, (tx) => tx.select().from(leads));
    expect(rows).toHaveLength(4);
    const byPhone = (phone: string) => rows.find((row) => row.phone === phone)!;
    expect(byPhone("+33611223344")).toMatchObject({ firstName: "Emma", lastName: "Bernard", source: "IMPORT", isExistingClient: true, visitCount: 1, marketingConsent: "GRANTED" });
    expect(byPhone("+33611223355")).toMatchObject({ lifetimeValueCents: 124_050, visitCount: 6, marketingConsent: "DENIED" });
    // The contact entered by hand keeps its origin and gains the history from the file.
    expect(byPhone("+33612345678")).toMatchObject({ source: "MANUAL", externalId: "C5", visitCount: 2, isExistingClient: true, marketingConsent: "GRANTED" });

    const [record] = await withTenant(owner.organizationId, (tx) => tx.select().from(contactImports).where(eq(contactImports.id, result.importId)));
    expect(record).toMatchObject({ status: "COMPLETED", createdCount: 3, updatedCount: 1, skippedCount: 1 });

    const consents = await withTenant(owner.organizationId, (tx) => tx.select().from(consentRecords).where(eq(consentRecords.source, "client_file_import")));
    expect(consents.length).toBeGreaterThanOrEqual(3);
  });

  it("splits inactive clients into never returned and lost, with who may be contacted", async () => {
    const overview = await withTenant(owner.organizationId, (tx) => getReactivationOverview(tx, owner.organizationId, 90, now));
    const { neverReturned: never, lost } = overview.segments;
    // Emma: one visit 200 days ago. Jade and Chloé: several visits, last one 200 days ago. Léna came 20 days ago.
    expect(never.count).toBe(1);
    expect(never.withConsent).toBe(1);
    expect(lost.count).toBe(2);
    expect(lost.excluded).toBe(1);
    expect(lost.withConsent).toBe(1);
  });
});

describe("notifications", () => {
  it("reach the right members only, and each member reads their own", async () => {
    const owner = await createEstablishment("Institut Notifications");
    const admin = await addMember(owner.organizationId, "ADMIN");
    const staff = await addMember(owner.organizationId, "STAFF");
    const other = await createEstablishment("Autre Institut");

    await withTenant(owner.organizationId, (tx) =>
      notify(tx, { organizationId: owner.organizationId, type: "SYSTEM", title: "Pour les responsables", recipients: "managers", excludeUserId: owner.userId }),
    );
    await withTenant(owner.organizationId, (tx) =>
      // A member of another establishment can never be targeted, whatever id is passed.
      notify(tx, { organizationId: owner.organizationId, type: "SYSTEM", title: "Ciblée", recipients: [staff.userId, other.userId] }),
    );

    const unread = (userId: string) => withTenant(owner.organizationId, (tx) => countUnreadNotifications(tx, owner.organizationId, userId));
    expect(await unread(owner.userId)).toBe(0);
    expect(await unread(admin.userId)).toBe(1);
    expect(await unread(staff.userId)).toBe(1);
    expect(await withTenant(other.organizationId, (tx) => countUnreadNotifications(tx, other.organizationId, other.userId))).toBe(0);

    // Marking someone else's notification as read does nothing.
    const [adminItem] = await withTenant(owner.organizationId, (tx) => listNotifications(tx, owner.organizationId, admin.userId));
    expect(await withTenant(owner.organizationId, (tx) => markNotificationsRead(tx, owner.organizationId, staff.userId, [adminItem!.id]))).toBe(0);
    expect(await unread(admin.userId)).toBe(1);
    expect(await withTenant(owner.organizationId, (tx) => markNotificationsRead(tx, owner.organizationId, admin.userId))).toBe(1);
    expect(await unread(admin.userId)).toBe(0);

    // Row-Level Security: another establishment sees none of these rows.
    const leaked = await withTenant(other.organizationId, (tx) => tx.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.organizationId, owner.organizationId))));
    expect(leaked).toEqual([]);
  });
});
