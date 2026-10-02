import { describe, expect, it } from "vitest";

import {
  assignableRoles,
  can,
  canManageMember,
  invitableRoles,
  PERMISSIONS,
  permissionsFor,
  ROLES,
  type Permission,
} from "@/lib/auth/roles";

describe("role permissions", () => {
  it("grants every permission to owners", () => {
    for (const permission of PERMISSIONS) {
      expect(can("OWNER", permission)).toBe(true);
    }
  });

  it("nests roles: staff ⊂ admin ⊂ owner", () => {
    const staff = new Set(permissionsFor("STAFF"));
    const admin = new Set(permissionsFor("ADMIN"));
    const owner = new Set(permissionsFor("OWNER"));
    for (const permission of staff) expect(admin.has(permission)).toBe(true);
    for (const permission of admin) expect(owner.has(permission)).toBe(true);
    expect(staff.size).toBeLessThan(admin.size);
    expect(admin.size).toBeLessThan(owner.size);
  });

  it("keeps billing and establishment deletion for owners only", () => {
    const ownerOnly: Permission[] = ["billing:read", "billing:manage", "org:delete"];
    for (const permission of ownerOnly) {
      expect(can("ADMIN", permission)).toBe(false);
      expect(can("STAFF", permission)).toBe(false);
    }
  });

  it("lets staff work conversations and leads but not manage the establishment", () => {
    const daily: Permission[] = [
      "conversations:read",
      "conversations:reply",
      "conversations:takeover",
      "leads:read",
      "leads:write",
      "appointments:write",
    ];
    for (const permission of daily) expect(can("STAFF", permission)).toBe(true);

    const restricted: Permission[] = [
      "org:update",
      "members:invite",
      "members:update_role",
      "members:remove",
      "integrations:manage",
      "sofia:toggle",
      "knowledge:write",
      "leads:delete",
      "leads:export",
      "data:erase",
      "audit:read",
    ];
    for (const permission of restricted) expect(can("STAFF", permission)).toBe(false);
  });

  it("restricts GDPR export and erasure to owners and admins", () => {
    for (const permission of ["leads:export", "data:erase"] as const) {
      expect(can("OWNER", permission)).toBe(true);
      expect(can("ADMIN", permission)).toBe(true);
      expect(can("STAFF", permission)).toBe(false);
    }
  });
});

describe("member management rules", () => {
  it("only owners can grant ownership, never through an invitation", () => {
    expect(assignableRoles("OWNER")).toContain("OWNER");
    expect(assignableRoles("ADMIN")).not.toContain("OWNER");
    expect(assignableRoles("STAFF")).toEqual([]);
    for (const role of ROLES) expect(invitableRoles(role)).not.toContain("OWNER");
  });

  it("prevents admins from managing owners and staff from managing anyone", () => {
    expect(canManageMember("OWNER", "OWNER")).toBe(true);
    expect(canManageMember("ADMIN", "OWNER")).toBe(false);
    expect(canManageMember("ADMIN", "ADMIN")).toBe(true);
    expect(canManageMember("ADMIN", "STAFF")).toBe(true);
    for (const role of ROLES) expect(canManageMember("STAFF", role)).toBe(false);
  });
});
