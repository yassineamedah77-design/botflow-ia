import "server-only";

import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/lib/forms/action-state";

import { isAppError } from "./errors";
import { logger } from "./observability/logger";

const SECRET_FIELDS = /password|token/i;

/** Copies the submitted text fields back to the form, except secrets. */
export function echoValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$") && !SECRET_FIELDS.test(key)) {
      values[key] = value.slice(0, 500);
    }
  }
  return values;
}

export function formObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) result[key] = value;
  }
  return result;
}

export function validationFailure(error: z.ZodError, formData: FormData): ActionState {
  return {
    status: "error",
    message: "Vérifiez les champs indiqués.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
    values: echoValues(formData),
  };
}

/**
 * Converts an error thrown by a server action into form state. Next.js
 * control flow (redirect, notFound) is rethrown untouched. Expected errors
 * (AppError) show their message; anything else is logged with its stack and
 * shown as a generic message.
 */
export function actionFailure(error: unknown, formData?: FormData): ActionState {
  unstable_rethrow(error);
  const values = formData ? echoValues(formData) : undefined;
  if (isAppError(error)) {
    return { status: "error", message: error.message, fieldErrors: error.fieldErrors, values };
  }
  logger.error("Unexpected server action error", { err: error });
  return {
    status: "error",
    message: "Une erreur inattendue est survenue. Réessayez dans un instant ; si elle persiste, contactez le support.",
    values,
  };
}
