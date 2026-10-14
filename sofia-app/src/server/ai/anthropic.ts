import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { toStrictJsonSchema } from "./json-schema";
import {
  addUsage,
  emptyUsage,
  LlmNotConfiguredError,
  LlmUnavailableError,
  LlmUnusableAnswerError,
  type ConversationTurn,
  type LlmProvider,
  type LlmRequest,
  type LlmResult,
  type LlmToolCall,
} from "./provider";

/*
 * Claude, through the official Anthropic SDK.
 *
 * One answer is a short loop: the model may call the read-only search tool,
 * then must return the validated structured output (reply, language,
 * intent, action). The two prompt layers that do not change between turns
 * (platform rules, establishment knowledge) carry cache breakpoints, so a
 * conversation pays for them once every few minutes, not on every message.
 *
 * Refusals are retried server-side on another model (`fallbacks: "default"`);
 * outages are handled one level up, by trying the fallback model.
 */

export interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
  effort: "low" | "medium" | "high";
  /** Test seam: a preconfigured client. */
  client?: Anthropic;
}

const MAX_TOKENS = 16_000;
const DEFAULT_TOOL_ROUNDS = 3;

/** Team replies are written on the same channel as SOFIA's: the model must know who said what. */
function toMessages(conversation: ConversationTurn[]): Anthropic.Beta.BetaMessageParam[] {
  if (conversation[0]?.author !== "customer") {
    throw new Error("The conversation sent to the model must start with a customer message.");
  }
  return conversation.map((turn) =>
    turn.author === "customer"
      ? { role: "user", content: turn.text }
      : { role: "assistant", content: turn.author === "team" ? `[Message écrit par l'équipe de l'établissement]\n${turn.text}` : turn.text },
  );
}

function usageOf(message: Anthropic.Beta.BetaMessage) {
  return {
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
  };
}

/** The final text block is the JSON answer: parsed, then validated again against the same schema. */
function parseStructuredOutput<T>(text: string, schema: LlmRequest<T>["output"]): T {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new LlmUnusableAnswerError("The answer is not valid JSON.", "invalid_output");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new LlmUnusableAnswerError(`The answer does not match the expected shape: ${parsed.error.issues[0]?.message ?? "invalid"}`, "invalid_output");
  }
  return parsed.data;
}

/** Outages, overload and rate limits: another model may still answer. Anything else is a bug or a configuration error. */
function translateError(error: unknown): never {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    throw new LlmNotConfiguredError("The Anthropic API key was rejected (check ANTHROPIC_API_KEY and the account's billing).");
  }
  if (
    error instanceof Anthropic.APIConnectionError ||
    error instanceof Anthropic.RateLimitError ||
    error instanceof Anthropic.InternalServerError ||
    (error instanceof Anthropic.APIError && error.status === 529)
  ) {
    throw new LlmUnavailableError(`Anthropic API unavailable: ${error.message}`, { cause: error });
  }
  throw error;
}

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;

  constructor(private readonly options: AnthropicProviderOptions) {
    // The SDK already retries connection errors, 429 and 5xx twice with backoff.
    this.client = options.client ?? new Anthropic({ apiKey: options.apiKey, maxRetries: 2, timeout: 60_000 });
  }

  get model() {
    return this.options.model;
  }

  async generate<T>(request: LlmRequest<T>): Promise<LlmResult<T>> {
    const started = Date.now();
    const system: Anthropic.Beta.BetaTextBlockParam[] = [
      { type: "text", text: request.platformPrompt, cache_control: { type: "ephemeral" } },
      { type: "text", text: request.establishmentPrompt, cache_control: { type: "ephemeral" } },
      { type: "text", text: request.turnContext },
    ];
    const tools: Anthropic.Beta.BetaTool[] = request.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Beta.BetaTool.InputSchema,
      strict: true,
    }));
    const messages = toMessages(request.conversation);
    const format = { type: "json_schema" as const, schema: toStrictJsonSchema(request.output) };
    const maxRounds = request.maxToolRounds ?? DEFAULT_TOOL_ROUNDS;
    const toolCalls: LlmToolCall[] = [];
    let usage = emptyUsage();
    let usedFallback = false;

    for (let round = 0; round <= maxRounds; round++) {
      let response: Anthropic.Beta.BetaMessage;
      try {
        response = await this.client.beta.messages.create({
          model: this.options.model,
          max_tokens: MAX_TOKENS,
          system,
          messages,
          tools,
          output_config: { effort: this.options.effort, format },
          // A declined request is re-run on a model chosen by the API for that category.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        });
      } catch (error) {
        translateError(error);
      }

      usage = addUsage(usage, usageOf(response));
      if (response.model !== this.options.model) usedFallback = true;

      if (response.stop_reason === "refusal") {
        throw new LlmUnusableAnswerError("The model declined to answer.", "refusal");
      }
      if (response.stop_reason === "max_tokens") {
        throw new LlmUnusableAnswerError("The answer was cut off (max_tokens).", "too_long");
      }

      const toolUses = response.content.filter((block): block is Anthropic.Beta.BetaToolUseBlock => block.type === "tool_use");
      if (response.stop_reason === "tool_use" && toolUses.length > 0) {
        if (round === maxRounds) {
          throw new LlmUnusableAnswerError("The model kept searching instead of answering.", "too_many_tool_calls");
        }
        // The whole assistant turn goes back unchanged (thinking blocks included).
        messages.push({ role: "assistant", content: response.content });
        const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const use of toolUses) {
          const tool = request.tools.find((candidate) => candidate.name === use.name);
          const parsed = tool?.parseInput(use.input);
          if (!tool || !parsed || !parsed.success) {
            toolCalls.push({ name: use.name, input: use.input, ok: false });
            results.push({
              type: "tool_result",
              tool_use_id: use.id,
              is_error: true,
              content: JSON.stringify({ error: tool ? (parsed && !parsed.success ? parsed.error : "invalid input") : "unknown tool" }),
            });
            continue;
          }
          toolCalls.push({ name: use.name, input: parsed.data, ok: true });
          results.push({ type: "tool_result", tool_use_id: use.id, content: await tool.run(parsed.data) });
        }
        // Every result of a turn in one message: splitting them discourages parallel calls.
        messages.push({ role: "user", content: results });
        continue;
      }

      const text = response.content
        .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");
      const output = parseStructuredOutput(text, request.output);
      return {
        output,
        provider: this.name,
        model: response.model,
        usedFallback,
        usage,
        toolCalls,
        latencyMs: Date.now() - started,
      };
    }
    throw new LlmUnusableAnswerError("The model kept searching instead of answering.", "too_many_tool_calls");
  }
}

/**
 * Tries each provider in order while they are unavailable. A refusal or an
 * invalid answer is final: asking another model the same thing would only
 * hide a problem the team must see.
 */
export class FailoverProvider implements LlmProvider {
  readonly name: string;

  constructor(private readonly providers: LlmProvider[]) {
    if (providers.length === 0) throw new Error("FailoverProvider needs at least one provider.");
    this.name = providers[0]!.name;
  }

  async generate<T>(request: LlmRequest<T>): Promise<LlmResult<T>> {
    let lastError: unknown;
    for (const [index, provider] of this.providers.entries()) {
      try {
        const result = await provider.generate(request);
        return index === 0 ? result : { ...result, usedFallback: true };
      } catch (error) {
        if (!(error instanceof LlmUnavailableError)) throw error;
        lastError = error;
      }
    }
    throw lastError;
  }
}
