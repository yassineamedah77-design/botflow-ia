"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/lib/forms/action-state";
import { businessHoursSchema, establishmentSchema, serviceSchema } from "@/lib/validation/knowledge";
import { actionFailure, formObject, validationFailure } from "@/server/actions";
import { getActionTenant } from "@/server/auth/dal";
import { getRequestMeta } from "@/server/security/request";
import { archiveService, createService, saveEstablishmentProfile, saveOpeningHours, updateService } from "@/server/services/setup";

const uuid = z.uuid();

/** What SOFIA knows shows on these pages: refresh them all. */
function revalidateKnowledge() {
  revalidatePath("/onboarding", "layout");
  revalidatePath("/knowledge");
  revalidatePath("/dashboard");
}

export async function saveEstablishmentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = establishmentSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    const ctx = await getActionTenant();
    await saveEstablishmentProfile(ctx, parsed.data, await getRequestMeta());
  } catch (error) {
    return actionFailure(error, formData);
  }
  revalidateKnowledge();
  if (formData.get("then") === "next") redirect("/onboarding/services");
  return { status: "success", message: "Établissement enregistré." };
}

export async function createServiceAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = serviceSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    const ctx = await getActionTenant();
    await createService(ctx, parsed.data, await getRequestMeta());
  } catch (error) {
    return actionFailure(error, formData);
  }
  revalidateKnowledge();
  return { status: "success", message: `« ${parsed.data.name} » ajoutée.` };
}

export async function updateServiceAction(serviceId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!uuid.safeParse(serviceId).success) return { status: "error", message: "Prestation introuvable." };
  const parsed = serviceSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    const ctx = await getActionTenant();
    await updateService(ctx, serviceId, parsed.data, await getRequestMeta());
  } catch (error) {
    return actionFailure(error, formData);
  }
  revalidateKnowledge();
  return { status: "success", message: `« ${parsed.data.name} » mise à jour.` };
}

export async function archiveServiceAction(serviceId: string): Promise<ActionState> {
  if (!uuid.safeParse(serviceId).success) return { status: "error", message: "Prestation introuvable." };
  let name: string;
  try {
    const ctx = await getActionTenant();
    name = await archiveService(ctx, serviceId, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidateKnowledge();
  return { status: "success", message: `« ${name} » retirée : SOFIA ne la propose plus.` };
}

export async function saveHoursAction(ranges: unknown): Promise<ActionState> {
  const parsed = businessHoursSchema.safeParse(ranges);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Horaires invalides." };
  try {
    const ctx = await getActionTenant();
    await saveOpeningHours(ctx, parsed.data, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidateKnowledge();
  return { status: "success", message: parsed.data.length ? "Horaires enregistrés." : "Établissement indiqué comme fermé toute la semaine." };
}
