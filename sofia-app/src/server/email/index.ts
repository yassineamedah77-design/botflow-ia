import "server-only";

import { env } from "@/server/env";
import { recordEventDetached } from "@/server/observability/audit";
import { serializeError } from "@/server/observability/logger";

import type { RenderedEmail } from "./templates";
import { getEmailTransport } from "./transport";

export * from "./templates";
export { MemoryTransport, setEmailTransportForTesting } from "./transport";

const SEND_TIMEOUT_MS = 15_000;

export type SendEmailResult = { ok: true; messageId?: string } | { ok: false; error: string };

function maskEmail(address: string) {
  const [local = "", domain = ""] = address.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Sends a transactional email and records the outcome in the event log
 * (template and masked recipient only, never the content or links).
 *
 * Returns a result instead of throwing: each caller decides what the user
 * sees. A failure is always logged at ERROR level, never swallowed.
 */
export async function sendEmail(
  to: string,
  email: RenderedEmail,
  context: { organizationId?: string | null } = {},
): Promise<SendEmailResult> {
  const transport = getEmailTransport();
  const started = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    const result = await Promise.race([
      transport.send({ ...email, to, from: env().EMAIL_FROM }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Email transport timed out after ${SEND_TIMEOUT_MS} ms`)), SEND_TIMEOUT_MS);
      }),
    ]);
    clearTimeout(timer);
    await recordEventDetached({
      organizationId: context.organizationId,
      type: "EMAIL_SENT",
      message: `Email "${email.template}" sent`,
      durationMs: Date.now() - started,
      details: { template: email.template, to: maskEmail(to), transport: transport.name },
    });
    return { ok: true, messageId: result.messageId };
  } catch (error) {
    clearTimeout(timer);
    await recordEventDetached({
      organizationId: context.organizationId,
      type: "EMAIL_FAILED",
      level: "ERROR",
      message: `Email "${email.template}" could not be sent`,
      durationMs: Date.now() - started,
      details: { template: email.template, to: maskEmail(to), transport: transport.name, error: serializeError(error, false) },
    });
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
