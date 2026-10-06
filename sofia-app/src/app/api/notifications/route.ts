import { NextResponse } from "next/server";

import { getActionTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/observability/logger";
import { getShellFeed } from "@/server/services/shell";

/**
 * GET /api/notifications — the notification bell and the Inbox badge,
 * polled by the app shell while the tab is visible. Read-only and scoped to
 * the signed-in member of the active establishment.
 */

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    const ctx = await getActionTenant();
    const feed = await withTenant(ctx.organization.id, (tx) => getShellFeed(tx, ctx.organization.id, ctx.user.id));
    return NextResponse.json(feed, { headers: { "Cache-Control": "no-store" } });
  } catch (caught) {
    if (isAppError(caught)) return error(caught.message, caught.code === "UNAUTHENTICATED" ? 401 : 403);
    logger.error("Notification feed failed", { err: caught });
    return error("Notifications indisponibles.", 500);
  }
}
