/**
 * Runs once when a server instance starts. Validates the configuration and
 * reports database / Row-Level Security problems loudly in the logs instead
 * of letting them surface later as obscure request failures.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Skip during `next build`: no database or secrets on build machines.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { logger } = await import("@/server/observability/logger");
  try {
    const { env } = await import("@/server/env");
    const config = env();
    const { runHealthChecks } = await import("@/server/health");
    const report = await runHealthChecks();
    const fields = { appEnv: config.APP_ENV, checks: report.checks };
    if (report.status === "ok") logger.info("SOFIA server started", fields);
    else logger.error(`SOFIA server started in ${report.status} state`, fields);
  } catch (error) {
    logger.error("SOFIA startup checks failed", { err: error });
  }
}
