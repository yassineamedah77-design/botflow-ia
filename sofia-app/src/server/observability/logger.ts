import "server-only";

/**
 * Structured logger.
 *
 * One JSON object per line on stdout/stderr, which every log collector
 * (Vercel, Docker, Datadog, Loki) ingests as-is. Values under sensitive keys
 * are replaced before anything is written, so a careless `logger.info(..., {
 * password })` cannot leak a secret.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE_KEY_PARTS = ["password", "secret", "token", "authorization", "cookie", "apikey", "api_key", "credential"];
const MAX_DEPTH = 6;

export const REDACTED = "[REDACTED]";

function isSensitiveKey(key: string) {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => lower.includes(part));
}

export function serializeError(error: unknown, includeStack = process.env.NODE_ENV !== "production"): LogFields {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }
  const serialized: LogFields = { name: error.name, message: error.message };
  const code = (error as { code?: unknown }).code;
  if (code !== undefined) serialized.code = code;
  if (includeStack && error.stack) serialized.stack = error.stack;
  if (error.cause !== undefined) serialized.cause = serializeError(error.cause, includeStack);
  return serialized;
}

export function redact(value: unknown, depth = 0): unknown {
  if (value instanceof Error) return serializeError(value);
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return "[Truncated]";
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  const output: LogFields = {};
  for (const [key, inner] of Object.entries(value)) {
    output[key] = isSensitiveKey(key) ? REDACTED : redact(inner, depth + 1);
  }
  return output;
}

function minimumLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL;
  if (configured === "debug" || configured === "info" || configured === "warn" || configured === "error") {
    return configured;
  }
  return process.env.NODE_ENV === "test" ? "warn" : "info";
}

function write(level: LogLevel, message: string, bindings: LogFields, fields?: LogFields) {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[minimumLevel()]) return;
  const record = {
    time: new Date().toISOString(),
    level,
    msg: message,
    ...(redact(bindings) as LogFields),
    ...(fields ? (redact(fields) as LogFields) : {}),
  };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function createLogger(bindings: LogFields): Logger {
  return {
    debug: (message, fields) => write("debug", message, bindings, fields),
    info: (message, fields) => write("info", message, bindings, fields),
    warn: (message, fields) => write("warn", message, bindings, fields),
    error: (message, fields) => write("error", message, bindings, fields),
    child: (childBindings) => createLogger({ ...bindings, ...childBindings }),
  };
}

export const logger = createLogger({ service: "sofia" });
