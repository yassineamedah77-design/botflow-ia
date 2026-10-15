/**
 * Text handling for the knowledge base: what makes a document searchable by
 * SOFIA. Pure functions, shared by the knowledge base writes and by SOFIA's
 * search tool (and its tests).
 */

/** "Épilation LASER" → "epilation laser": search ignores case and accents. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Target size of a passage: long enough to carry context, short enough to stay on one topic. */
export const CHUNK_TARGET_LENGTH = 900;
const CHUNK_MAX_LENGTH = 1400;

function splitLongParagraph(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?…]+[.!?…]+["»”)]*\s*|[^.!?…]+$/g) ?? [paragraph];
  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > CHUNK_MAX_LENGTH) {
      parts.push(current.trim());
      current = "";
    }
    // A single sentence longer than the maximum is cut on spaces.
    if (sentence.length > CHUNK_MAX_LENGTH) {
      for (let start = 0; start < sentence.length; start += CHUNK_MAX_LENGTH) {
        parts.push(sentence.slice(start, start + CHUNK_MAX_LENGTH).trim());
      }
      continue;
    }
    current += sentence;
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

/**
 * Splits a document into passages on paragraph boundaries, grouping short
 * paragraphs and cutting long ones on sentence boundaries. The original text
 * is kept as written: SOFIA quotes passages, never a normalized copy.
 */
export function chunkDocument(content: string): string[] {
  const paragraphs = content
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap((paragraph) => (paragraph.length > CHUNK_MAX_LENGTH ? splitLongParagraph(paragraph) : [paragraph]));

  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > CHUNK_TARGET_LENGTH) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Words that carry no meaning for a search, in the three languages SOFIA speaks. */
const STOP_WORDS = new Set(
  [
    // fr
    "les des une est que qui pour pas sur avec dans par plus sont aux ces mes mon vous nous elle elles ils leur leurs etre avoir fait faire peut "
      + "comment combien quel quelle quels quelles quoi votre vos notre nos cette cet ses son sans tres aussi bien ete etais suis",
    // pt
    "uma uns umas que para com por nao sim mais como qual quais quanto quanta sao sua seu suas seus esta este isso essa esse nos voce "
      + "voces ele ela eles elas tem ter pelo pela pelos pelas dos das num numa",
    // en
    "the and for are you your with this that what which how much many can does have has was were from about will would there their them",
  ]
    .join(" ")
    .split(/\s+/),
);

/**
 * Turns a customer's question into PostgreSQL `to_tsquery('simple', …)`
 * input: meaningful words joined with OR, so a passage matching some of them
 * still ranks. Only `[a-z0-9]` survives, so the query can never carry
 * tsquery syntax. Returns null when nothing searchable is left.
 */
export function buildSearchQuery(question: string, maxTerms = 12): string | null {
  const terms = [
    ...new Set(
      normalizeForSearch(question)
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)),
    ),
  ].slice(0, maxTerms);
  if (terms.length === 0) return null;
  // Prefix match: "epil" finds "epilation", "laser" finds "lasers".
  return terms.map((term) => `${term}:*`).join(" | ");
}
