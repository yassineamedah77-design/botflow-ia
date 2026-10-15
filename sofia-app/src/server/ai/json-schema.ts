import { z } from "zod";

/*
 * Zod → JSON Schema for structured outputs and strict tools. The API
 * constrains generation to this schema, enumerations included, so the model
 * cannot answer an intent or a reason outside the list. Only the subset the
 * API accepts is produced: objects closed with `additionalProperties: false`,
 * every property required (optional values are expressed as nullable),
 * `anyOf` for unions.
 */

type JsonSchema = Record<string, unknown>;

const DROPPED_KEYS = new Set(["$schema", "minLength", "maxLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "pattern", "default"]);

function normalize(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(normalize);
  if (!schema || typeof schema !== "object") return schema;
  const result: JsonSchema = {};
  for (const [key, value] of Object.entries(schema as JsonSchema)) {
    if (DROPPED_KEYS.has(key)) continue;
    // Discriminated unions come out as oneOf; the API reads anyOf.
    result[key === "oneOf" ? "anyOf" : key] = normalize(value);
  }
  if (result.type === "object") {
    result.additionalProperties = false;
    result.required = Object.keys((result.properties as JsonSchema | undefined) ?? {});
  }
  return result;
}

export function toStrictJsonSchema(schema: z.ZodType): JsonSchema {
  return normalize(z.toJSONSchema(schema, { target: "draft-2020-12", unrepresentable: "throw" })) as JsonSchema;
}
