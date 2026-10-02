import "server-only";

import { can, type Permission, type Role } from "@/lib/auth/roles";

import type { SessionUser } from "./sessions";

/**
 * Everything a server action or service needs to act on behalf of a user
 * inside one establishment. Built by the DAL (server/auth/dal.ts) from the
 * session; services never read cookies themselves.
 */
export interface TenantContext {
  sessionId: string;
  user: SessionUser;
  role: Role;
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: "STARTER" | "GROWTH" | "PRO";
    sofiaStatus: "INACTIVE" | "ACTIVE" | "PAUSED";
    timezone: string;
    defaultLanguage: string;
    allowedLanguages: string[];
    widgetPublicId: string;
  };
  can(permission: Permission): boolean;
}

export function buildTenantContext(input: Omit<TenantContext, "can">): TenantContext {
  return { ...input, can: (permission) => can(input.role, permission) };
}
