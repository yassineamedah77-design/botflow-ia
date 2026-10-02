import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every page request.
 *
 * 1. Content-Security-Policy with a fresh nonce: only scripts emitted by
 *    Next.js for this response can run, which neutralises injected scripts
 *    (customer messages are untrusted content shown in the inbox).
 * 2. Optimistic redirect to /login when there is no session cookie at all.
 *    This is a convenience, not the security boundary: every page, server
 *    action and route handler verifies the session in the database.
 * 3. Sliding session cookie: Server Components cannot set cookies, so the
 *    cookie lifetime is extended here on navigations.
 */

const SESSION_COOKIES = ["__Host-sofia_session", "sofia_session"] as const;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/invitations",
  "/session-expired",
  "/design-system",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function contentSecurityPolicy(nonce: string, options: { dev: boolean; https: boolean }) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.dev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes are rendered by React and Radix (positioning);
    // style injection cannot execute code, scripts stay nonce-locked.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(options.https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (!hasSessionCookie && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, {
    dev: process.env.NODE_ENV === "development",
    https: request.nextUrl.protocol === "https:",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-sofia-pathname", `${pathname}${search}`);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  if (hasSessionCookie && request.method === "GET") {
    for (const name of SESSION_COOKIES) {
      const cookie = request.cookies.get(name);
      if (!cookie) continue;
      response.cookies.set(name, cookie.value, {
        httpOnly: true,
        secure: name.startsWith("__Host-"),
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
