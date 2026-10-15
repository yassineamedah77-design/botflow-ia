import "server-only";

import { NextResponse } from "next/server";

import { env } from "@/server/env";
import { logger } from "@/server/observability/logger";
import { clientIpFromHeaders, isSameOriginRequest, type RequestMeta } from "@/server/security/request";

import { WidgetError } from "./visitor";

/*
 * Plumbing shared by the widget's public route handlers. The chat window is
 * served by SOFIA, so its calls are same-origin: requests from any other
 * page (a site calling the API with its visitors' browsers) are refused.
 */

const MAX_BODY_BYTES = 8 * 1024;

export function widgetJson(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(data, { status: init.status ?? 200, headers: { "Cache-Control": "no-store", ...init.headers } });
}

export function widgetErrorResponse(error: unknown) {
  if (error instanceof WidgetError) {
    return widgetJson(
      { error: error.code, ...(error.options.fields ? { fields: error.options.fields } : {}) },
      { status: error.status, headers: error.options.retryAfterSeconds ? { "Retry-After": String(error.options.retryAfterSeconds) } : {} },
    );
  }
  logger.error("Widget request failed", { err: error });
  return widgetJson({ error: "unavailable" }, { status: 500 });
}

export function visitorMeta(request: Request): RequestMeta {
  return {
    ipAddress: clientIpFromHeaders(request.headers, env().TRUST_PROXY),
    userAgent: request.headers.get("user-agent")?.slice(0, 512) ?? null,
  };
}

/** The visitor's key, sent by the chat window as a bearer token. */
export function visitorToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+([A-Za-z0-9_-]{1,100})$/);
  return match ? match[1]! : null;
}

/** Writes come from the chat window only (same origin), like the app's own forms. */
export function assertChatWindowWrite(request: Request) {
  if (!isSameOriginRequest(request)) throw new WidgetError("closed");
}

/** Reads too, when the browser says where they come from. */
export function assertChatWindowRead(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") throw new WidgetError("closed");
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new WidgetError("invalid");
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new WidgetError("invalid");
  try {
    const value: unknown = JSON.parse(text);
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // Reported below.
  }
  throw new WidgetError("invalid");
}

export function appOrigin() {
  return new URL(env().APP_URL).origin;
}
