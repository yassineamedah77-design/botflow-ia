import "server-only";

import type { z } from "zod";

/*
 * The language model behind SOFIA, behind one interface. The orchestrator
 * builds a provider-neutral request (prompt layers, conversation, tools,
 * expected output); an implementation turns it into API calls. Swapping the
 * model, adding a fallback or replaying scripted answers in tests never
 * touches the orchestrator.
 */

/** Who wrote a past message, as the model sees it. */
export type TurnAuthor = "customer" | "assistant" | "team";

export interface ConversationTurn {
  author: TurnAuthor;
  text: string;
}

/**
 * A read-only lookup the model may call while preparing its answer. Tools
 * never change anything: actions (handing over, a booking request…) come
 * back in the validated output and are applied by the orchestrator.
 */
export interface LlmTool {
  name: string;
  /** When to call it, written for the model. */
  description: string;
  /** JSON Schema of the input (strict: every property required, no extra one). */
  inputSchema: Record<string, unknown>;
  /** Validates the raw input; a rejected input is reported back to the model as an error. */
  parseInput: (input: unknown) => { success: true; data: unknown } | { success: false; error: string };
  run: (input: unknown) => Promise<string>;
}

export interface LlmRequest<T> {
  /** Stable rules shared by every establishment: cached first. */
  platformPrompt: string;
  /** This establishment's knowledge: cached until it changes. */
  establishmentPrompt: string;
  /** Volatile facts for this turn only (date, channel, who is writing). */
  turnContext: string;
  /** Oldest first; the last turn is the customer's message to answer. */
  conversation: ConversationTurn[];
  tools: LlmTool[];
  /** Validated shape of the final answer. */
  output: z.ZodType<T>;
  /** Tool calls allowed before the model must answer. */
  maxToolRounds?: number;
  /** Correlation id for logs. */
  requestId?: string;
}

export interface LlmToolCall {
  name: string;
  input: unknown;
  ok: boolean;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface LlmResult<T> {
  output: T;
  provider: string;
  /** Model that produced the final answer (may be the fallback one). */
  model: string;
  /** True when the main model was unavailable or declined and another one answered. */
  usedFallback: boolean;
  usage: LlmUsage;
  toolCalls: LlmToolCall[];
  latencyMs: number;
}

export interface LlmProvider {
  readonly name: string;
  generate<T>(request: LlmRequest<T>): Promise<LlmResult<T>>;
}

/** No model can be reached right now (outage, overload, network): a human must answer. */
export class LlmUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LlmUnavailableError";
  }
}

/** Not configured on this deployment (no API key): a configuration problem, not an outage. */
export class LlmNotConfiguredError extends Error {
  constructor(message = "No language model is configured (ANTHROPIC_API_KEY is missing).") {
    super(message);
    this.name = "LlmNotConfiguredError";
  }
}

/** The model declined to answer, or answered outside the expected shape. */
export class LlmUnusableAnswerError extends Error {
  constructor(
    message: string,
    readonly reason: "refusal" | "invalid_output" | "too_long" | "too_many_tool_calls",
  ) {
    super(message);
    this.name = "LlmUnusableAnswerError";
  }
}

export function emptyUsage(): LlmUsage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}

export function addUsage(total: LlmUsage, more: LlmUsage): LlmUsage {
  return {
    inputTokens: total.inputTokens + more.inputTokens,
    outputTokens: total.outputTokens + more.outputTokens,
    cacheReadTokens: total.cacheReadTokens + more.cacheReadTokens,
    cacheWriteTokens: total.cacheWriteTokens + more.cacheWriteTokens,
  };
}
