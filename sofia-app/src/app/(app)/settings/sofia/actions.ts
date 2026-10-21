"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/forms/action-state";
import { actionFailure } from "@/server/actions";
import { getActionTenant } from "@/server/auth/dal";
import { getRequestMeta } from "@/server/security/request";
import { setSofiaStatus } from "@/server/services/sofia";

const MESSAGES = {
  ACTIVE: "SOFIA est activée : elle répond à vos clientes sur vos canaux connectés.",
  PAUSED: "SOFIA est en pause : votre équipe répond seule jusqu'à sa reprise.",
} as const;

export async function setSofiaStatusAction(target: "ACTIVE" | "PAUSED"): Promise<ActionState> {
  if (target !== "ACTIVE" && target !== "PAUSED") return { status: "error", message: "Action inconnue." };
  try {
    await setSofiaStatus(await getActionTenant(), target, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  // The sidebar shows SOFIA's status on every page.
  revalidatePath("/", "layout");
  return { status: "success", message: MESSAGES[target] };
}
