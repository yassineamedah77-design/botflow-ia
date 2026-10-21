import "server-only";

import { z } from "zod";

import { getLlmProvider } from "@/server/ai/config";
import { describeViolation } from "@/server/ai/guards";
import { databaseKnowledgeSearch, loadKnowledgeSnapshot } from "@/server/ai/knowledge";
import { runSofiaTurn } from "@/server/ai/orchestrator";
import type { SofiaAction } from "@/server/ai/reply";
import type { TenantContext } from "@/server/auth/context";
import { consumeDemoAiBudget } from "@/server/demo/sandbox";
import { withTenant } from "@/server/db/context";
import { AppError } from "@/server/errors";
import { recordEventDetached } from "@/server/observability/audit";
import { consumeRateLimit, formatRetryAfter } from "@/server/security/rate-limit";

import { requirePermission } from "./guards";

/*
 * "Tester SOFIA": the team writes as a customer and sees exactly what SOFIA
 * would answer with the establishment's real knowledge base, plus what she
 * understood and what she would do. Nothing is sent and no action is
 * executed: the conversation lives in the browser, only the model usage is
 * logged.
 */

export const consoleTranscriptSchema = z
  .array(z.object({ author: z.enum(["customer", "assistant"]), text: z.string().trim().min(1).max(2000) }))
  .min(1)
  .max(40)
  .refine((turns) => turns.at(-1)?.author === "customer", { error: "Le dernier message doit être celui de la cliente." });

export type ConsoleTranscript = z.infer<typeof consoleTranscriptSchema>;

export type ConsoleAnswer =
  | {
      status: "answered";
      reply: string;
      language: string;
      intent: string;
      intentLevel: string;
      action: SofiaAction;
      /** The model's reply was blocked by a guard and replaced by a neutral message. */
      replaced: boolean;
      originalReply: string | null;
      violations: string[];
      adjustments: string[];
      searches: Array<{ query: string; hits: number }>;
      model: string;
      usedFallback: boolean;
      latencyMs: number;
    }
  | { status: "unavailable"; message: string };

const UNAVAILABLE_MESSAGES = {
  not_configured: "SOFIA n'est pas encore reliée à son modèle d'intelligence artificielle : la clé API Anthropic doit être configurée sur le serveur.",
  unavailable: "Le modèle d'intelligence artificielle ne répond pas en ce moment. Réessayez dans un instant : en conversation réelle, la cliente serait transmise à votre équipe.",
  refusal: "Le modèle a refusé de répondre à ce message. En conversation réelle, la cliente serait transmise à votre équipe.",
  invalid_output: "La réponse du modèle était inexploitable. En conversation réelle, la cliente serait transmise à votre équipe.",
  too_long: "La réponse du modèle était trop longue. En conversation réelle, la cliente serait transmise à votre équipe.",
  too_many_tool_calls: "SOFIA a trop cherché sans répondre. En conversation réelle, la cliente serait transmise à votre équipe.",
} as const;

export async function testSofia(ctx: TenantContext, transcript: ConsoleTranscript): Promise<ConsoleAnswer> {
  requirePermission(ctx.can("knowledge:write"), "Seuls les propriétaires et administrateurs peuvent tester SOFIA.");
  const limit = await consumeRateLimit("sofiaTestsByOrganization", ctx.organization.id);
  if (!limit.allowed) {
    throw new AppError("RATE_LIMITED", `Limite de tests atteinte pour aujourd'hui. Réessayez dans ${formatRetryAfter(limit.retryAfterSeconds)}.`);
  }
  if (!(await consumeDemoAiBudget())) {
    throw new AppError("RATE_LIMITED", "La démonstration a atteint sa limite de tests pour aujourd'hui. Réessayez demain.");
  }

  const now = new Date();
  const snapshot = await withTenant(ctx.organization.id, (tx) => loadKnowledgeSnapshot(tx, ctx.organization, now));
  const result = await runSofiaTurn({
    provider: getLlmProvider(),
    snapshot,
    conversation: transcript,
    customer: null,
    channel: "TEST",
    search: databaseKnowledgeSearch(ctx.organization.id),
    now,
  });

  if (result.status === "failed") {
    if (result.reason !== "not_configured") {
      await recordEventDetached({
        organizationId: ctx.organization.id,
        type: "AI_ERROR",
        level: "WARN",
        message: `SOFIA test console: ${result.reason}`,
        details: { reason: result.reason, detail: result.detail, mode: "test" },
      });
    }
    return { status: "unavailable", message: UNAVAILABLE_MESSAGES[result.reason] };
  }

  await recordEventDetached({
    organizationId: ctx.organization.id,
    type: "AI_RESPONSE",
    message: `SOFIA test console answered (${result.turn.intent}, action ${result.turn.action.type})`,
    durationMs: result.trace.latencyMs,
    details: { mode: "test", userId: ctx.user.id, model: result.trace.model, usage: result.trace.usage, replaced: result.replaced },
  });

  return {
    status: "answered",
    reply: result.turn.reply,
    language: result.turn.language,
    intent: result.turn.intent,
    intentLevel: result.turn.intentLevel,
    action: result.turn.action,
    replaced: result.replaced,
    originalReply: result.originalReply,
    violations: result.violations.map(describeViolation),
    adjustments: result.adjustments,
    searches: result.searches,
    model: result.trace.model,
    usedFallback: result.trace.usedFallback,
    latencyMs: result.trace.latencyMs,
  };
}
