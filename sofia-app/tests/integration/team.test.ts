import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { validateSessionToken } from "@/server/auth/sessions";
import { signIn } from "@/server/auth/service";
import { getDb } from "@/server/db/client";
import { withTenant } from "@/server/db/context";
import { auditLogs, memberships, users } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import {
  acceptInvitationAsUser,
  acceptInvitationWithNewAccount,
  changeMemberRole,
  getInvitationPreview,
  inviteMember,
  listMembers,
  listPendingInvitations,
  removeMember,
  resendInvitation,
  revokeInvitation,
} from "@/server/services/members";

import { addMember, createEstablishment, lastEmailTo, linkFrom, meta, PASSWORD, uniqueEmail } from "./helpers";

async function expectAppError(promise: Promise<unknown>, code: AppError["code"]) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).code).toBe(code);
}

function invitationToken(email: string) {
  const message = lastEmailTo(email);
  expect(message?.template).toBe("invitation");
  return linkFrom(message!.text, "/invitations/").pathname.split("/").at(-1)!;
}

describe("team invitations", () => {
  it("invites a new person who creates an account and joins with the invited role", async () => {
    const { ctx, organizationId } = await createEstablishment("Institut Invitation");
    const email = uniqueEmail("lea");
    const result = await inviteMember(ctx, { email, role: "STAFF" }, meta);
    expect(result.email.ok).toBe(true);

    const token = invitationToken(email);
    const preview = await getInvitationPreview(token);
    expect(preview).toMatchObject({ status: "valid", email, role: "STAFF", organizationName: "Institut Invitation", accountExists: false });

    const grant = await acceptInvitationWithNewAccount({ token, name: "Léa Martin", password: PASSWORD }, meta);
    expect(grant.organizationId).toBe(organizationId);
    const session = await validateSessionToken(grant.sessionToken);
    expect(session?.activeOrganizationId).toBe(organizationId);

    const [user] = await getDb().select().from(users).where(eq(users.email, email));
    expect(user?.emailVerifiedAt).toBeInstanceOf(Date);
    const members = await withTenant(organizationId, (tx) => listMembers(tx, organizationId));
    expect(members.find((member) => member.email === email)?.role).toBe("STAFF");

    expect(await getInvitationPreview(token)).toEqual({ status: "used" });
    await expectAppError(acceptInvitationWithNewAccount({ token, name: "Encore", password: PASSWORD }, meta), "INVALID_TOKEN");
  });

  it("lets an existing account accept with the matching email only", async () => {
    const { ctx, organizationId } = await createEstablishment("Institut Multi");
    const other = await createEstablishment("Autre établissement");
    await inviteMember(ctx, { email: other.email, role: "ADMIN" }, meta);
    const token = invitationToken(other.email);
    expect(await getInvitationPreview(token)).toMatchObject({ status: "valid", accountExists: true });

    const stranger = await createEstablishment("Inconnu");
    const strangerSession = await validateSessionToken(stranger.sessionToken);
    await expectAppError(acceptInvitationAsUser(token, strangerSession!, meta), "FORBIDDEN");

    const session = await validateSessionToken(other.sessionToken);
    await acceptInvitationAsUser(token, session!, meta);
    expect((await validateSessionToken(other.sessionToken))?.activeOrganizationId).toBe(organizationId);
    const members = await withTenant(organizationId, (tx) => listMembers(tx, organizationId));
    expect(members.find((member) => member.userId === other.userId)?.role).toBe("ADMIN");
  });

  it("replaces a pending invitation and supports resend and revoke", async () => {
    const { ctx, organizationId } = await createEstablishment();
    const email = uniqueEmail("invite");
    await inviteMember(ctx, { email, role: "STAFF" }, meta);
    const firstToken = invitationToken(email);
    const second = await inviteMember(ctx, { email, role: "ADMIN" }, meta);
    expect(await getInvitationPreview(firstToken)).toEqual({ status: "invalid" });

    await resendInvitation(ctx, second.invitationId, meta);
    const resentToken = invitationToken(email);
    expect(await getInvitationPreview(resentToken)).toMatchObject({ status: "valid", role: "ADMIN" });

    await revokeInvitation(ctx, second.invitationId, meta);
    expect(await getInvitationPreview(resentToken)).toEqual({ status: "invalid" });
    expect(await withTenant(organizationId, (tx) => listPendingInvitations(tx, organizationId))).toEqual([]);
  });

  it("refuses to invite someone who is already a member", async () => {
    const { ctx, organizationId } = await createEstablishment();
    const member = await addMember(organizationId, "STAFF");
    await expectAppError(inviteMember(ctx, { email: member.email, role: "STAFF" }, meta), "CONFLICT");
  });

  it("enforces who may invite", async () => {
    const { organizationId } = await createEstablishment();
    const staff = await addMember(organizationId, "STAFF");
    const admin = await addMember(organizationId, "ADMIN");
    await expectAppError(inviteMember(staff.ctx, { email: uniqueEmail(), role: "STAFF" }, meta), "FORBIDDEN");
    await expectAppError(inviteMember(admin.ctx, { email: uniqueEmail(), role: "OWNER" }, meta), "FORBIDDEN");
    const ok = await inviteMember(admin.ctx, { email: uniqueEmail(), role: "ADMIN" }, meta);
    expect(ok.invitationId).toBeTruthy();
  });

  it("reports an invitation email that could not be delivered", async () => {
    const { ctx } = await createEstablishment();
    const { mailbox } = await import("./helpers");
    mailbox.failNext = true;
    const result = await inviteMember(ctx, { email: uniqueEmail(), role: "STAFF" }, meta);
    expect(result.email.ok).toBe(false);
  });
});

describe("roles and membership changes", () => {
  it("changes roles within the rules and audits it", async () => {
    const { ctx, organizationId } = await createEstablishment();
    const member = await addMember(organizationId, "STAFF");
    await changeMemberRole(ctx, { membershipId: member.membershipId, role: "ADMIN" }, meta);
    const [row] = await withTenant(organizationId, (tx) => tx.select({ role: memberships.role }).from(memberships).where(eq(memberships.id, member.membershipId)));
    expect(row?.role).toBe("ADMIN");
    const audit = await withTenant(organizationId, (tx) => tx.select().from(auditLogs).where(eq(auditLogs.action, "member.role_changed")));
    expect(audit[0]?.metadata).toMatchObject({ from: "STAFF", to: "ADMIN" });
  });

  it("stops admins from touching owners and staff from managing anyone", async () => {
    const { organizationId, ctx: owner } = await createEstablishment();
    const admin = await addMember(organizationId, "ADMIN");
    const staff = await addMember(organizationId, "STAFF");
    const ownerMembership = (await withTenant(organizationId, (tx) => listMembers(tx, organizationId))).find((member) => member.userId === owner.user.id)!;

    await expectAppError(changeMemberRole(admin.ctx, { membershipId: ownerMembership.membershipId, role: "STAFF" }, meta), "FORBIDDEN");
    await expectAppError(removeMember(admin.ctx, ownerMembership.membershipId, meta), "FORBIDDEN");
    await expectAppError(changeMemberRole(admin.ctx, { membershipId: staff.membershipId, role: "OWNER" }, meta), "FORBIDDEN");
    await expectAppError(removeMember(staff.ctx, admin.membershipId, meta), "FORBIDDEN");
  });

  it("always keeps at least one owner", async () => {
    const { organizationId, ctx: owner } = await createEstablishment();
    const ownerMembership = (await withTenant(organizationId, (tx) => listMembers(tx, organizationId)))[0]!;
    await expectAppError(changeMemberRole(owner, { membershipId: ownerMembership.membershipId, role: "ADMIN" }, meta), "CONFLICT");
    await expectAppError(removeMember(owner, ownerMembership.membershipId, meta), "CONFLICT");

    // With a second owner, the first one can step down.
    const coOwner = await addMember(organizationId, "STAFF");
    await changeMemberRole(owner, { membershipId: coOwner.membershipId, role: "OWNER" }, meta);
    await changeMemberRole(owner, { membershipId: ownerMembership.membershipId, role: "ADMIN" }, meta);
    const roles = (await withTenant(organizationId, (tx) => listMembers(tx, organizationId))).map((member) => member.role).sort();
    expect(roles).toEqual(["ADMIN", "OWNER"]);
  });

  it("removes a member and detaches their sessions from the establishment", async () => {
    const { organizationId, ctx: owner } = await createEstablishment();
    const member = await addMember(organizationId, "STAFF");
    const grant = await signIn({ email: member.email, password: PASSWORD }, meta);
    expect((await validateSessionToken(grant.sessionToken))?.activeOrganizationId).toBe(organizationId);

    const result = await removeMember(owner, member.membershipId, meta);
    expect(result.leftOrganization).toBe(false);
    expect((await validateSessionToken(grant.sessionToken))?.activeOrganizationId).toBeNull();
    const members = await withTenant(organizationId, (tx) => listMembers(tx, organizationId));
    expect(members.some((row) => row.userId === member.userId)).toBe(false);
  });

  it("lets a member leave on their own", async () => {
    const { organizationId } = await createEstablishment();
    const member = await addMember(organizationId, "STAFF");
    const result = await removeMember(member.ctx, member.membershipId, meta);
    expect(result.leftOrganization).toBe(true);
  });

  it("cannot manage a member of another establishment", async () => {
    const a = await createEstablishment("Établissement A");
    const b = await createEstablishment("Établissement B");
    const memberOfB = await addMember(b.organizationId, "STAFF");
    await expectAppError(removeMember(a.ctx, memberOfB.membershipId, meta), "NOT_FOUND");
    await expectAppError(changeMemberRole(a.ctx, { membershipId: memberOfB.membershipId, role: "ADMIN" }, meta), "NOT_FOUND");
    const bMembers = await withTenant(b.organizationId, (tx) => listMembers(tx, b.organizationId));
    expect(bMembers.some((member) => member.userId === memberOfB.userId)).toBe(true);
  });
});
