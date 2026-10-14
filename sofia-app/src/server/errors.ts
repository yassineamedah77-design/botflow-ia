import "server-only";

/**
 * Expected failures carry a message written for the end user (French). Any
 * other error is unexpected: it is logged with its stack and the user sees a
 * generic message.
 */

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INVALID_CREDENTIALS"
  | "INVALID_TOKEN"
  | "UNAVAILABLE";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(code: AppErrorCode, message: string, options: { fieldErrors?: Record<string, string[]>; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = options.fieldErrors;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** PostgreSQL unique_violation, optionally on a specific constraint. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  let current: unknown = error;
  // Drizzle wraps driver errors; walk the cause chain.
  for (let depth = 0; current && depth < 5; depth++) {
    const candidate = current as { code?: string; constraint?: string; cause?: unknown };
    if (candidate.code === "23505") {
      return constraint ? candidate.constraint === constraint : true;
    }
    current = candidate.cause;
  }
  return false;
}
