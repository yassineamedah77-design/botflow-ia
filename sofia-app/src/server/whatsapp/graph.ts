import "server-only";

import { env } from "@/server/env";

/*
 * The WhatsApp Cloud API, reached through Meta's Graph API. Only what SOFIA
 * needs: read a phone number, subscribe BotFlow's app to its account's
 * webhooks, send a text or an approved template. Transient failures (rate
 * limits, Meta unavailable, network) are retried with backoff; anything else
 * fails at once with Meta's own error code, which the callers translate.
 */

export interface GraphOptions {
  accessToken: string;
  fetch?: typeof fetch;
  /** Waits between retries; tests pass a no-op. */
  sleep?: (ms: number) => Promise<void>;
  baseUrl?: string;
  version?: string;
}

export class GraphError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    /** Meta's error code (190 invalid token, 131047 outside the 24 h window…); 0 for network failures. */
    readonly code: number,
    readonly subcode: number | null = null,
  ) {
    super(message);
    this.name = "GraphError";
  }

  /** The access token is no longer accepted: the connection must be redone. */
  get isAuthError() {
    return this.code === 190 || this.httpStatus === 401;
  }

  /** The customer's 24 h window closed: only an approved template can reach her. */
  get isOutsideWindow() {
    return this.code === 131047;
  }

  get isTransient() {
    return this.httpStatus === 0 || this.httpStatus === 429 || this.httpStatus >= 500 || TRANSIENT_CODES.has(this.code);
  }
}

/** Throttling and temporary unavailability, per Meta's error code reference. */
const TRANSIENT_CODES = new Set([1, 2, 4, 17, 341, 80007, 130429, 131000, 131016]);

const RETRY_DELAYS_MS = [500, 1500];
const TIMEOUT_MS = 10_000;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function graphRequest<T>(
  method: "GET" | "POST",
  path: string,
  options: GraphOptions,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = `${options.baseUrl ?? env().WHATSAPP_GRAPH_URL}/${options.version ?? env().WHATSAPP_GRAPH_VERSION}/${path}`;
  const doFetch = options.fetch ?? fetch;
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 0; ; attempt++) {
    let error: GraphError;
    try {
      const response = await doFetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${options.accessToken}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string; code?: number; error_subcode?: number } } | null;
      if (response.ok && payload && !payload.error) return payload as T;
      const metaError = payload?.error;
      error = new GraphError(
        metaError?.message?.slice(0, 300) ?? `Graph API answered ${response.status}`,
        response.status,
        metaError?.code ?? 0,
        metaError?.error_subcode ?? null,
      );
    } catch (cause) {
      error = new GraphError(cause instanceof Error ? cause.message : "Network error", 0, 0);
    }
    if (!error.isTransient || attempt >= RETRY_DELAYS_MS.length) throw error;
    await sleep(RETRY_DELAYS_MS[attempt]!);
  }
}

export interface PhoneNumberInfo {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
  code_verification_status?: string;
}

export function getPhoneNumber(phoneNumberId: string, options: GraphOptions) {
  return graphRequest<PhoneNumberInfo>(
    "GET",
    `${encodeURIComponent(phoneNumberId)}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`,
    options,
  );
}

export function listBusinessPhoneNumbers(businessAccountId: string, options: GraphOptions) {
  return graphRequest<{ data: Array<{ id: string }> }>("GET", `${encodeURIComponent(businessAccountId)}/phone_numbers?fields=id&limit=100`, options);
}

/** Webhooks of this WhatsApp Business Account are delivered to BotFlow's Meta app. */
export function subscribeApp(businessAccountId: string, options: GraphOptions) {
  return graphRequest<{ success: boolean }>("POST", `${encodeURIComponent(businessAccountId)}/subscribed_apps`, options, {});
}

interface SendResult {
  messages?: Array<{ id: string }>;
}

function sentMessageId(result: SendResult): string {
  const id = result.messages?.[0]?.id;
  if (!id) throw new GraphError("Graph API accepted the message without returning its id", 200, -1);
  return id;
}

export async function sendTextMessage(phoneNumberId: string, to: string, body: string, options: GraphOptions): Promise<string> {
  const result = await graphRequest<SendResult>("POST", `${encodeURIComponent(phoneNumberId)}/messages`, options, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    // Links stay links, without a preview card SOFIA did not choose.
    text: { body, preview_url: false },
  });
  return sentMessageId(result);
}

export interface TemplateMessage {
  name: string;
  language: string;
  /** Values of the body's {{1}}, {{2}}… in order. */
  bodyParameters?: string[];
}

/** Approved templates are the only messages allowed outside the 24 h window (follow-ups, Phase 8). */
export async function sendTemplateMessage(phoneNumberId: string, to: string, template: TemplateMessage, options: GraphOptions): Promise<string> {
  const parameters = template.bodyParameters ?? [];
  const result = await graphRequest<SendResult>("POST", `${encodeURIComponent(phoneNumberId)}/messages`, options, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: template.name,
      language: { code: template.language },
      ...(parameters.length > 0 ? { components: [{ type: "body", parameters: parameters.map((text) => ({ type: "text", text })) }] } : {}),
    },
  });
  return sentMessageId(result);
}
