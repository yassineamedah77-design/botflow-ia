import { describe, expect, it } from "vitest";

import { memoryKnowledgeSearch } from "@/server/ai/knowledge";
import { runSofiaTurn } from "@/server/ai/orchestrator";

import { LUMINA_GIFT_CARD_DOCUMENT, luminaSnapshot } from "../ai/fixtures";
import { GOLDEN, ReplayProvider, type ReplayAnswer } from "../ai/golden";
import { SCENARIOS, type Scenario } from "../ai/scenarios";

/*
 * Calibrates the test bench without a model: the reference answer of every
 * scenario must pass all its checks without any guard firing, and every
 * classic wrong answer must be caught. A bench that punished a correct
 * answer, or missed a wrong one, would measure nothing.
 */

async function replay(scenario: Scenario, answer: ReplayAnswer) {
  const result = await runSofiaTurn({
    provider: new ReplayProvider(answer),
    snapshot: luminaSnapshot(),
    conversation: scenario.conversation,
    customer: scenario.customer ?? null,
    channel: "WHATSAPP",
    search: memoryKnowledgeSearch([LUMINA_GIFT_CARD_DOCUMENT]),
    now: new Date("2026-10-14T15:00:00Z"),
  });
  if (result.status !== "answered") throw new Error(`${result.reason}: ${result.detail}`);
  return { result, failed: scenario.checks.filter((check) => !check.test(result)).map((check) => check.label) };
}

describe("test bench calibration", () => {
  it("has reference answers for every scenario", () => {
    expect(Object.keys(GOLDEN).sort()).toEqual(SCENARIOS.map((scenario) => scenario.id).sort());
  });

  describe.each(SCENARIOS.map((scenario) => [`${scenario.id} ${scenario.title}`, scenario] as const))("%s", (_, scenario) => {
    const golden = GOLDEN[scenario.id]!;

    it("passes a correct answer, untouched by the guards", async () => {
      const { result, failed } = await replay(scenario, golden.good);
      expect(result.violations).toEqual([]);
      expect(result.adjustments).toEqual([]);
      expect(failed).toEqual([]);
    });

    it.each(golden.wrong.map((wrong) => [wrong.label, wrong] as const))("catches « %s »", async (_, wrong) => {
      const { failed } = await replay(scenario, wrong.answer);
      expect(wrong.fails.length).toBeGreaterThan(0);
      expect(failed).toEqual(expect.arrayContaining(wrong.fails));
    });
  });
});
