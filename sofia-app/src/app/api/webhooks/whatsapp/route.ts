import { after, NextResponse, type NextRequest } from "next/server";

import { logger } from "@/server/observability/logger";
import { answerWhatsappMessage } from "@/server/whatsapp/inbound";
import { receiveDelivery, verifySubscription } from "@/server/whatsapp/receive";

// SOFIA answers after Meta got its 200, within this function's lifetime.
export const maxDuration = 60;

const noStore = { "Cache-Control": "no-store" };

/** Meta's subscription check: echo the challenge when the verify token matches. */
export function GET(request: NextRequest) {
  const challenge = verifySubscription(request.nextUrl.searchParams);
  if (!challenge) return new NextResponse("Forbidden", { status: 403, headers: noStore });
  return new NextResponse(challenge, { status: 200, headers: { ...noStore, "Content-Type": "text/plain" } });
}

/** A signed delivery: messages from customers and delivery reports of what SOFIA sent. */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let result;
  try {
    result = await receiveDelivery(rawBody, request.headers.get("x-hub-signature-256"));
  } catch (error) {
    // Nothing is lost: Meta retries the delivery, and stored messages are recognised.
    logger.error("WhatsApp webhook processing failed", { err: error });
    return NextResponse.json({ error: "unavailable" }, { status: 500, headers: noStore });
  }
  if (result.status === "rejected") {
    logger.warn("WhatsApp webhook rejected", { reason: result.reason });
    const status = result.reason === "not_configured" ? 503 : result.reason === "signature" ? 401 : 400;
    return NextResponse.json({ error: result.reason }, { status, headers: noStore });
  }
  for (const { route, stored } of result.toAnswer) {
    after(async () => {
      try {
        await answerWhatsappMessage(route, stored);
      } catch (error) {
        logger.error("WhatsApp answer failed", { err: error, organizationId: route.organizationId, conversationId: stored.conversationId });
      }
    });
  }
  return NextResponse.json({ received: true }, { headers: noStore });
}
