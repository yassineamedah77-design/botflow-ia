import "server-only";

import { cookies } from "next/headers";

import { isSecureAppUrl } from "@/server/env";

/**
 * Session cookie. On HTTPS the `__Host-` prefix is used: browsers then
 * refuse the cookie unless it is Secure, host-only and scoped to "/", which
 * blocks subdomain cookie injection.
 */

const BASE_NAME = "sofia_session";

export function sessionCookieName(secure = isSecureAppUrl()) {
  return secure ? `__Host-${BASE_NAME}` : BASE_NAME;
}

/** Both possible names, for the proxy which cannot read the configuration. */
export const SESSION_COOKIE_NAMES = [`__Host-${BASE_NAME}`, BASE_NAME] as const;

export async function setSessionCookie(token: string, expiresAt: Date) {
  const secure = isSecureAppUrl();
  const store = await cookies();
  store.set(sessionCookieName(secure), token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSessionCookie() {
  const store = await cookies();
  for (const name of SESSION_COOKIE_NAMES) {
    if (!store.has(name)) continue;
    // Browsers ignore a __Host- cookie update that is not Secure, so expire
    // it with the same attributes it was created with.
    const secure = name.startsWith("__Host-");
    store.set(name, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  }
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(sessionCookieName())?.value ?? null;
}
