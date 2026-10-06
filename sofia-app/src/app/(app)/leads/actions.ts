"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/lib/forms/action-state";
import { leadAssignmentSchema, leadFormSchema, leadNoteSchema, leadStatusChangeSchema } from "@/lib/validation/leads";
import { actionFailure, formObject, validationFailure } from "@/server/actions";
import { getActionTenant } from "@/server/auth/dal";
import { getRequestMeta } from "@/server/security/request";
import {
  addLeadNote,
  assignLead,
  changeLeadStatus,
  createLead,
  deleteLead,
  deleteLeadNote,
  updateLead,
} from "@/server/services/leads";

const uuid = z.uuid();

function revalidateLead(leadId?: string) {
  revalidatePath("/leads");
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  if (leadId) revalidatePath(`/leads/${leadId}`);
}

export async function createLeadAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = leadFormSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  let leadId: string;
  try {
    const ctx = await getActionTenant();
    ({ id: leadId } = await createLead(ctx, parsed.data, await getRequestMeta()));
  } catch (error) {
    return actionFailure(error, formData);
  }
  revalidateLead();
  redirect(`/leads/${leadId}`);
}

export async function updateLeadAction(leadId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  if (!uuid.safeParse(leadId).success) return { status: "error", message: "Contact introuvable." };
  const parsed = leadFormSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    const ctx = await getActionTenant();
    await updateLead(ctx, leadId, parsed.data, await getRequestMeta());
  } catch (error) {
    return actionFailure(error, formData);
  }
  revalidateLead(leadId);
  return { status: "success", message: "Fiche mise à jour." };
}

/** Kanban drag and drop and the status menu. */
export async function changeLeadStatusAction(leadId: string, status: string, reason?: string): Promise<ActionState> {
  const parsed = leadStatusChangeSchema.safeParse({ leadId, status, reason: reason ?? "" });
  if (!parsed.success) return { status: "error", message: "Statut invalide." };
  try {
    const ctx = await getActionTenant();
    await changeLeadStatus(ctx, parsed.data, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidateLead(leadId);
  return { status: "success", message: "Statut mis à jour." };
}

export async function assignLeadAction(leadId: string, assignedToUserId: string): Promise<ActionState> {
  const parsed = leadAssignmentSchema.safeParse({ leadId, assignedToUserId });
  if (!parsed.success) return { status: "error", message: "Sélection invalide." };
  try {
    const ctx = await getActionTenant();
    await assignLead(ctx, parsed.data, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidateLead(leadId);
  return { status: "success", message: parsed.data.assignedToUserId ? "Contact assigné." : "Assignation retirée." };
}

export async function addLeadNoteAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = leadNoteSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    const ctx = await getActionTenant();
    await addLeadNote(ctx, parsed.data, await getRequestMeta());
  } catch (error) {
    return actionFailure(error, formData);
  }
  revalidateLead(parsed.data.leadId);
  return { status: "success", message: "Note ajoutée." };
}

export async function deleteLeadNoteAction(leadId: string, noteId: string): Promise<ActionState> {
  if (!uuid.safeParse(noteId).success || !uuid.safeParse(leadId).success) return { status: "error", message: "Note introuvable." };
  try {
    const ctx = await getActionTenant();
    await deleteLeadNote(ctx, noteId, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidateLead(leadId);
  return { status: "success", message: "Note supprimée." };
}

export async function deleteLeadAction(leadId: string): Promise<ActionState> {
  if (!uuid.safeParse(leadId).success) return { status: "error", message: "Contact introuvable." };
  try {
    const ctx = await getActionTenant();
    await deleteLead(ctx, leadId, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidateLead();
  redirect("/leads");
}
