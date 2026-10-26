"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/forms/action-state";
import { preparedDemoFromForm, preparedDemoSchema } from "@/lib/validation/demo";
import { actionFailure, echoValues, formObject } from "@/server/actions";
import { setSessionCookie } from "@/server/auth/cookies";
import { isDemoAdmin, signInDemoAdmin } from "@/server/demo/admin";
import { createPreparedDemo, deletePreparedDemo, openPreparedDemo, resetClinicaLumina } from "@/server/demo/prepared";
import { getRequestMeta } from "@/server/security/request";

async function requireDemoAdmin() {
  if (!(await isDemoAdmin())) redirect("/demo/cliniques");
}

export async function signInDemoAdminAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await signInDemoAdmin(String(formData.get("key") ?? ""), await getRequestMeta());
  if (result === "rate_limited") return { status: "error", message: "Trop d'essais. Réessayez dans une heure." };
  if (result === "invalid") return { status: "error", message: "Clé incorrecte." };
  redirect("/demo/cliniques");
}

/** Field names as the form knows them: services.2.name → service2Name. */
function fieldName(path: PropertyKey[]): string {
  if (path[0] === "services" && typeof path[1] === "number" && typeof path[2] === "string") {
    return `service${path[1]}${path[2][0]!.toUpperCase()}${path[2].slice(1)}`;
  }
  return String(path[0] ?? "form");
}

export async function createPreparedDemoAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireDemoAdmin();
  const parsed = preparedDemoSchema.safeParse(preparedDemoFromForm(formObject(formData)));
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (fieldErrors[fieldName(issue.path)] ??= []).push(issue.message);
    return { status: "error", message: fieldErrors.services?.[0] ?? "Vérifiez les champs indiqués.", fieldErrors, values: echoValues(formData) };
  }
  try {
    const demo = await createPreparedDemo(parsed.data);
    revalidatePath("/demo/cliniques");
    return { status: "success", message: `${parsed.data.name} est prête : /d/${demo.slug}` };
  } catch (error) {
    return actionFailure(error, formData);
  }
}

export async function deletePreparedDemoAction(formData: FormData) {
  await requireDemoAdmin();
  await deletePreparedDemo(String(formData.get("organizationId") ?? ""));
  revalidatePath("/demo/cliniques");
}

export async function resetClinicaLuminaAction() {
  await requireDemoAdmin();
  await resetClinicaLumina();
  revalidatePath("/demo/cliniques");
}

/** Opens the clinic's dashboard (its inbox) as its manager. */
export async function openPreparedDemoAction(formData: FormData) {
  await requireDemoAdmin();
  const session = await openPreparedDemo(String(formData.get("organizationId") ?? ""), await getRequestMeta());
  if (!session) redirect("/demo/cliniques");
  await setSessionCookie(session.token, session.expiresAt);
  redirect("/inbox?channel=WEBSITE");
}
