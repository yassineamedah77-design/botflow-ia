"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/forms/action-state";
import { whatsappConnectionSchema } from "@/lib/validation/whatsapp";
import { widgetSettingsSchema } from "@/lib/validation/widget";
import { actionFailure, validationFailure } from "@/server/actions";
import { getActionTenant } from "@/server/auth/dal";
import { getRequestMeta } from "@/server/security/request";
import { saveWidgetSettings } from "@/server/services/widget-settings";
import { connectWhatsapp, disconnectWhatsapp } from "@/server/whatsapp/connection";

export async function saveWidgetSettingsAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : undefined;
  };
  const parsed = widgetSettingsSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    allowedDomains: (text("allowedDomains") ?? "").split(/[\n,;]+/),
    accentColor: text("accentColor"),
    position: text("position"),
    greeting: text("greeting"),
    whatsappButton: formData.get("whatsappButton") === "on",
    privacyUrl: text("privacyUrl"),
  });
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    await saveWidgetSettings(await getActionTenant(), parsed.data, await getRequestMeta());
  } catch (error) {
    return actionFailure(error, formData);
  }
  revalidatePath("/channels", "layout");
  revalidatePath("/onboarding", "layout");
  return { status: "success", message: "Réglages du widget enregistrés." };
}

export async function connectWhatsappAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = whatsappConnectionSchema.safeParse({
    phoneNumberId: formData.get("phoneNumberId"),
    businessAccountId: formData.get("businessAccountId"),
    accessToken: formData.get("accessToken"),
  });
  if (!parsed.success) return validationFailure(parsed.error, formData);
  let connected;
  try {
    connected = await connectWhatsapp(await getActionTenant(), parsed.data, await getRequestMeta());
  } catch (error) {
    return actionFailure(error, formData);
  }
  revalidatePath("/channels", "layout");
  revalidatePath("/onboarding", "layout");
  revalidatePath("/inbox");
  return { status: "success", message: `WhatsApp connecté : ${connected.displayName}.` };
}

export async function disconnectWhatsappAction(_previous: ActionState, _formData: FormData): Promise<ActionState> {
  try {
    await disconnectWhatsapp(await getActionTenant(), await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidatePath("/channels", "layout");
  revalidatePath("/inbox");
  return { status: "success", message: "WhatsApp déconnecté : SOFIA n'envoie plus rien sur ce numéro." };
}
