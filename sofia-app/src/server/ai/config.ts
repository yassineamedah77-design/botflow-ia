import "server-only";

import { env } from "@/server/env";

import { AnthropicProvider, FailoverProvider } from "./anthropic";
import type { LlmProvider } from "./provider";
import { ScriptedProvider } from "./scripted";

export interface AiConfiguration {
  /** False when no model can be called (no API key): SOFIA stays silent and the team answers. */
  configured: boolean;
  provider: "anthropic" | "scripted";
  model: string | null;
  fallbackModel: string | null;
}

export function describeAiConfiguration(): AiConfiguration {
  const config = env();
  if (config.AI_PROVIDER === "scripted") return { configured: true, provider: "scripted", model: "scripted", fallbackModel: null };
  const fallback = config.SOFIA_AI_FALLBACK_MODEL;
  return {
    configured: Boolean(config.ANTHROPIC_API_KEY),
    provider: "anthropic",
    model: config.SOFIA_AI_MODEL,
    fallbackModel: fallback && fallback !== "none" && fallback !== config.SOFIA_AI_MODEL ? fallback : null,
  };
}

let cached: LlmProvider | null | undefined;

/** The provider for this deployment, or null when none is configured. */
export function getLlmProvider(): LlmProvider | null {
  if (cached !== undefined) return cached;
  const config = env();
  const description = describeAiConfiguration();
  if (description.provider === "scripted") {
    cached = new ScriptedProvider();
  } else if (!config.ANTHROPIC_API_KEY) {
    cached = null;
  } else {
    const make = (model: string) => new AnthropicProvider({ apiKey: config.ANTHROPIC_API_KEY!, model, effort: config.SOFIA_AI_EFFORT });
    const providers = [make(description.model!)];
    if (description.fallbackModel) providers.push(make(description.fallbackModel));
    cached = providers.length === 1 ? providers[0]! : new FailoverProvider(providers);
  }
  return cached;
}

/** Test helper: forget the provider after changing the environment. */
export function resetLlmProvider() {
  cached = undefined;
}
