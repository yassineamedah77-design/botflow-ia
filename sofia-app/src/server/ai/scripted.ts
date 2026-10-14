import "server-only";

import { normalizeForSearch } from "@/lib/knowledge-text";

import { emptyUsage, type LlmProvider, type LlmRequest, type LlmResult } from "./provider";
import type { SofiaTurn } from "./reply";

/*
 * Automated tests only (AI_PROVIDER=scripted, refused in staging and
 * production): fixed answers chosen by keywords, so the end-to-end tests
 * exercise the console, the guards and the actions without calling a model.
 * Every reply says it comes from the test mode.
 */

function scriptedTurn(message: string): SofiaTurn {
  const text = normalizeForSearch(message);
  const base = { language: "fr" as const, intentLevel: "LOW" as const };
  if (/(rouge|brule|douleur|enceinte|allergi)/.test(text)) {
    return {
      ...base,
      reply: "[Mode test] C'est une question pour notre équipe : je préfère ne pas y répondre à sa place. Je transmets tout de suite.",
      intent: "MEDICAL_QUESTION",
      action: { type: "handoff", reason: "medical", urgency: /brule|douleur/.test(text) ? "high" : "normal", summary: "Question de santé (mode test)." },
    };
  }
  if (/\bstop\b|ne plus (recevoir|m'ecrire)/.test(text)) {
    return { ...base, reply: "[Mode test] C'est noté, vous ne recevrez plus de messages de notre part.", intent: "FOLLOW_UP", action: { type: "opt_out" } };
  }
  if (/(humain|quelqu.un|conseill)/.test(text)) {
    return {
      ...base,
      reply: "[Mode test] Je préviens l'équipe, quelqu'un vous répond très vite.",
      intent: "HUMAN_REQUEST",
      action: { type: "handoff", reason: "human_request", urgency: "normal", summary: "Demande à parler à l'équipe (mode test)." },
    };
  }
  // Lets the tests check that an invented price never leaves the platform.
  if (text.includes("#prix-invente")) {
    return { ...base, reply: "[Mode test] Ce soin coûte 999 €.", intent: "PRICE_REQUEST", intentLevel: "MEDIUM", action: { type: "none" } };
  }
  return { ...base, reply: "[Mode test] Bonjour ! Réponse simulée : aucun modèle n'a été appelé.", intent: "GENERAL_INFORMATION", action: { type: "none" } };
}

export class ScriptedProvider implements LlmProvider {
  readonly name = "scripted";

  async generate<T>(request: LlmRequest<T>): Promise<LlmResult<T>> {
    const last = request.conversation.at(-1);
    const output = request.output.parse(scriptedTurn(last?.text ?? ""));
    return { output, provider: this.name, model: "scripted", usedFallback: false, usage: emptyUsage(), toolCalls: [], latencyMs: 0 };
  }
}
