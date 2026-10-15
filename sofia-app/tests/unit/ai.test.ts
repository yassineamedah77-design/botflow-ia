import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import { dayRangeState, formatDayRange, isoDayInZone } from "@/lib/knowledge-dates";
import { buildSearchQuery, chunkDocument, normalizeForSearch } from "@/lib/knowledge-text";
import { AnthropicProvider, FailoverProvider } from "@/server/ai/anthropic";
import { applyGuards, extractAmounts, extractEmails, extractHosts, extractPercentages, extractPhones } from "@/server/ai/guards";
import { toStrictJsonSchema } from "@/server/ai/json-schema";
import { memoryKnowledgeSearch } from "@/server/ai/knowledge";
import { runSofiaTurn, splitConversation } from "@/server/ai/orchestrator";
import { buildEstablishmentPrompt, buildTurnContext, PLATFORM_PROMPT } from "@/server/ai/prompt";
import { LlmUnavailableError, type LlmProvider, type LlmRequest, type LlmResult } from "@/server/ai/provider";
import { sofiaTurnSchema, type SofiaTurn } from "@/server/ai/reply";
import { ScriptedProvider } from "@/server/ai/scripted";
import { parseEnv } from "@/server/env";

import { LUMINA_GIFT_CARD_DOCUMENT, luminaSnapshot } from "../ai/fixtures";

const turn = (overrides: Partial<SofiaTurn> = {}): SofiaTurn => ({
  reply: "Bonjour !",
  language: "fr",
  intent: "GENERAL_INFORMATION",
  intentLevel: "LOW",
  action: { type: "none" },
  ...overrides,
});

const guardContext = (overrides: Partial<Parameters<typeof applyGuards>[1]> = {}) => ({
  snapshot: luminaSnapshot(),
  searchHits: [],
  customerEmail: null,
  customerText: "",
  ...overrides,
});

/** A provider that returns prepared answers in order and records the requests. */
class QueueProvider implements LlmProvider {
  readonly name = "queue";
  readonly requests: Array<LlmRequest<unknown>> = [];
  constructor(private readonly answers: Array<SofiaTurn | Error | ((request: LlmRequest<unknown>) => Promise<SofiaTurn>)>) {}
  async generate<T>(request: LlmRequest<T>): Promise<LlmResult<T>> {
    this.requests.push(request as LlmRequest<unknown>);
    const next = this.answers.shift();
    if (!next) throw new Error("No prepared answer left");
    if (next instanceof Error) throw next;
    const output = typeof next === "function" ? await next(request as LlmRequest<unknown>) : next;
    return {
      output: request.output.parse(output),
      provider: this.name,
      model: "queue-model",
      usedFallback: false,
      usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
      toolCalls: [],
      latencyMs: 1,
    };
  }
}

describe("knowledge text", () => {
  it("searches without case or accents", () => {
    expect(normalizeForSearch("Épilation LASER à Évora")).toBe("epilation laser a evora");
  });

  it("splits documents on paragraphs and keeps the original text", () => {
    const paragraphs = Array.from({ length: 6 }, (_, index) => `Paragraphe ${index + 1}. ${"Texte détaillé du protocole. ".repeat(12)}`);
    const chunks = chunkDocument(paragraphs.join("\n\n"));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 1400)).toBe(true);
    expect(chunks.join("\n\n")).toContain("Paragraphe 6. Texte détaillé");
    expect(chunkDocument("Court.\n\nAussi court.")).toEqual(["Court.\n\nAussi court."]);
  });

  it("cuts a single huge paragraph on sentences", () => {
    const chunks = chunkDocument("Une phrase assez longue pour remplir le passage. ".repeat(80));
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.length <= 1400)).toBe(true);
  });

  it("builds a safe OR prefix query and drops stop words", () => {
    expect(buildSearchQuery("Combien de temps est valable une carte cadeau ?")).toBe("temps:* | valable:* | carte:* | cadeau:*");
    // tsquery syntax typed by a customer never reaches PostgreSQL.
    expect(buildSearchQuery("laser & !(drop) | 'x':*")).toBe("laser:* | drop:*");
    expect(buildSearchQuery("le la et ?")).toBeNull();
  });

  it("finds passages in memory like the database does", async () => {
    const search = memoryKnowledgeSearch([LUMINA_GIFT_CARD_DOCUMENT]);
    const hits = await search("validité carte cadeau");
    expect(hits[0]?.content).toContain("valables 12 mois");
    expect(await search("parking")).toEqual([]);
  });
});

describe("knowledge dates", () => {
  it("reads calendar days in the establishment's time zone", () => {
    // 23:30 UTC on 31 October: still 31 October in Lisbon (UTC+0 in winter), already 1 November in Paris.
    expect(isoDayInZone(new Date("2026-10-31T23:30:00Z"), "Europe/Lisbon")).toBe("2026-10-31");
    expect(isoDayInZone(new Date("2026-10-31T23:30:00Z"), "Europe/Paris")).toBe("2026-11-01");
    expect(isoDayInZone(new Date("2026-12-31T12:00:00Z"), "Europe/Paris", 1)).toBe("2027-01-01");
  });

  it("describes and situates ranges of days", () => {
    expect(formatDayRange("2026-12-24", "2027-01-02")).toBe("du 24 décembre 2026 au 2 janvier 2027");
    expect(formatDayRange("2027-05-01", "2027-05-01")).toBe("le 1 mai 2027");
    expect(formatDayRange(null, "2026-11-30")).toBe("jusqu'au 30 novembre 2026");
    expect(dayRangeState("2026-10-10", "2026-10-20", "2026-10-14")).toBe("current");
    expect(dayRangeState("2026-10-20", null, "2026-10-14")).toBe("upcoming");
    expect(dayRangeState(null, "2026-10-01", "2026-10-14")).toBe("past");
  });
});

describe("guard extraction", () => {
  it("finds amounts in every common way of writing euros", () => {
    const cents = (text: string) => extractAmounts(text).map((amount) => amount.cents);
    expect(cents("La séance est à 140 €.")).toEqual([14_000]);
    expect(cents("Comptez 85,50 € ou 12.50 euros")).toEqual([8_550, 1_250]);
    expect(cents("A partir de €45, ou 1 200 € le forfait")).toEqual([120_000, 4_500]);
    expect(cents("Une séance de 45 minutes, le 12/10")).toEqual([]);
  });

  it("finds phone numbers, emails and links", () => {
    expect(extractPhones("Appelez le +351 253 000 000 ou le 06 12 34 56 78")).toHaveLength(2);
    expect(extractPhones("Rendez-vous le 2026-10-14 à 9 h 30")).toEqual([]);
    expect(extractEmails("Écrivez à Ola@Clinica-Lumina.example.")).toEqual(["ola@clinica-lumina.example"]);
    expect(extractHosts("Voir https://www.exemple.fr/tarifs, ou autre-site.com").map((link) => link.host)).toEqual(["exemple.fr", "autre-site.com"]);
    // Any domain followed by a path is a link, whatever its extension.
    expect(extractHosts("Réservez sur bit.ly/rdv ou lumina.salon/tarifs").map((link) => link.host)).toEqual(["bit.ly", "lumina.salon"]);
    expect(extractHosts("Ouvert 24h/24, 7j/7, avec la Dre. Marques.")).toEqual([]);
  });

  it("finds percentages", () => {
    expect(extractPercentages("-20 % sur le peeling, ou 12,5% sur le forfait").map((found) => found.percent)).toEqual([20, 12.5]);
  });
});

describe("guards", () => {
  const plain = (reply: string) => applyGuards(turn({ reply }), guardContext());

  it("never blocks a correct reply, however it writes prices, hours, numbers and links", () => {
    const correct = [
      "Le laser jambes complètes est à 140€, séance unique d'environ 60 min.",
      "La consultation coûte 40,00 € et ce montant est déduit du premier acte.",
      "A consulta custa €40 e é descontada no primeiro ato.",
      "The laser for full legs is 140 EUR, about 60 minutes.",
      "Nous sommes ouverts du lundi au vendredi de 9h30 à 19h, et le samedi de 9h30 à 13h.",
      "Horaires : 09:30 – 19:00 en semaine, 09.30 - 13.00 le samedi.",
      "Nous sommes au Av. Central 120, 4710-229 Braga.",
      "Notre adresse : Av. Central 120 4710-229 Braga, parking gratuit au sous-sol.",
      "Appelez-nous au 253 000 000, au +351 253 000 000 ou au (+351) 253-000-000.",
      "En cas d'urgence vitale, composez le 112.",
      "La fermeture a lieu du 12/11 au 14/11/2026.",
      "Annulation gratuite jusqu'à 24 heures avant le rendez-vous, nous répondons 24h/24.",
      "Retrouvez-nous sur Instagram : @clinica.lumina ou instagram.com/clinica.lumina",
      "Our website is clinica-lumina.example and you can email ola@clinica-lumina.example.",
    ];
    for (const reply of correct) expect({ reply, violations: plain(reply).violations }).toEqual({ reply, violations: [] });
  });

  it("blocks invented prices, discounts, numbers and links, however they are written", () => {
    const invented: Array<[string, string]> = [
      ["Le microneedling est à 120 euros.", "unknown_amount"],
      ["Comptez 99€.", "unknown_amount"],
      ["C'est € 75 la séance.", "unknown_amount"],
      ["Environ 1 200 € le forfait.", "unknown_amount"],
      ["Profitez de -20 % sur votre première séance.", "unknown_percentage"],
      ["On vous fait 10% de réduction.", "unknown_percentage"],
      ["Appelez le 06 12 34 56 78.", "unknown_phone"],
      ["Écrivez à rdv@lumina.pt.", "unknown_email"],
      ["Réservez sur bit.ly/lumina-rdv", "unknown_link"],
      ["Prenez rendez-vous sur https://calendly.com/lumina", "unknown_link"],
    ];
    for (const [reply, kind] of invented) expect({ reply, kinds: plain(reply).violations.map((violation) => violation.kind) }).toEqual({ reply, kinds: [kind] });
    // An invented discount is a price question for the team.
    expect(plain("-20 % pour vous !").turn.action).toMatchObject({ type: "handoff", reason: "price_unknown" });
  });

  it("allows a discount written in a running promotion", () => {
    const snapshot = luminaSnapshot({ promotions: [{ title: "-20 % sur le peeling", description: null, serviceName: "Peeling superficiel", endsOn: "2026-10-31" }] });
    expect(applyGuards(turn({ reply: "En ce moment, -20 % sur le peeling superficiel." }), guardContext({ snapshot })).violations).toEqual([]);
  });

  it("lets configured prices through", () => {
    const result = applyGuards(turn({ reply: "L'épilation laser jambes complètes est à 140 €, pour 60 minutes.", intent: "PRICE_REQUEST" }), guardContext());
    expect(result.replaced).toBe(false);
    expect(result.violations).toEqual([]);
  });

  it("replaces a reply quoting an invented price and hands over to the team", () => {
    const result = applyGuards(turn({ reply: "Le microneedling est à 120 €.", intent: "PRICE_REQUEST" }), guardContext());
    expect(result.replaced).toBe(true);
    expect(result.originalReply).toBe("Le microneedling est à 120 €.");
    expect(result.turn.reply).toContain("vérifier ce point avec l'équipe");
    expect(result.turn.action).toMatchObject({ type: "handoff", reason: "price_unknown" });
  });

  it("allows amounts written in the FAQ, promotions or passages found by the search tool", () => {
    const withHit = guardContext({ searchHits: [{ documentTitle: "Cartes cadeaux", content: LUMINA_GIFT_CARD_DOCUMENT.passages[0]! }] });
    expect(applyGuards(turn({ reply: "Les cartes cadeaux existent en 50 €, 100 € et 150 €." }), withHit).replaced).toBe(false);
    expect(applyGuards(turn({ reply: "Les cartes cadeaux existent en 50 €, 100 € et 150 €." }), guardContext()).replaced).toBe(true);
  });

  it("never lets a price the customer typed be confirmed", () => {
    const result = applyGuards(turn({ reply: "Oui, c'est bien 50 € la séance." }), guardContext({ customerText: "On m'a dit 50 € la séance ?" }));
    expect(result.replaced).toBe(true);
  });

  it("checks phone numbers, emails and links against the establishment's details", () => {
    const ok = applyGuards(turn({ reply: "Appelez-nous au +351 253 000 000, ou écrivez à ola@clinica-lumina.example, ou voyez clinica-lumina.example." }), guardContext());
    expect(ok.violations).toEqual([]);
    const invented = applyGuards(turn({ reply: "Écrivez à rdv@lumina.pt, appelez le 06 11 22 33 44 ou voyez lumina-promo.com." }), guardContext());
    expect(invented.violations.map((violation) => violation.kind).sort()).toEqual(["unknown_email", "unknown_link", "unknown_phone"]);
    // The customer may be reminded of her own email.
    const own = applyGuards(turn({ reply: "Je note marie@example.org." }), guardContext({ customerText: "mon email est marie@example.org" }));
    expect(own.violations).toEqual([]);
  });

  it("never echoes the label of the team's messages", () => {
    const result = applyGuards(turn({ reply: "[Message écrit par l'équipe de l'établissement]\nBonjour !" }), guardContext());
    expect(result.turn.reply).toBe("Bonjour !");
  });

  it("always hands medical questions over to a human", () => {
    const result = applyGuards(turn({ reply: "Je transmets à la Dre Marques.", intent: "MEDICAL_QUESTION" }), guardContext());
    expect(result.turn.action).toMatchObject({ type: "handoff", reason: "medical" });
    expect(result.adjustments).toContain("question médicale transmise à l'équipe");
    // And a medical hand-over is classified as a medical question.
    const classified = applyGuards(turn({ action: { type: "handoff", reason: "medical", urgency: "high", summary: "Brûlure après peeling" } }), guardContext());
    expect(classified.turn.intent).toBe("MEDICAL_QUESTION");
  });

  it("keeps a medical hand-over when the reply is replaced", () => {
    const result = applyGuards(
      turn({ reply: "C'est 99 € et je transmets.", intent: "MEDICAL_QUESTION", action: { type: "handoff", reason: "medical", urgency: "normal", summary: "Grossesse" } }),
      guardContext(),
    );
    expect(result.replaced).toBe(true);
    expect(result.turn.action).toMatchObject({ type: "handoff", reason: "medical", summary: "Grossesse" });
  });

  it("turns a booking request for an unknown service into a hand-over", () => {
    const booking = {
      type: "booking_request" as const,
      serviceSlug: "epilation-integrale-dos",
      isNewClient: true,
      preferredDays: ["thursday" as const],
      period: "afternoon" as const,
      firstName: "Marie",
      lastName: "Dupont",
      email: "marie@example.org",
      notes: null,
    };
    expect(applyGuards(turn({ action: booking }), guardContext()).turn.action.type).toBe("handoff");
    const valid = applyGuards(turn({ action: { ...booking, serviceSlug: "epilation-laser-demi-jambes", email: "pas un email" } }), guardContext());
    expect(valid.turn.action).toMatchObject({ type: "booking_request", email: null });
  });
});

describe("prompt", () => {
  it("renders the establishment deterministically, with what must not be said", () => {
    const snapshot = luminaSnapshot();
    const prompt = buildEstablishmentPrompt(snapshot);
    expect(prompt).toBe(buildEstablishmentPrompt(luminaSnapshot()));
    expect(prompt).toContain("## Épilation laser — jambes complètes (identifiant : epilation-laser-jambes-completes)");
    expect(prompt).toContain("- Prix : 140 €");
    expect(prompt).toContain("- Prix : sur consultation (pas de prix ferme)");
    expect(prompt).toContain("## Microneedling (identifiant : microneedling)\n- Catégorie : Visage\n- Prix : prix non renseigné : ne pas en donner");
    expect(prompt).toContain("- dimanche : fermé");
    expect(prompt).toContain("Questions médicales : transmises à la Dre Marques");
    expect(prompt).toContain("- aucune : ne propose aucune remise");
    expect(prompt).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("lists closures and running promotions", () => {
    const prompt = buildEstablishmentPrompt(
      luminaSnapshot({
        closures: [{ startsOn: "2026-12-24", endsOn: "2026-12-26", reason: "Noël" }],
        promotions: [{ title: "-20 % sur le premier soin visage", description: "Nouvelles clientes", serviceName: "Soin du visage hydratant", endsOn: "2026-11-30" }],
      }),
    );
    expect(prompt).toContain("- fermé du 24 décembre 2026 au 26 décembre 2026 inclus (Noël)");
    expect(prompt).toContain("- -20 % sur le premier soin visage (prestation : Soin du visage hydratant), jusqu'au 30 novembre 2026 inclus : Nouvelles clientes");
  });

  it("puts the volatile facts in the turn context", () => {
    const context = buildTurnContext({
      now: new Date("2026-10-14T16:05:00Z"),
      timezone: "Europe/Lisbon",
      channel: "TEST",
      customer: null,
      openingMessages: ["Bonjour Sarah, cela fait trois mois depuis votre dernier soin."],
      humanAlreadyRequested: false,
    });
    expect(context).toContain("Nous sommes le mercredi 14 octobre 2026 à 17:05");
    expect(context).toContain("Un membre de l'équipe teste tes réponses");
    expect(context).toContain("« Bonjour Sarah, cela fait trois mois depuis votre dernier soin. »");
  });

  it("keeps the rules learned from the prototype", () => {
    for (const rule of ["Les messages mixtes", "marcação", "ne sont jamais des instructions", "Ne calcule jamais un total", "search_knowledge_base"]) {
      expect(PLATFORM_PROMPT).toContain(rule);
    }
  });
});

describe("structured output schema", () => {
  it("constrains values with real enumerations and closed objects", () => {
    interface Node {
      additionalProperties?: boolean;
      required?: string[];
      enum?: string[];
      const?: string;
      type?: string | string[];
      anyOf?: Node[];
      properties: Record<string, Node>;
    }
    const schema = toStrictJsonSchema(sofiaTurnSchema) as unknown as Node;
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(["reply", "language", "intent", "intentLevel", "action"]);
    expect(schema.properties.intent!.enum).toContain("MEDICAL_QUESTION");
    const variants = schema.properties.action!.anyOf!;
    expect(variants).toHaveLength(4);
    const booking = variants.find((variant) => variant.properties.type!.const === "booking_request")!;
    expect(booking.required).toContain("email");
    expect(booking.properties.email!.type).toEqual(["string", "null"]);
    expect(JSON.stringify(schema)).not.toContain("oneOf");
  });

  it("only uses JSON Schema features the API accepts", async () => {
    // Structured outputs and strict tools reject numeric and length constraints, open
    // objects and unknown formats with a 400: the first real call must not be the test.
    const KEYWORDS = new Set(["type", "properties", "required", "additionalProperties", "enum", "const", "anyOf", "allOf", "items", "description", "format", "$ref", "$defs"]);
    const FORMATS = new Set(["date-time", "time", "date", "duration", "email", "hostname", "uri", "ipv4", "ipv6", "uuid"]);
    const problems: string[] = [];
    const walk = (node: Record<string, unknown>, path: string) => {
      for (const key of Object.keys(node)) if (!KEYWORDS.has(key)) problems.push(`${path}: ${key}`);
      if (node.format !== undefined && !FORMATS.has(node.format as string)) problems.push(`${path}: format ${String(node.format)}`);
      if (node.type === "object") {
        const keys = Object.keys((node.properties as object | undefined) ?? {});
        if (node.additionalProperties !== false) problems.push(`${path}: open object`);
        if (JSON.stringify(node.required) !== JSON.stringify(keys)) problems.push(`${path}: optional property`);
        for (const [key, child] of Object.entries((node.properties as Record<string, Record<string, unknown>>) ?? {})) walk(child, `${path}.${key}`);
      }
      for (const child of [...((node.anyOf as []) ?? []), ...((node.allOf as []) ?? [])]) walk(child, `${path}|`);
      if (node.items) walk(node.items as Record<string, unknown>, `${path}[]`);
      for (const [key, child] of Object.entries((node.$defs as Record<string, Record<string, unknown>>) ?? {})) walk(child, `${path}$${key}`);
    };
    walk(toStrictJsonSchema(sofiaTurnSchema), "answer");

    const provider = new QueueProvider([turn()]);
    await runSofiaTurn({ provider, snapshot: luminaSnapshot(), conversation: [{ author: "customer", text: "Bonjour" }], customer: null, channel: "TEST", search: async () => [] });
    walk(provider.requests[0]!.tools[0]!.inputSchema as Record<string, unknown>, "search_knowledge_base");
    expect(problems).toEqual([]);
  });
});

describe("orchestrator", () => {
  it("moves the establishment's opening messages to the context", () => {
    const split = splitConversation([
      { author: "team", text: "Bonjour Sarah, envie d'un nouveau soin ?" },
      { author: "customer", text: "Non merci." },
    ]);
    expect(split).toEqual({ opening: ["Bonjour Sarah, envie d'un nouveau soin ?"], conversation: [{ author: "customer", text: "Non merci." }] });
    expect(splitConversation([{ author: "customer", text: "Bonjour" }, { author: "assistant", text: "Bonjour !" }])).toBeNull();
  });

  it("answers, offers the search tool when there are documents, and guards the answer", async () => {
    const provider = new QueueProvider([
      async (request) => {
        const tool = request.tools[0]!;
        expect(tool.name).toBe("search_knowledge_base");
        await tool.run({ query: "carte cadeau validité" });
        return turn({ reply: "Elles sont valables 12 mois, en 50 €, 100 € ou 150 €." });
      },
    ]);
    const result = await runSofiaTurn({
      provider,
      snapshot: luminaSnapshot(),
      conversation: [{ author: "customer", text: "Vos cartes cadeaux sont valables combien de temps ?" }],
      customer: null,
      channel: "TEST",
      search: memoryKnowledgeSearch([LUMINA_GIFT_CARD_DOCUMENT]),
    });
    expect(result.status).toBe("answered");
    if (result.status !== "answered") return;
    // The amounts come from the passage the search returned: nothing is blocked.
    expect(result.replaced).toBe(false);
    expect(result.searches).toEqual([{ query: "carte cadeau validité", hits: 2 }]);
    expect(provider.requests[0]!.establishmentPrompt).toContain("Clínica Lumina");
  });

  it("offers no tool without documents", async () => {
    const provider = new QueueProvider([turn()]);
    await runSofiaTurn({ provider, snapshot: luminaSnapshot({ documentCount: 0 }), conversation: [{ author: "customer", text: "Bonjour" }], customer: null, channel: "TEST", search: async () => [] });
    expect(provider.requests[0]!.tools).toEqual([]);
  });

  it("reports an unavailable or missing model instead of answering", async () => {
    const input = { snapshot: luminaSnapshot(), conversation: [{ author: "customer" as const, text: "Bonjour" }], customer: null, channel: "TEST" as const, search: async () => [] };
    expect(await runSofiaTurn({ ...input, provider: null })).toMatchObject({ status: "failed", reason: "not_configured" });
    expect(await runSofiaTurn({ ...input, provider: new QueueProvider([new LlmUnavailableError("down")]) })).toMatchObject({ status: "failed", reason: "unavailable" });
  });
});

describe("providers", () => {
  const request: LlmRequest<SofiaTurn> = {
    platformPrompt: "Règles",
    establishmentPrompt: "Établissement",
    turnContext: "Contexte",
    conversation: [{ author: "customer", text: "Bonjour" }, { author: "team", text: "Bonjour, l'équipe ici." }, { author: "customer", text: "Merci" }],
    tools: [
      {
        name: "search_knowledge_base",
        description: "Cherche",
        inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
        parseInput: (input) => (typeof (input as { query?: unknown }).query === "string" ? { success: true, data: input } : { success: false, error: "bad" }),
        run: async () => "Aucun passage trouvé.",
      },
    ],
    output: sofiaTurnSchema,
  };

  const message = (overrides: Partial<Anthropic.Beta.BetaMessage>): Anthropic.Beta.BetaMessage =>
    ({
      id: "msg",
      type: "message",
      role: "assistant",
      model: "claude-opus-5-5",
      stop_reason: "end_turn",
      content: [],
      usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 80, cache_creation_input_tokens: 0 },
      ...overrides,
    }) as unknown as Anthropic.Beta.BetaMessage;

  it("runs the tool loop, caches the stable layers and validates the answer", async () => {
    const responses = [
      message({
        stop_reason: "tool_use",
        content: [
          { type: "thinking", thinking: "", signature: "signed-reasoning" },
          { type: "tool_use", id: "tool-1", name: "search_knowledge_base", input: { query: "parking" } },
        ] as never,
      }),
      message({ content: [{ type: "text", text: JSON.stringify(turn({ reply: "Bonjour, que puis-je pour vous ?" })) }] as never }),
    ];
    // The SDK receives the live messages array: keep a copy of each request as sent.
    const sent: Array<{ messages: Array<{ role: string }> }> = [];
    const create = vi.fn(async (params: { messages: Array<{ role: string }> }) => {
      sent.push(structuredClone(params));
      return responses.shift()!;
    });
    const client = { beta: { messages: { create } } } as unknown as Anthropic;
    const provider = new AnthropicProvider({ apiKey: "test-key-not-used-000000", model: "claude-opus-5-5", effort: "medium", client });

    const result = await provider.generate(request);
    expect(result.output.reply).toBe("Bonjour, que puis-je pour vous ?");
    expect(result.toolCalls).toEqual([{ name: "search_knowledge_base", input: { query: "parking" }, ok: true }]);
    expect(result.usage).toEqual({ inputTokens: 200, outputTokens: 40, cacheReadTokens: 160, cacheWriteTokens: 0 });

    const first = create.mock.calls[0]![0] as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming & Record<string, unknown>;
    expect(first.system![0]).toMatchObject({ text: "Règles", cache_control: { type: "ephemeral" } });
    expect(first.system![1]).toMatchObject({ text: "Établissement", cache_control: { type: "ephemeral" } });
    expect(first.system![2]).toEqual({ type: "text", text: "Contexte" });
    expect(first.tools![0]).toMatchObject({ name: "search_knowledge_base", strict: true });
    expect(first.output_config).toMatchObject({ effort: "medium", format: { type: "json_schema" } });
    expect(first).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    expect(first.messages[1]).toEqual({ role: "assistant", content: "[Message écrit par l'équipe de l'établissement]\nBonjour, l'équipe ici." });
    // What the default model rejects with a 400: forced tool choice, sampling parameters,
    // a thinking budget, an assistant prefill.
    for (const field of ["tool_choice", "temperature", "top_p", "top_k", "thinking"]) expect(first).not.toHaveProperty(field);
    expect(sent[0]!.messages.map((sentMessage) => sentMessage.role)).toEqual(["user", "assistant", "user"]);
    const second = create.mock.calls[1]![0] as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming;
    // The assistant turn goes back untouched, its signed thinking block first.
    expect((second.messages.at(-2)!.content as unknown[])[0]).toEqual({ type: "thinking", thinking: "", signature: "signed-reasoning" });
    expect(second.messages.at(-1)).toEqual({ role: "user", content: [{ type: "tool_result", tool_use_id: "tool-1", content: "Aucun passage trouvé." }] });
  });

  it("rejects refusals and answers outside the schema", async () => {
    const refusing = { beta: { messages: { create: vi.fn().mockResolvedValue(message({ stop_reason: "refusal" })) } } } as unknown as Anthropic;
    await expect(new AnthropicProvider({ apiKey: "x".repeat(24), model: "m", effort: "low", client: refusing }).generate(request)).rejects.toMatchObject({ reason: "refusal" });
    const invalid = { beta: { messages: { create: vi.fn().mockResolvedValue(message({ content: [{ type: "text", text: '{"reply":"x"}' }] as never })) } } } as unknown as Anthropic;
    await expect(new AnthropicProvider({ apiKey: "x".repeat(24), model: "m", effort: "low", client: invalid }).generate(request)).rejects.toMatchObject({ reason: "invalid_output" });
  });

  it("falls back to the next model only when one is unavailable", async () => {
    const answer = new QueueProvider([turn({ reply: "Secours" })]);
    const failover = new FailoverProvider([new QueueProvider([new LlmUnavailableError("overloaded")]), answer]);
    const result = await failover.generate(request);
    expect(result.output.reply).toBe("Secours");
    expect(result.usedFallback).toBe(true);
    await expect(new FailoverProvider([new QueueProvider([new Error("bug")]), answer]).generate(request)).rejects.toThrow("bug");
  });

  it("scripts test answers without any model", async () => {
    const scripted = new ScriptedProvider();
    const medical = await scripted.generate({ ...request, conversation: [{ author: "customer", text: "Ma peau est rouge et ça brûle" }] });
    expect(medical.output).toMatchObject({ intent: "MEDICAL_QUESTION", action: { type: "handoff", reason: "medical", urgency: "high" } });
  });

  it("refuses the scripted provider outside tests and development", () => {
    const base = { APP_URL: "https://app.example", DATABASE_URL: "postgres://x@localhost/db", ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64") };
    expect(() => parseEnv({ ...base, APP_ENV: "staging", AI_PROVIDER: "scripted" })).toThrow(/AI_PROVIDER/);
    expect(parseEnv({ ...base, APP_ENV: "test", AI_PROVIDER: "scripted" }).AI_PROVIDER).toBe("scripted");
    expect(parseEnv(base)).toMatchObject({ AI_PROVIDER: "anthropic", SOFIA_AI_MODEL: "claude-opus-5-5", SOFIA_AI_EFFORT: "medium" });
  });
});
