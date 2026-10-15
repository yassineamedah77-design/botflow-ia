/**
 * SOFIA's test bench: replays the scenarios of tests/ai/scenarios.ts against
 * the real model, several times each, and reports how often every check
 * holds. A prompt that passes once proves little; the variance is what
 * tells whether SOFIA can be trusted with real customers.
 *
 *   ANTHROPIC_API_KEY=… npm run ai:bench                 # 5 runs per scenario
 *   ANTHROPIC_API_KEY=… BENCH_RUNS=10 npm run ai:bench C2 C3   # some scenarios only
 *   npm run ai:bench -- --replay          # reference answers, no model, no key
 *   npm run ai:bench -- --replay=wrong    # the classic wrong answers: all must be caught
 *
 * Every live run is a paid model call (about 30 s and a few cents per run with
 * the default model). The replay modes call no model: they check the bench
 * itself (tests/ai/golden.ts), not SOFIA. The report is printed and written to
 * bench-results/.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { AnthropicProvider, FailoverProvider } from "@/server/ai/anthropic";
import { memoryKnowledgeSearch } from "@/server/ai/knowledge";
import { runSofiaTurn, type RunTurnResult } from "@/server/ai/orchestrator";
import { PROMPT_VERSION } from "@/server/ai/prompt";
import type { LlmProvider } from "@/server/ai/provider";

import { LUMINA_GIFT_CARD_DOCUMENT, luminaSnapshot } from "../tests/ai/fixtures";
import { GOLDEN, ReplayProvider } from "../tests/ai/golden";
import { SCENARIOS, type Scenario } from "../tests/ai/scenarios";

const args = process.argv.slice(2);
const replayArg = args.find((arg) => arg.startsWith("--replay"));
const replay = replayArg ? (replayArg === "--replay=wrong" ? "wrong" : "good") : null;
const only = args.filter((arg) => !arg.startsWith("--"));
const scenarios = only.length ? SCENARIOS.filter((scenario) => only.includes(scenario.id)) : SCENARIOS;

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!replay && !apiKey) {
  console.error("ANTHROPIC_API_KEY is not set: the bench calls the real model. Without a key, `npm run ai:bench -- --replay` checks the bench itself.");
  process.exit(1);
}

const model = process.env.SOFIA_AI_MODEL ?? "claude-opus-5-5";
const fallbackModel = process.env.SOFIA_AI_FALLBACK_MODEL ?? "claude-sonnet-5-5";
const effort = (process.env.SOFIA_AI_EFFORT as "low" | "medium" | "high" | undefined) ?? "medium";
const runs = Math.max(1, Number(process.env.BENCH_RUNS ?? 5));
const concurrency = Math.max(1, Number(process.env.BENCH_CONCURRENCY ?? 3));

function liveProvider(key: string): LlmProvider {
  const providers = [new AnthropicProvider({ apiKey: key, model, effort })];
  if (fallbackModel !== "none" && fallbackModel !== model) providers.push(new AnthropicProvider({ apiKey: key, model: fallbackModel, effort }));
  return new FailoverProvider(providers);
}

/** What each run of a scenario answers with: the model, or a prepared answer. */
function attempts(scenario: Scenario, live: LlmProvider | null): Array<{ label: string | null; provider: LlmProvider }> {
  if (live) return Array.from({ length: runs }, () => ({ label: null, provider: live }));
  const golden = GOLDEN[scenario.id]!;
  if (replay === "good") return [{ label: "réponse de référence", provider: new ReplayProvider(golden.good) }];
  return golden.wrong.map((wrong) => ({ label: wrong.label, provider: new ReplayProvider(wrong.answer) }));
}

interface RunRecord {
  scenario: Scenario;
  run: number;
  label: string | null;
  result: RunTurnResult;
  failed: string[];
  durationMs: number;
}

async function runOnce(scenario: Scenario, run: number, label: string | null, provider: LlmProvider): Promise<RunRecord> {
  const started = Date.now();
  try {
    const result = await runSofiaTurn({
      provider,
      snapshot: luminaSnapshot(),
      conversation: scenario.conversation,
      customer: scenario.customer ?? null,
      channel: "WHATSAPP",
      search: memoryKnowledgeSearch([LUMINA_GIFT_CARD_DOCUMENT]),
      now: new Date("2026-10-14T15:00:00Z"),
    });
    const failed = result.status === "answered" ? scenario.checks.filter((check) => !check.test(result)).map((check) => check.label) : [`échec : ${result.reason}`];
    return { scenario, run, label, result, failed, durationMs: Date.now() - started };
  } catch (error) {
    return {
      scenario,
      run,
      label,
      result: { status: "failed", reason: "invalid_output", detail: error instanceof Error ? error.message : String(error) },
      failed: [`erreur : ${error instanceof Error ? error.message : String(error)}`],
      durationMs: Date.now() - started,
    };
  }
}

/** In --replay=wrong, a run "passes" when the bench caught the mistake. */
const caught = (record: RunRecord) => (replay === "wrong" ? record.failed.length > 0 : record.failed.length === 0);

async function main() {
  const live = replay ? null : liveProvider(apiKey!);
  const jobs = scenarios.flatMap((scenario) =>
    attempts(scenario, live).map((attempt, index) => () => runOnce(scenario, index + 1, attempt.label, attempt.provider)),
  );
  const records: RunRecord[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < jobs.length) {
        const job = jobs[next++]!;
        const record = await job();
        records.push(record);
        process.stdout.write(caught(record) ? "." : "x");
      }
    }),
  );
  process.stdout.write("\n\n");

  const usage = records.reduce(
    (total, record) => {
      if (record.result.status !== "answered") return total;
      const u = record.result.trace.usage;
      return { input: total.input + u.inputTokens, output: total.output + u.outputTokens, cacheRead: total.cacheRead + u.cacheReadTokens, cacheWrite: total.cacheWrite + u.cacheWriteTokens };
    },
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  );

  const setting = replay
    ? replay === "good"
      ? `Mode rejeu : réponses de référence écrites à la main, aucun modèle appelé. Ce rapport vérifie le banc et les garde-fous, pas SOFIA. Prompt ${PROMPT_VERSION}.`
      : `Mode rejeu des mauvaises réponses : chacune doit être détectée. « Réussite » compte les erreurs détectées. Aucun modèle appelé. Prompt ${PROMPT_VERSION}.`
    : `Modèle ${model} (secours ${fallbackModel}), effort ${effort}, prompt ${PROMPT_VERSION}, ${runs} passage${runs > 1 ? "s" : ""} par scénario.`;
  const lines = [
    `# Banc de test SOFIA — ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
    "",
    setting,
    "",
    `| Scénario | Réussite | ${replay === "wrong" ? "Critères qui ont détecté l'erreur" : "Échecs"} |`,
    "|---|---|---|",
  ];
  let allPassed = true;
  for (const scenario of scenarios) {
    const own = records.filter((record) => record.scenario.id === scenario.id).sort((a, b) => a.run - b.run);
    const passed = own.filter(caught).length;
    if (passed < own.length) allPassed = false;
    const failures = [...new Set(own.flatMap((record) => record.failed))].join(" ; ");
    lines.push(`| ${scenario.id} ${scenario.title} | ${passed}/${own.length} | ${failures || "—"} |`);
  }
  if (!replay) lines.push("", `Jetons : ${usage.input} en entrée, ${usage.cacheRead} lus en cache, ${usage.cacheWrite} écrits en cache, ${usage.output} en sortie.`);
  lines.push("");
  lines.push("## Réponses", "");
  for (const record of records.sort((a, b) => a.scenario.id.localeCompare(b.scenario.id) || a.run - b.run)) {
    const result = record.result;
    const status = record.failed.length === 0 ? "ok" : `ÉCHEC (${record.failed.join(" ; ")})`;
    const title = record.label ? `${record.scenario.id} · ${record.label}` : `${record.scenario.id} · passage ${record.run}`;
    lines.push(`### ${title} · ${status} · ${(record.durationMs / 1000).toFixed(1)} s`);
    if (result.status === "answered") {
      lines.push("", `> ${result.turn.reply.replace(/\n/g, "\n> ")}`, "", `\`${result.turn.language} · ${result.turn.intent} · ${result.turn.intentLevel} · ${JSON.stringify(result.turn.action)}\``);
      if (result.replaced) lines.push("", `Bloquée par un garde-fou. Réponse d'origine : ${result.originalReply}`);
    } else {
      lines.push("", `Pas de réponse : ${result.reason} (${result.detail})`);
    }
    lines.push("");
  }

  const report = lines.join("\n");
  const directory = path.join(process.cwd(), "bench-results");
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `bench-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
  writeFileSync(file, report);
  console.log(lines.slice(0, lines.indexOf("## Réponses")).join("\n").trimEnd());
  console.log(`\nRapport complet : ${path.relative(process.cwd(), file)}`);
  process.exit(allPassed ? 0 : 2);
}

void main();
