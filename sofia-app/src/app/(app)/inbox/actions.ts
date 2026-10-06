"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/lib/forms/action-state";
import { actionFailure } from "@/server/actions";
import { getActionTenant } from "@/server/auth/dal";
import { getRequestMeta } from "@/server/security/request";
import { markConversationRead, releaseConversation, sendManualReply, takeOverConversation } from "@/server/services/inbox";

const uuid = z.uuid();
const replySchema = z.object({
  conversationId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, { error: "Le message est vide." })
    .max(4000, { error: "4 000 caractères maximum." }),
});

function revalidateInbox() {
  revalidatePath("/inbox");
  revalidatePath("/leads", "layout");
}

export async function takeOverConversationAction(conversationId: string): Promise<ActionState> {
  if (!uuid.safeParse(conversationId).success) return { status: "error", message: "Conversation introuvable." };
  try {
    const ctx = await getActionTenant();
    await takeOverConversation(ctx, conversationId, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidateInbox();
  return { status: "success", message: "Vous avez pris la conversation : SOFIA ne répond plus automatiquement." };
}

export async function releaseConversationAction(conversationId: string): Promise<ActionState> {
  if (!uuid.safeParse(conversationId).success) return { status: "error", message: "Conversation introuvable." };
  try {
    const ctx = await getActionTenant();
    await releaseConversation(ctx, conversationId, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidateInbox();
  return { status: "success", message: "Conversation rendue à SOFIA." };
}

export async function markConversationReadAction(conversationId: string): Promise<void> {
  if (!uuid.safeParse(conversationId).success) return;
  try {
    const ctx = await getActionTenant();
    await markConversationRead(ctx, conversationId);
  } catch {
    // Reading state is cosmetic: never surface an error for it.
    return;
  }
  revalidatePath("/inbox");
}

export async function sendReplyAction(conversationId: string, body: string): Promise<ActionState> {
  const parsed = replySchema.safeParse({ conversationId, body });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Message invalide." };
  let simulated = false;
  try {
    const ctx = await getActionTenant();
    ({ simulated } = await sendManualReply(ctx, parsed.data, await getRequestMeta()));
  } catch (error) {
    return actionFailure(error);
  }
  revalidateInbox();
  return { status: "success", message: simulated ? "Réponse enregistrée (démonstration : rien n'est envoyé)." : "Réponse envoyée." };
}
