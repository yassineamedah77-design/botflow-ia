import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { whatsappConnectionSchema } from "@/lib/validation/whatsapp";
import { GraphError, sendTextMessage } from "@/server/whatsapp/graph";
import { describeInbound, isAnswerable, isValidSignature, parseWebhookPayload, type InboundEvent } from "@/server/whatsapp/webhook";

const change = (value: Record<string, unknown>) => ({
  object: "whatsapp_business_account",
  entry: [{ id: "WABA", changes: [{ field: "messages", value: { messaging_product: "whatsapp", metadata: { phone_number_id: "123456" }, ...value } }] }],
});

describe("WhatsApp webhook signature", () => {
  const secret = "app-secret-0123456789";
  const body = JSON.stringify(change({}));
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  it("accepts Meta's HMAC of the exact body, and nothing else", () => {
    expect(isValidSignature(body, signature, secret)).toBe(true);
    expect(isValidSignature(body, signature.toUpperCase().replace("SHA256", "sha256"), secret)).toBe(true);
    expect(isValidSignature(`${body}\n`, signature, secret)).toBe(false);
    expect(isValidSignature(body, signature, "another-secret-0123")).toBe(false);
    expect(isValidSignature(body, null, secret)).toBe(false);
    expect(isValidSignature(body, "sha1=abc", secret)).toBe(false);
  });
});

describe("WhatsApp webhook payloads", () => {
  it("reads texts, button replies and captions, with the customer's profile name", () => {
    const events = parseWebhookPayload(
      change({
        contacts: [{ wa_id: "33612345678", profile: { name: "  Maria Silva " } }],
        messages: [
          { from: "33612345678", id: "wamid.1", timestamp: "1790000000", type: "text", text: { body: " Bonjour " } },
          { from: "33612345678", id: "wamid.2", timestamp: "1790000001", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "b1", title: "Oui" } } },
          { from: "33612345678", id: "wamid.3", timestamp: "1790000002", type: "image", image: { id: "m1", mime_type: "image/jpeg", caption: "Ma peau" } },
          { from: "33612345678", id: "wamid.4", timestamp: "1790000003", type: "reaction", reaction: { message_id: "wamid.0", emoji: "👍" } },
        ],
      }),
    );
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ kind: "message", phoneNumberId: "123456", waId: "33612345678", profileName: "Maria Silva", contentType: "TEXT", text: "Bonjour" });
    expect((events[0] as InboundEvent).timestamp.toISOString()).toBe(new Date(1_790_000_000_000).toISOString());
    expect(events[1]).toMatchObject({ contentType: "INTERACTIVE", text: "Oui" });
    expect(events[2]).toMatchObject({ contentType: "IMAGE", text: "Ma peau", media: { type: "image", id: "m1", mimeType: "image/jpeg" } });
  });

  it("reads delivery reports and their errors", () => {
    const events = parseWebhookPayload(
      change({
        statuses: [
          { id: "wamid.s1", status: "delivered", timestamp: "1790000000", recipient_id: "33612345678" },
          { id: "wamid.s2", status: "failed", timestamp: "1790000001", recipient_id: "33612345678", errors: [{ code: 131047, title: "Re-engagement message" }] },
          { id: "wamid.s3", status: "deleted", timestamp: "1790000002" },
        ],
      }),
    );
    expect(events).toEqual([
      expect.objectContaining({ kind: "status", messageId: "wamid.s1", status: "DELIVERED", error: null }),
      expect.objectContaining({ kind: "status", messageId: "wamid.s2", status: "FAILED", error: { code: 131047, title: "Re-engagement message" } }),
    ]);
  });

  it("ignores what is not a WhatsApp message, instead of failing on it", () => {
    expect(parseWebhookPayload(null)).toEqual([]);
    expect(parseWebhookPayload({ object: "page", entry: [] })).toEqual([]);
    expect(parseWebhookPayload({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "account_update", value: {} }] }] })).toEqual([]);
    expect(parseWebhookPayload(change({ messages: [{ broken: true }] }))).toEqual([]);
  });

  it("sends voice notes and media without caption to the team", () => {
    const [voice] = parseWebhookPayload(change({ messages: [{ from: "336", id: "w", timestamp: "1", type: "audio", audio: { id: "a1" } }] })) as InboundEvent[];
    expect(isAnswerable(voice!)).toBe(false);
    expect(describeInbound(voice!)).toBe("[Message vocal reçu : SOFIA n'affiche pas encore les médias]");
    const [location] = parseWebhookPayload(change({ messages: [{ from: "336", id: "w2", timestamp: "1", type: "location", location: {} }] })) as InboundEvent[];
    expect(location).toMatchObject({ contentType: "OTHER", text: null });
    expect(describeInbound(location!)).toBe("[Position partagée : SOFIA n'affiche pas encore les médias]");
    const [captioned] = parseWebhookPayload(change({ messages: [{ from: "336", id: "w3", timestamp: "1", type: "image", image: { id: "i", caption: "Et ça ?" } }] })) as InboundEvent[];
    expect(isAnswerable(captioned!)).toBe(false);
    expect(describeInbound(captioned!)).toBe("[Photo] Et ça ?");
  });
});

describe("Graph API calls", () => {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const options = (responses: Response[], calls: string[]) => ({
    accessToken: "token",
    baseUrl: "https://graph.test",
    version: "v23.0",
    sleep: async () => {},
    fetch: async (input: string | URL | Request) => {
      calls.push(String(input));
      return responses.shift() ?? json(500, {});
    },
  });

  it("retries a throttled or unavailable Meta, then returns the message id", async () => {
    const calls: string[] = [];
    const id = await sendTextMessage("123", "33612345678", "Bonjour", options([json(503, {}), json(400, { error: { code: 130429, message: "Rate limit hit" } }), json(200, { messages: [{ id: "wamid.ok" }] })], calls));
    expect(id).toBe("wamid.ok");
    expect(calls).toEqual(Array(3).fill("https://graph.test/v23.0/123/messages"));
  });

  it("does not retry what will not change, and says why", async () => {
    const calls: string[] = [];
    const error = await sendTextMessage("123", "336", "Bonjour", options([json(401, { error: { code: 190, message: "Invalid OAuth access token." } })], calls)).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GraphError);
    expect(error).toMatchObject({ code: 190, isAuthError: true, isTransient: false });
    expect(calls).toHaveLength(1);

    const window = await sendTextMessage("123", "336", "Bonjour", options([json(400, { error: { code: 131047, message: "Re-engagement message" } })], [])).catch((caught: unknown) => caught);
    expect(window).toMatchObject({ isOutsideWindow: true });
  });

  it("gives up after three attempts", async () => {
    const calls: string[] = [];
    await expect(sendTextMessage("123", "336", "Bonjour", options([json(500, {}), json(500, {}), json(500, {}), json(200, { messages: [{ id: "late" }] })], calls))).rejects.toBeInstanceOf(GraphError);
    expect(calls).toHaveLength(3);
  });
});

describe("WhatsApp connection form", () => {
  it("accepts Meta's ids and a token, and explains what is wrong otherwise", () => {
    expect(whatsappConnectionSchema.safeParse({ phoneNumberId: " 106540352242922 ", businessAccountId: "102290129340398", accessToken: "EAAGm0PX4ZCpsBAKx" + "0".repeat(20) }).success).toBe(true);
    const invalid = whatsappConnectionSchema.safeParse({ phoneNumberId: "+33 6 12", businessAccountId: "abc", accessToken: "EAA token avec espace 0123456789" });
    expect(invalid.success).toBe(false);
    expect(invalid.error!.issues.map((issue) => issue.path[0])).toEqual(["phoneNumberId", "businessAccountId", "accessToken"]);
  });
});
