"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { isRole } from "@/lib/auth/roles";
import type { ActionState } from "@/lib/forms/action-state";
import { changePasswordSchema, inviteMemberSchema, updateProfileSchema } from "@/lib/validation/auth";
import { createOrganizationSchema, organizationSettingsSchema } from "@/lib/validation/organization";
import { actionFailure, formObject, validationFailure } from "@/server/actions";
import { getActionSession, getActionTenant } from "@/server/auth/dal";
import {
  changePassword,
  revokeOtherSessions,
  revokeSession,
  sendVerificationEmail,
  updateProfile,
} from "@/server/auth/service";
import { env } from "@/server/env";
import { AppError } from "@/server/errors";
import { getRequestMeta } from "@/server/security/request";
import {
  changeMemberRole,
  inviteMember,
  removeMember,
  resendInvitation,
  revokeInvitation,
} from "@/server/services/members";
import {
  createOrganizationForUser,
  switchActiveOrganization,
  updateOrganizationSettings,
} from "@/server/services/organizations";

const schedule = (task: () => Promise<unknown>) => after(task);
const uuid = z.uuid();

// ─── Establishment ──────────────────────────────────────────────────────────

export async function switchOrganizationAction(organizationId: string) {
  const session = await getActionSession();
  if (!uuid.safeParse(organizationId).success) return;
  await switchActiveOrganization(session, organizationId);
  redirect("/dashboard");
}

export async function createOrganizationAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createOrganizationSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    const session = await getActionSession();
    await createOrganizationForUser(session, parsed.data, await getRequestMeta(), {
      signupEnabled: env().SIGNUP_ENABLED,
    });
  } catch (error) {
    return actionFailure(error, formData);
  }
  redirect("/dashboard?welcome=1");
}

export async function updateOrganizationSettingsAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = organizationSettingsSchema.safeParse({
    ...formObject(formData),
    allowedLanguages: formData.getAll("allowedLanguages").filter((value) => typeof value === "string"),
  });
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    const ctx = await getActionTenant();
    await updateOrganizationSettings(ctx, parsed.data, await getRequestMeta());
  } catch (error) {
    return actionFailure(error, formData);
  }
  revalidatePath("/", "layout");
  return { status: "success", message: "Réglages enregistrés." };
}

// ─── Account ────────────────────────────────────────────────────────────────

export async function updateProfileAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = updateProfileSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    const session = await getActionSession();
    await updateProfile(session.userId, parsed.data);
  } catch (error) {
    return actionFailure(error, formData);
  }
  revalidatePath("/", "layout");
  return { status: "success", message: "Profil mis à jour." };
}

export async function changePasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = changePasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    const session = await getActionSession();
    await changePassword(
      {
        userId: session.userId,
        sessionId: session.id,
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      },
      await getRequestMeta(),
      { schedule },
    );
  } catch (error) {
    return actionFailure(error);
  }
  revalidatePath("/settings/account");
  return { status: "success", message: "Mot de passe modifié. Vos autres appareils ont été déconnectés." };
}

export async function resendVerificationEmailAction(): Promise<ActionState> {
  try {
    const session = await getActionSession();
    const result = await sendVerificationEmail(session.userId);
    if (!result.ok) {
      return { status: "error", message: "L'email n'a pas pu être envoyé. Réessayez dans quelques minutes." };
    }
    if (result.alreadyVerified) return { status: "success", message: "Votre adresse est déjà confirmée." };
  } catch (error) {
    return actionFailure(error);
  }
  return { status: "success", message: "Email de confirmation envoyé. Pensez à vérifier vos spams." };
}

export async function revokeSessionAction(sessionId: string): Promise<ActionState> {
  try {
    const session = await getActionSession();
    if (sessionId === session.id) {
      throw new AppError("VALIDATION", "Utilisez « Se déconnecter » pour fermer la session en cours.");
    }
    await revokeSession({ userId: session.userId, sessionId }, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidatePath("/settings/account");
  return { status: "success", message: "Session déconnectée." };
}

export async function revokeOtherSessionsAction(): Promise<ActionState> {
  try {
    const session = await getActionSession();
    await revokeOtherSessions({ userId: session.userId, currentSessionId: session.id }, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidatePath("/settings/account");
  return { status: "success", message: "Toutes vos autres sessions ont été déconnectées." };
}

// ─── Team ───────────────────────────────────────────────────────────────────

export async function inviteMemberAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = inviteMemberSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  let emailDelivered = true;
  try {
    const ctx = await getActionTenant();
    const result = await inviteMember(ctx, parsed.data, await getRequestMeta());
    emailDelivered = result.email.ok;
  } catch (error) {
    return actionFailure(error, formData);
  }
  revalidatePath("/team");
  if (!emailDelivered) {
    return {
      status: "error",
      message: `L'invitation pour ${parsed.data.email} est créée, mais l'email n'a pas pu partir. Utilisez « Renvoyer » dans quelques minutes.`,
    };
  }
  return { status: "success", message: `Invitation envoyée à ${parsed.data.email}.` };
}

export async function resendInvitationAction(invitationId: string): Promise<ActionState> {
  if (!uuid.safeParse(invitationId).success) return { status: "error", message: "Invitation introuvable." };
  try {
    const ctx = await getActionTenant();
    const result = await resendInvitation(ctx, invitationId, await getRequestMeta());
    revalidatePath("/team");
    if (!result.email.ok) {
      return { status: "error", message: "L'email n'a pas pu être envoyé. Réessayez dans quelques minutes." };
    }
  } catch (error) {
    return actionFailure(error);
  }
  return { status: "success", message: "Invitation renvoyée." };
}

export async function revokeInvitationAction(invitationId: string): Promise<ActionState> {
  if (!uuid.safeParse(invitationId).success) return { status: "error", message: "Invitation introuvable." };
  try {
    const ctx = await getActionTenant();
    await revokeInvitation(ctx, invitationId, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidatePath("/team");
  return { status: "success", message: "Invitation annulée." };
}

export async function changeMemberRoleAction(membershipId: string, role: string): Promise<ActionState> {
  if (!uuid.safeParse(membershipId).success || !isRole(role)) {
    return { status: "error", message: "Requête invalide." };
  }
  try {
    const ctx = await getActionTenant();
    await changeMemberRole(ctx, { membershipId, role }, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  revalidatePath("/team");
  return { status: "success", message: "Rôle mis à jour." };
}

export async function removeMemberAction(membershipId: string): Promise<ActionState> {
  if (!uuid.safeParse(membershipId).success) return { status: "error", message: "Membre introuvable." };
  let leftOrganization = false;
  try {
    const ctx = await getActionTenant();
    ({ leftOrganization } = await removeMember(ctx, membershipId, await getRequestMeta()));
  } catch (error) {
    return actionFailure(error);
  }
  revalidatePath("/", "layout");
  if (leftOrganization) redirect("/dashboard");
  return { status: "success", message: "Membre retiré de l'équipe." };
}
