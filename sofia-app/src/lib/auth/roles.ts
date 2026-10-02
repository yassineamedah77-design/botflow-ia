/**
 * Roles and permissions of an establishment's team.
 *
 * Shared by the server (enforcement) and the UI (showing or hiding actions).
 * Hiding a button is a convenience only: every server action and page checks
 * the permission again on the server.
 */

export const ROLES = ["OWNER", "ADMIN", "STAFF"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  STAFF: "Équipe",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Accès complet, y compris la facturation et la suppression de l'établissement.",
  ADMIN: "Gère l'équipe, les canaux, SOFIA et les réglages. Pas d'accès à la facturation.",
  STAFF: "Traite les conversations, les leads et les rendez-vous au quotidien.",
};

export const PERMISSIONS = [
  "org:read",
  "org:update",
  "org:delete",
  "billing:read",
  "billing:manage",
  "members:read",
  "members:invite",
  "members:update_role",
  "members:remove",
  "integrations:read",
  "integrations:manage",
  "sofia:toggle",
  "knowledge:read",
  "knowledge:write",
  "leads:read",
  "leads:write",
  "leads:delete",
  "leads:export",
  "conversations:read",
  "conversations:reply",
  "conversations:takeover",
  "appointments:read",
  "appointments:write",
  "automations:read",
  "automations:manage",
  "campaigns:read",
  "campaigns:manage",
  "analytics:read",
  "audit:read",
  "data:erase",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const STAFF_PERMISSIONS: Permission[] = [
  "org:read",
  "members:read",
  "integrations:read",
  "knowledge:read",
  "leads:read",
  "leads:write",
  "conversations:read",
  "conversations:reply",
  "conversations:takeover",
  "appointments:read",
  "appointments:write",
  "automations:read",
  "campaigns:read",
  "analytics:read",
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...STAFF_PERMISSIONS,
  "org:update",
  "members:invite",
  "members:update_role",
  "members:remove",
  "integrations:manage",
  "sofia:toggle",
  "knowledge:write",
  "leads:delete",
  "leads:export",
  "automations:manage",
  "campaigns:manage",
  "audit:read",
  "data:erase",
];

const OWNER_PERMISSIONS: Permission[] = [...ADMIN_PERMISSIONS, "org:delete", "billing:read", "billing:manage"];

const MATRIX: Record<Role, ReadonlySet<Permission>> = {
  OWNER: new Set(OWNER_PERMISSIONS),
  ADMIN: new Set(ADMIN_PERMISSIONS),
  STAFF: new Set(STAFF_PERMISSIONS),
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].has(permission);
}

export function permissionsFor(role: Role): Permission[] {
  return PERMISSIONS.filter((permission) => MATRIX[role].has(permission));
}

/** Roles an actor may grant through an invitation or a role change. */
export function assignableRoles(actorRole: Role): Role[] {
  if (actorRole === "OWNER") return ["OWNER", "ADMIN", "STAFF"];
  if (actorRole === "ADMIN") return ["ADMIN", "STAFF"];
  return [];
}

/** Roles that can be sent in an invitation (ownership is granted to existing members only). */
export function invitableRoles(actorRole: Role): Role[] {
  return assignableRoles(actorRole).filter((role) => role !== "OWNER");
}

/** Whether an actor may change the role of, or remove, a member holding `targetRole`. */
export function canManageMember(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "OWNER") return true;
  if (actorRole === "ADMIN") return targetRole !== "OWNER";
  return false;
}
