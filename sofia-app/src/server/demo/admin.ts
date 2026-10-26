import "server-only";

import { cookies } from "next/headers";

import { env, isSecureAppUrl } from "@/server/env";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { constantTimeEqual, sha256Hex } from "@/server/security/crypto";
import type { RequestMeta } from "@/server/security/request";

import { isDemoMode } from "./sandbox";

/*
 * Access to /demo/cliniques: one key (DEMO_ADMIN_KEY), known only to the
 * founder. The browser keeps its hash in an httpOnly cookie, never the key.
 */

const COOKIE = "sofia_demo_admin";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Whether clinic preparation exists on this deployment at all. */
export function isDemoAdminEnabled() {
  return isDemoMode() && Boolean(env().DEMO_ADMIN_KEY);
}

function expected() {
  return sha256Hex(`demo-admin:${env().DEMO_ADMIN_KEY}`);
}

export async function isDemoAdmin(): Promise<boolean> {
  if (!isDemoAdminEnabled()) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  return Boolean(value) && constantTimeEqual(value!, expected());
}

export async function signInDemoAdmin(key: string, meta: RequestMeta): Promise<"ok" | "invalid" | "rate_limited"> {
  if (!isDemoAdminEnabled()) return "invalid";
  const limit = await consumeRateLimit("demoAdminByIp", meta.ipAddress ?? "unknown");
  if (!limit.allowed) return "rate_limited";
  if (!constantTimeEqual(sha256Hex(`demo-admin:${key.trim()}`), expected())) return "invalid";
  (await cookies()).set(COOKIE, expected(), {
    httpOnly: true,
    secure: isSecureAppUrl(),
    sameSite: "lax",
    path: "/demo",
    maxAge: MAX_AGE_SECONDS,
  });
  return "ok";
}
