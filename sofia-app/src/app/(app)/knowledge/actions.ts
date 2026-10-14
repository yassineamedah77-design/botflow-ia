"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/lib/forms/action-state";
import { closureSchema, documentSchema, faqSchema, practitionerSchema, promotionSchema } from "@/lib/validation/knowledge";
import { actionFailure, formObject, validationFailure } from "@/server/actions";
import { getActionTenant } from "@/server/auth/dal";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/observability/logger";
import { getRequestMeta } from "@/server/security/request";
import {
  archivePractitioner,
  createClosure,
  createDocument,
  createFaq,
  createPractitioner,
  createPromotion,
  deleteClosure,
  deleteDocument,
  deleteFaq,
  deletePromotion,
  updateDocument,
  updateFaq,
  updatePractitioner,
  updatePromotion,
} from "@/server/services/knowledge-entries";
import { consoleTranscriptSchema, testSofia, type ConsoleAnswer } from "@/server/services/sofia-console";

const uuid = z.uuid();

/** Everything under /knowledge shows what SOFIA knows: refresh it all, and the checklist. */
function revalidateKnowledge() {
  revalidatePath("/knowledge", "layout");
  revalidatePath("/onboarding", "layout");
}

const UNKNOWN: ActionState = { status: "error", message: "Élément introuvable. Rechargez la page." };

/** Shared shape of the create and update actions: validate, write, refresh. */
async function save<T>(
  schema: z.ZodType<T>,
  formData: FormData,
  write: (input: T) => Promise<unknown>,
  success: (input: T) => string,
  extra: Record<string, unknown> = {},
): Promise<ActionState> {
  const parsed = schema.safeParse({ ...formObject(formData), ...extra });
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    await write(parsed.data);
  } catch (error) {
    return actionFailure(error, formData);
  }
  revalidateKnowledge();
  return { status: "success", message: success(parsed.data) };
}

async function remove(id: string, run: (id: string) => Promise<unknown>, message: string): Promise<ActionState> {
  if (!uuid.safeParse(id).success) return UNKNOWN;
  try {
    await run(id);
  } catch (error) {
    return actionFailure(error);
  }
  revalidateKnowledge();
  return { status: "success", message };
}

// ─── Questions and answers ──────────────────────────────────────────────────

export async function createFaqAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return save(faqSchema, formData, async (input) => createFaq(await getActionTenant(), input, await getRequestMeta()), () => "Question ajoutée.");
}

export async function updateFaqAction(faqId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!uuid.safeParse(faqId).success) return UNKNOWN;
  return save(faqSchema, formData, async (input) => updateFaq(await getActionTenant(), faqId, input, await getRequestMeta()), () => "Question mise à jour.");
}

export async function deleteFaqAction(faqId: string): Promise<ActionState> {
  return remove(faqId, async (id) => deleteFaq(await getActionTenant(), id, await getRequestMeta()), "Question supprimée : SOFIA ne s'en sert plus.");
}

// ─── Promotions ─────────────────────────────────────────────────────────────

export async function createPromotionAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return save(
    promotionSchema,
    formData,
    async (input) => createPromotion(await getActionTenant(), input, await getRequestMeta()),
    (input) => `« ${input.title} » ajoutée.`,
  );
}

export async function updatePromotionAction(promotionId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!uuid.safeParse(promotionId).success) return UNKNOWN;
  return save(
    promotionSchema,
    formData,
    async (input) => updatePromotion(await getActionTenant(), promotionId, input, await getRequestMeta()),
    (input) => `« ${input.title} » mise à jour.`,
  );
}

export async function deletePromotionAction(promotionId: string): Promise<ActionState> {
  return remove(promotionId, async (id) => deletePromotion(await getActionTenant(), id, await getRequestMeta()), "Promotion supprimée.");
}

// ─── Practitioners ──────────────────────────────────────────────────────────

export async function createPractitionerAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return save(
    practitionerSchema,
    formData,
    async (input) => createPractitioner(await getActionTenant(), input, await getRequestMeta()),
    (input) => `Fiche de ${input.name} ajoutée.`,
    { serviceIds: formData.getAll("serviceIds") },
  );
}

export async function updatePractitionerAction(practitionerId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!uuid.safeParse(practitionerId).success) return UNKNOWN;
  return save(
    practitionerSchema,
    formData,
    async (input) => updatePractitioner(await getActionTenant(), practitionerId, input, await getRequestMeta()),
    (input) => `Fiche de ${input.name} mise à jour.`,
    { serviceIds: formData.getAll("serviceIds") },
  );
}

export async function archivePractitionerAction(practitionerId: string): Promise<ActionState> {
  if (!uuid.safeParse(practitionerId).success) return UNKNOWN;
  let name: string;
  try {
    name = await archivePractitioner(await getActionTenant(), practitionerId, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidateKnowledge();
  return { status: "success", message: `Fiche de ${name} retirée : SOFIA ne mentionne plus cette personne.` };
}

// ─── Exceptional closures ───────────────────────────────────────────────────

export async function createClosureAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return save(
    closureSchema,
    formData,
    async (input) => createClosure(await getActionTenant(), input, await getRequestMeta()),
    () => "Fermeture ajoutée : SOFIA l'annoncera aux clientes.",
  );
}

export async function deleteClosureAction(closureId: string): Promise<ActionState> {
  return remove(closureId, async (id) => deleteClosure(await getActionTenant(), id, await getRequestMeta()), "Fermeture supprimée.");
}

// ─── Documents ──────────────────────────────────────────────────────────────

export async function createDocumentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return save(
    documentSchema,
    formData,
    async (input) => createDocument(await getActionTenant(), input, await getRequestMeta()),
    (input) => `« ${input.title} » ajouté : SOFIA peut y chercher ses réponses.`,
  );
}

export async function updateDocumentAction(documentId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!uuid.safeParse(documentId).success) return UNKNOWN;
  return save(
    documentSchema,
    formData,
    async (input) => updateDocument(await getActionTenant(), documentId, input, await getRequestMeta()),
    (input) => `« ${input.title} » mis à jour.`,
  );
}

export async function deleteDocumentAction(documentId: string): Promise<ActionState> {
  return remove(documentId, async (id) => deleteDocument(await getActionTenant(), id, await getRequestMeta()), "Document supprimé.");
}

// ─── Tester SOFIA ───────────────────────────────────────────────────────────

export type ConsoleActionResult = ConsoleAnswer | { status: "error"; message: string };

/** One answer from SOFIA in the test console: nothing is sent, nothing is executed. */
export async function testSofiaAction(transcript: unknown): Promise<ConsoleActionResult> {
  const parsed = consoleTranscriptSchema.safeParse(transcript);
  if (!parsed.success) return { status: "error", message: "Message vide ou trop long (2 000 caractères maximum, 40 messages par conversation)." };
  try {
    return await testSofia(await getActionTenant(), parsed.data);
  } catch (error) {
    unstable_rethrow(error);
    if (isAppError(error)) return { status: "error", message: error.message };
    logger.error("SOFIA test console failed", { err: error });
    return { status: "error", message: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}
