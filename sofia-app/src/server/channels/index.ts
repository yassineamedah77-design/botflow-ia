import "server-only";

import type { Transaction } from "@/server/db/context";
import { AppError } from "@/server/errors";

/*
 * Outbound messages go through one adapter per channel (specification §36:
 * architecture, adapter, mock, visible status). WhatsApp Cloud API, Instagram
 * Messaging and the website widget plug in here in phases 4 to 6. Until a
 * channel is really connected, sending is refused with a clear message:
 * nothing pretends to be delivered.
 */

export type ChannelName = "WHATSAPP" | "INSTAGRAM" | "WEBSITE";

export interface OutboundMessage {
  organizationId: string;
  channel: ChannelName;
  /** Provider thread key (wa_id, Instagram scoped id, widget session). */
  externalThreadId: string | null;
  body: string;
}

export interface DeliveryReceipt {
  externalMessageId: string | null;
  status: "PENDING" | "SENT";
  /** True when nothing left the platform (demo establishment). */
  simulated: boolean;
}

export interface ChannelAdapter {
  channel: ChannelName;
  send(message: OutboundMessage): Promise<DeliveryReceipt>;
}

const AVAILABLE_IN_PHASE: Record<ChannelName, number> = { WEBSITE: 4, WHATSAPP: 5, INSTAGRAM: 6 };

const CHANNEL_NAMES: Record<ChannelName, string> = { WHATSAPP: "WhatsApp", INSTAGRAM: "Instagram", WEBSITE: "le widget du site" };

/** Demo establishments only: fictional contacts, nothing is sent anywhere. */
const sandboxAdapter = (channel: ChannelName): ChannelAdapter => ({
  channel,
  async send() {
    return { externalMessageId: null, status: "SENT", simulated: true };
  },
});

export class ChannelNotConnectedError extends AppError {
  constructor(channel: ChannelName) {
    super(
      "UNAVAILABLE",
      `Pour répondre depuis SOFIA, ${CHANNEL_NAMES[channel]} doit être connecté. Cette connexion arrive en phase ${AVAILABLE_IN_PHASE[channel]}.`,
    );
  }
}

/**
 * The adapter able to deliver on `channel` for this establishment, or a
 * ChannelNotConnectedError. Phases 4 to 6 register the widget, WhatsApp and
 * Instagram adapters here, each after checking its integration is CONNECTED.
 */
export async function getChannelAdapter(
  _tx: Transaction,
  organization: { id: string; isDemo: boolean },
  channel: ChannelName,
): Promise<ChannelAdapter> {
  if (organization.isDemo) return sandboxAdapter(channel);
  throw new ChannelNotConnectedError(channel);
}

export function channelAvailabilityPhase(channel: ChannelName) {
  return AVAILABLE_IN_PHASE[channel];
}
