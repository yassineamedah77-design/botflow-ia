import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "@/lib/navigation";
import { deleteSessionCookie, readSessionToken } from "@/server/auth/cookies";
import { validateSessionToken } from "@/server/auth/sessions";

/**
 * Clears a session cookie that no longer matches a valid session (expired,
 * revoked, password changed elsewhere) and sends the user to the login page.
 * Server Components cannot modify cookies, so the DAL redirects here.
 */
export async function GET(request: NextRequest) {
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
  const token = await readSessionToken();

  // Still valid (e.g. the URL was opened by hand): nothing to clear.
  if (token && (await validateSessionToken(token))) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  await deleteSessionCookie();
  const login = new URL("/login", request.url);
  login.searchParams.set("expired", "1");
  login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}
