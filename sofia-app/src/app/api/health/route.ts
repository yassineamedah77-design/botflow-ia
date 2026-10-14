import { NextResponse, type NextRequest } from "next/server";

import { constantTimeEqual } from "@/server/security/crypto";
import { env } from "@/server/env";
import { runHealthChecks } from "@/server/health";

/**
 * GET /api/health — for uptime monitoring and load balancers.
 * Returns 200 when the app can serve requests, 503 when the database is down.
 * Detailed checks are only returned with `Authorization: Bearer
 * $HEALTHCHECK_TOKEN` (or in development).
 */
export async function GET(request: NextRequest) {
  const report = await runHealthChecks();
  const config = env();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const detailed =
    config.APP_ENV === "development" || (config.HEALTHCHECK_TOKEN !== undefined && constantTimeEqual(token, config.HEALTHCHECK_TOKEN));

  return NextResponse.json(detailed ? report : { status: report.status }, {
    status: report.status === "down" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
