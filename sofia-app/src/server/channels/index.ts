import "server-only";

import { and, eq } from "drizzle-orm";

import type { Transaction } from "@/server/db/context";
import { integrations } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { markWhatsappTokenRejected, readWhatsappCredentials } from "@/server/whatsapp/connection";
import { GraphError, sendTextMessage } from "@/server/whatsapp/graph";

/*
 * Outbound messages go through one adapter per channel (specification §36:
 * architecture, adapter, mock, visible status). The website widget (Phase 4)
 * and the WhatsApp Cloud API (Phase 5) are live; Instagram Messaging plugs in
 * here in Phase 6. Until a channel is really connected, sending is refused
 * with a clear message: nothing pretends to be delivered.
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

/**
 * The website widget has no provider to call: the visitor's chat window reads
 * new messages from SOFIA itself. A stored message is a sent message; it
 * becomes DELIVERED when the window fetches it.
 */
const websiteAdapter: ChannelAdapter = {
  channel: "WEBSITE",
  async send() {
    return { externalMessageId: null, status: "SENT", simulated: false };
  },
};

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
      channel === "INSTAGRAM"
        ? `Pour répondre depuis SOFIA, ${CHANNEL_NAMES[channel]} doit être connecté. Cette connexion arrive en phase ${AVAILABLE_IN_PHASE[channel]}.`
        : `Pour répondre depuis SOFIA, ${CHANNEL_NAMES[channel]} doit être connecté : Canaux → ${channel === "WHATSAPP" ? "WhatsApp" : "Site web"}.`,
    );
  }
}

/** WhatsApp accepted nothing: the message is not sent, and the reason is one the team can act on. */
export class ChannelDeliveryError extends AppError {
  constructor(
    message: string,
    readonly providerCode: number | null,
  ) {
    super("UNAVAILABLE", message);
  }
}

function whatsappFailureMessage(error: GraphError): string {
  if (error.isAuthError) return "Meta refuse le jeton d'accès de votre numéro WhatsApp : reconnectez-le dans Canaux → WhatsApp.";
  if (error.isOutsideWindow) return "La dernière réponse de la cliente date de plus de 24 h : WhatsApp n'autorise alors que les modèles de messages approuvés par Meta.";
  if (error.code === 131026) return "Ce numéro ne peut pas recevoir de message WhatsApp (il n'utilise pas WhatsApp, ou n'a pas accepté les conditions récentes).";
  if (error.code === 131021) return "WhatsApp refuse d'envoyer un message à votre propre numéro.";
  if (error.isTransient) return "WhatsApp est momentanément indisponible : le message n'est pas parti. Réessayez dans quelques minutes.";
  return `WhatsApp a refusé le message : ${error.message}`;
}

/** Sends on the establishment's own number, with the token kept encrypted in its integration. */
function whatsappAdapter(integration: { id: string; organizationId: string; phoneNumberId: string; accessToken: string }): ChannelAdapter {
  return {
    channel: "WHATSAPP",
    async send(message) {
      if (!message.externalThreadId) throw new ChannelDeliveryError("Cette conversation WhatsApp n'a pas de destinataire.", null);
      try {
        const id = await sendTextMessage(integration.phoneNumberId, message.externalThreadId, message.body, { accessToken: integration.accessToken });
        // Accepted by WhatsApp; "delivered" and "read" arrive later through the webhook.
        return { externalMessageId: id, status: "SENT", simulated: false };
      } catch (error) {
        if (!(error instanceof GraphError)) throw error;
        if (error.isAuthError) await markWhatsappTokenRejected(integration.organizationId, integration.id, error.message);
        throw new ChannelDeliveryError(whatsappFailureMessage(error), error.code);
      }
    },
  };
}

/**
 * The adapter able to deliver on `channel` for this establishment, or a
 * ChannelNotConnectedError. WhatsApp sends only while its integration is
 * CONNECTED; Phase 6 registers Instagram the same way.
 */
export async function getChannelAdapter(
  tx: Transaction,
  organization: { id: string; isDemo: boolean },
  channel: ChannelName,
): Promise<ChannelAdapter> {
  // A widget conversation only exists because a visitor wrote from the widget: its window can always read the reply.
  if (channel === "WEBSITE") return websiteAdapter;
  if (organization.isDemo) return sandboxAdapter(channel);
  if (channel === "WHATSAPP") {
    const [integration] = await tx
      .select({ id: integrations.id, phoneNumberId: integrations.externalAccountId, credentialsEncrypted: integrations.credentialsEncrypted })
      .from(integrations)
      .where(and(eq(integrations.organizationId, organization.id), eq(integrations.provider, "WHATSAPP_CLOUD"), eq(integrations.status, "CONNECTED")))
      .limit(1);
    const credentials = readWhatsappCredentials(integration?.credentialsEncrypted ?? null);
    if (integration?.phoneNumberId && credentials) {
      return whatsappAdapter({ id: integration.id, organizationId: organization.id, phoneNumberId: integration.phoneNumberId, accessToken: credentials.accessToken });
    }
  }
  throw new ChannelNotConnectedError(channel);
}

export function channelAvailabilityPhase(channel: ChannelName) {
  return AVAILABLE_IN_PHASE[channel];
}
