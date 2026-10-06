import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { IMPORT_FIELDS, IMPORT_MAX_BYTES, type ImportMapping } from "@/lib/client-file";
import { getActionTenant } from "@/server/auth/dal";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/observability/logger";
import { formatRetryAfter, consumeRateLimit } from "@/server/security/rate-limit";
import { getRequestMeta, isSameOriginRequest } from "@/server/security/request";
import { previewContactImport, runContactImport } from "@/server/services/contact-import";

/**
 * POST /api/leads/import — checks (mode=preview) or imports (mode=import) a
 * client file. A route handler rather than a Server Action: files up to 4 MB
 * without raising the 1 MB limit of every Server Action in the application.
 */

const FIELD_KEYS = new Set<string>(IMPORT_FIELDS.map((field) => field.key));

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function parseMapping(raw: FormDataEntryValue | null): ImportMapping | null {
  if (typeof raw !== "string" || raw.length > 5000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const mapping: ImportMapping = {};
    for (const [key, header] of Object.entries(value)) {
      if (!FIELD_KEYS.has(key) || typeof header !== "string" || header.length > 200) return null;
      if (header) mapping[key as keyof ImportMapping] = header;
    }
    return mapping;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return error("Requête refusée.", 403);
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > IMPORT_MAX_BYTES + 64 * 1024) return error("Le fichier dépasse 4 Mo. Découpez-le en plusieurs fichiers.", 413);

  try {
    const ctx = await getActionTenant();
    if (!ctx.can("leads:import")) return error("Seuls les propriétaires et administrateurs peuvent importer un fichier clients.", 403);
    const limit = await consumeRateLimit("contactImportsByOrganization", ctx.organization.id);
    if (!limit.allowed) return error(`Trop d'imports en peu de temps. Réessayez dans ${formatRetryAfter(limit.retryAfterSeconds)}.`, 429);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return error("Aucun fichier reçu.", 400);
    const mapping = parseMapping(form.get("mapping"));
    if (!mapping) return error("Correspondance des colonnes invalide.", 400);

    if (form.get("mode") === "import") {
      const result = await runContactImport(ctx, { file, mapping, declarationAccepted: form.get("declaration") === "accepted" }, await getRequestMeta());
      revalidatePath("/leads");
      revalidatePath("/reactivation");
      revalidatePath("/dashboard");
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(await previewContactImport(ctx, file, mapping), { headers: { "Cache-Control": "no-store" } });
  } catch (caught) {
    if (isAppError(caught)) {
      const status = caught.code === "UNAUTHENTICATED" ? 401 : caught.code === "FORBIDDEN" ? 403 : 400;
      return error(caught.message, status);
    }
    logger.error("Client file import failed", { err: caught });
    return error("L'import a échoué de façon inattendue. Aucune donnée n'a été modifiée. Réessayez ou contactez le support.", 500);
  }
}
