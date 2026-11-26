import "server-only";

import { env } from "@/server/env";
import { logger } from "@/server/observability/logger";
import { constantTimeEqual } from "@/server/security/crypto";

import { findWhatsappRoute, type WhatsappRoute } from "./connection";
import { applyStatus, storeInboundMessage, type StoredInbound } from "./inbound";
import { isValidSignature, parseWebhookPayload } from "./webhook";

/*
 * The webhook's two doors. GET: Meta checks the subscription with the verify
 * token. POST: a signed delivery, checked against the app secret before a
 * single byte of it is trusted.
 */

const MAX_BODY_BYTES = 512 * 1024;

/** The challenge to echo back, or null when the request is not Meta's check of our subscription. */
export function verifySubscription(params: URLSearchParams): string | null {
  const expected = env().WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (!expected || params.get("hub.mode") !== "subscribe" || !token || !challenge) return null;
  if (!constantTimeEqual(token, expected)) return null;
  return /^[A-Za-z0-9_-]{1,200}$/.test(challenge) ? challenge : null;
}

export type DeliveryResult =
  | { status: "rejected"; reason: "not_configured" | "signature" | "too_large" | "invalid_json" }
  | { status: "accepted"; toAnswer: Array<{ route: WhatsappRoute; stored: StoredInbound }> };

/** Stores what a delivery says; returns the messages SOFIA should now answer. */
export async function receiveDelivery(rawBody: string, signature: string | null, now = new Date()): Promise<DeliveryResult> {
  const secret = env().META_APP_SECRET;
  if (!secret) return { status: "rejected", reason: "not_configured" };
  if (rawBody.length > MAX_BODY_BYTES) return { status: "rejected", reason: "too_large" };
  if (!isValidSignature(rawBody, signature, secret)) return { status: "rejected", reason: "signature" };
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { status: "rejected", reason: "invalid_json" };
  }

  const routes = new Map<string, WhatsappRoute | null>();
  const toAnswer: Array<{ route: WhatsappRoute; stored: StoredInbound }> = [];
  for (const [index, event] of parseWebhookPayload(payload).entries()) {
    if (!routes.has(event.phoneNumberId)) routes.set(event.phoneNumberId, await findWhatsappRoute(event.phoneNumberId));
    const route = routes.get(event.phoneNumberId);
    if (!route || !route.organizationActive) {
      // A number disconnected from SOFIA, or another app's: nothing to do, and no reason for Meta to retry.
      logger.warn("WhatsApp webhook for an unknown or inactive number", { phoneNumberId: event.phoneNumberId, kind: event.kind });
      continue;
    }
    if (event.kind === "status") {
      await applyStatus(route, event, now);
      continue;
    }
    // Several messages in one delivery keep their order, a millisecond apart.
    const stored = await storeInboundMessage(route, event, new Date(now.getTime() + index));
    if (stored?.answer) toAnswer.push({ route, stored });
  }
  return { status: "accepted", toAnswer };
}
