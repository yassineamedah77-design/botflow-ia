import "server-only";

import { createHmac } from "node:crypto";

import { z } from "zod";

import { constantTimeEqual } from "@/server/security/crypto";

/*
 * Meta's webhook deliveries, checked then flattened into the two events SOFIA
 * acts on: a message from a customer, and the delivery status of a message
 * SOFIA sent. Everything else in the payload is ignored. Nothing here touches
 * the database, so the parsing is tested on its own.
 */

/** HMAC-SHA256 of the raw body with the app secret, as sent in X-Hub-Signature-256. */
export function isValidSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  const match = header?.match(/^sha256=([0-9a-f]{64})$/i);
  if (!match) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  return constantTimeEqual(expected, match[1]!.toLowerCase());
}

export type InboundContentType = "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "INTERACTIVE" | "OTHER";

export interface InboundEvent {
  kind: "message";
  phoneNumberId: string;
  /** The customer's WhatsApp id: her number in international format, without "+". */
  waId: string;
  profileName: string | null;
  messageId: string;
  timestamp: Date;
  contentType: InboundContentType;
  /** What SOFIA and the team read: the text, a button's label, or a media caption. */
  text: string | null;
  /** A media the customer sent (photo, voice note…); SOFIA does not read media. */
  media: { type: string; id: string | null; mimeType: string | null } | null;
}

export interface StatusEvent {
  kind: "status";
  phoneNumberId: string;
  messageId: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  timestamp: Date;
  error: { code: number; title: string } | null;
}

export type WebhookEvent = InboundEvent | StatusEvent;

const mediaSchema = z.object({ id: z.string().optional(), mime_type: z.string().optional(), caption: z.string().optional() }).loose();

const messageSchema = z
  .object({
    from: z.string(),
    id: z.string(),
    timestamp: z.string(),
    type: z.string(),
    text: z.object({ body: z.string() }).loose().optional(),
    button: z.object({ text: z.string() }).loose().optional(),
    interactive: z
      .object({
        button_reply: z.object({ title: z.string() }).loose().optional(),
        list_reply: z.object({ title: z.string() }).loose().optional(),
      })
      .loose()
      .optional(),
    image: mediaSchema.optional(),
    audio: mediaSchema.optional(),
    video: mediaSchema.optional(),
    document: mediaSchema.optional(),
    sticker: mediaSchema.optional(),
  })
  .loose();

const statusSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    timestamp: z.string(),
    errors: z.array(z.object({ code: z.number(), title: z.string().optional(), message: z.string().optional() }).loose()).optional(),
  })
  .loose();

const valueSchema = z
  .object({
    metadata: z.object({ phone_number_id: z.string() }).loose(),
    contacts: z.array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string().optional() }).loose().optional() }).loose()).optional(),
    messages: z.array(z.unknown()).optional(),
    statuses: z.array(z.unknown()).optional(),
  })
  .loose();

const payloadSchema = z
  .object({
    object: z.string(),
    entry: z.array(z.object({ changes: z.array(z.object({ field: z.string(), value: z.unknown() }).loose()).default([]) }).loose()).default([]),
  })
  .loose();

const STATUS: Record<string, StatusEvent["status"]> = { sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" };

const MEDIA_TYPES: Record<string, InboundContentType> = { image: "IMAGE", sticker: "IMAGE", audio: "AUDIO", video: "VIDEO", document: "DOCUMENT" };

function toDate(seconds: string): Date {
  const value = Number(seconds);
  return Number.isFinite(value) && value > 0 ? new Date(value * 1000) : new Date();
}

function cleanText(value: string | undefined | null): string | null {
  const text = value?.trim();
  return text ? text.slice(0, 4000) : null;
}

function toInbound(raw: unknown, phoneNumberId: string, names: Map<string, string>): InboundEvent | null {
  const parsed = messageSchema.safeParse(raw);
  if (!parsed.success) return null;
  const message = parsed.data;
  // A reaction (emoji on a message) or a system notice is not something to answer.
  if (message.type === "reaction" || message.type === "system" || message.type === "ephemeral") return null;

  const base = {
    kind: "message" as const,
    phoneNumberId,
    waId: message.from,
    profileName: names.get(message.from) ?? null,
    messageId: message.id,
    timestamp: toDate(message.timestamp),
  };
  if (message.type === "text") return { ...base, contentType: "TEXT", text: cleanText(message.text?.body), media: null };
  if (message.type === "button") return { ...base, contentType: "INTERACTIVE", text: cleanText(message.button?.text), media: null };
  if (message.type === "interactive") {
    const reply = message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title;
    return { ...base, contentType: "INTERACTIVE", text: cleanText(reply), media: null };
  }
  const mediaType = MEDIA_TYPES[message.type];
  if (mediaType) {
    const media = message[message.type as "image" | "audio" | "video" | "document" | "sticker"];
    return {
      ...base,
      contentType: mediaType,
      text: cleanText(media?.caption),
      media: { type: message.type, id: media?.id ?? null, mimeType: media?.mime_type ?? null },
    };
  }
  // Location, contact card, order, unsupported…: kept for the team, never answered by SOFIA.
  return { ...base, contentType: "OTHER", text: null, media: { type: message.type, id: null, mimeType: null } };
}

function toStatus(raw: unknown, phoneNumberId: string): StatusEvent | null {
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return null;
  const status = STATUS[parsed.data.status];
  if (!status) return null;
  const error = parsed.data.errors?.[0];
  return {
    kind: "status",
    phoneNumberId,
    messageId: parsed.data.id,
    status,
    timestamp: toDate(parsed.data.timestamp),
    error: error ? { code: error.code, title: (error.message ?? error.title ?? "").slice(0, 300) } : null,
  };
}

/** The events of one delivery, in order. Unknown shapes are skipped, never thrown on: Meta would retry them forever. */
export function parseWebhookPayload(payload: unknown): WebhookEvent[] {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success || parsed.data.object !== "whatsapp_business_account") return [];
  const events: WebhookEvent[] = [];
  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;
      const value = valueSchema.safeParse(change.value);
      if (!value.success) continue;
      const phoneNumberId = value.data.metadata.phone_number_id;
      const names = new Map<string, string>();
      for (const contact of value.data.contacts ?? []) {
        const name = cleanText(contact.profile?.name);
        if (name) names.set(contact.wa_id, name.slice(0, 120));
      }
      for (const message of value.data.messages ?? []) {
        const event = toInbound(message, phoneNumberId, names);
        if (event) events.push(event);
      }
      for (const status of value.data.statuses ?? []) {
        const event = toStatus(status, phoneNumberId);
        if (event) events.push(event);
      }
    }
  }
  return events;
}

/** What the team reads in the inbox for a message SOFIA cannot read. */
export function describeInbound(event: InboundEvent): string {
  const kinds: Record<string, { label: string; received: string }> = {
    image: { label: "Photo", received: "Photo reçue" },
    sticker: { label: "Autocollant", received: "Autocollant reçu" },
    audio: { label: "Message vocal", received: "Message vocal reçu" },
    video: { label: "Vidéo", received: "Vidéo reçue" },
    document: { label: "Document", received: "Document reçu" },
    location: { label: "Position", received: "Position partagée" },
    contacts: { label: "Fiche contact", received: "Fiche contact reçue" },
  };
  if (!event.media) return event.text ?? "";
  const kind = kinds[event.media.type] ?? { label: "Message", received: "Message d'un type non pris en charge" };
  return event.text ? `[${kind.label}] ${event.text}` : `[${kind.received} : SOFIA n'affiche pas encore les médias]`;
}

/** Only real words are answered by SOFIA; a voice note or a photo without caption goes to the team. */
export function isAnswerable(event: InboundEvent): boolean {
  return Boolean(event.text) && (event.contentType === "TEXT" || event.contentType === "INTERACTIVE");
}
