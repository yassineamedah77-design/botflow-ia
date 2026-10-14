import { z } from "zod";

import { conversationIntent, intentLevel } from "@/server/db/schema/enums";

/*
 * The shape of every SOFIA answer, enforced by structured outputs and
 * validated again here. Actions are fields of this object, never text
 * markers in the reply: a customer who types "[[BOOKING]]" only produces
 * text, and nothing in the reply is ever parsed for instructions.
 */

export const REPLY_LANGUAGES = ["fr", "pt", "en"] as const;
export type ReplyLanguage = (typeof REPLY_LANGUAGES)[number];

export const HANDOFF_REASONS = [
  "medical",
  "complaint",
  "price_unknown",
  "human_request",
  "out_of_scope",
  "manipulation",
  "other",
] as const;
export type HandoffReason = (typeof HANDOFF_REASONS)[number];

export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const noAction = z.object({ type: z.literal("none") }).strict();

const handoff = z
  .object({
    type: z.literal("handoff"),
    reason: z.enum(HANDOFF_REASONS),
    urgency: z.enum(["normal", "high"]),
    /** For the team, in the team's language: who, what, what is expected. */
    summary: z.string(),
  })
  .strict();

const bookingRequest = z
  .object({
    type: z.literal("booking_request"),
    /** Identifier of an active service of this establishment. */
    serviceSlug: z.string(),
    isNewClient: z.boolean().nullable(),
    preferredDays: z.array(z.enum(WEEKDAYS)),
    period: z.enum(["morning", "afternoon", "any"]),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().nullable(),
    /** Anything else the customer asked for, in the team's language. */
    notes: z.string().nullable(),
  })
  .strict();

const optOut = z.object({ type: z.literal("opt_out") }).strict();

export const sofiaTurnSchema = z
  .object({
    /** The message sent to the customer. */
    reply: z.string(),
    language: z.enum(REPLY_LANGUAGES),
    intent: z.enum(conversationIntent.enumValues),
    intentLevel: z.enum(intentLevel.enumValues),
    action: z.discriminatedUnion("type", [noAction, handoff, bookingRequest, optOut]),
  })
  .strict();

export type SofiaTurn = z.infer<typeof sofiaTurnSchema>;
export type SofiaAction = SofiaTurn["action"];
export type HandoffAction = Extract<SofiaAction, { type: "handoff" }>;
export type BookingRequestAction = Extract<SofiaAction, { type: "booking_request" }>;
