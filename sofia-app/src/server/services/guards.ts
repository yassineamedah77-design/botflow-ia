import "server-only";

import { AppError } from "@/server/errors";

/** Throws FORBIDDEN unless the permission check passed (checked server-side on every action). */
export function requirePermission(allowed: boolean, message = "Vous n'avez pas les droits pour cette action.") {
  if (!allowed) throw new AppError("FORBIDDEN", message);
}
