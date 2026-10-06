"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";

import type { ActionState } from "@/lib/forms/action-state";
import { safeRedirectPath } from "@/lib/navigation";
import {
  acceptInvitationNewAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";
import { actionFailure, formObject, validationFailure } from "@/server/actions";
import { deleteSessionCookie, setSessionCookie } from "@/server/auth/cookies";
import { getActionSession, getCurrentSession } from "@/server/auth/dal";
import {
  requestPasswordReset,
  resetPassword,
  signIn,
  signOut,
  signUp,
  verifyEmail,
} from "@/server/auth/service";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { getRequestMeta } from "@/server/security/request";
import { acceptInvitationAsUser, acceptInvitationWithNewAccount } from "@/server/services/members";
import { AppError } from "@/server/errors";

const schedule = (task: () => Promise<unknown>) => after(task);

export async function signInAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  const destination = safeRedirectPath(formData.get("next"));
  try {
    const grant = await signIn(parsed.data, await getRequestMeta());
    await setSessionCookie(grant.sessionToken, grant.sessionExpiresAt);
  } catch (error) {
    return actionFailure(error, formData);
  }
  redirect(destination);
}

export async function signUpAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    const grant = await signUp(parsed.data, await getRequestMeta(), { schedule });
    await setSessionCookie(grant.sessionToken, grant.sessionExpiresAt);
  } catch (error) {
    return actionFailure(error, formData);
  }
  redirect("/onboarding/welcome");
}

export async function forgotPasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    await requestPasswordReset(parsed.data.email, await getRequestMeta(), { schedule });
  } catch (error) {
    return actionFailure(error, formData);
  }
  return {
    status: "success",
    message: `Si un compte existe pour ${parsed.data.email}, un email avec un lien de réinitialisation vient d'être envoyé. Pensez à vérifier vos spams.`,
  };
}

export async function resetPasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    const grant = await resetPassword(
      { token: parsed.data.token, password: parsed.data.password },
      await getRequestMeta(),
      { schedule },
    );
    await setSessionCookie(grant.sessionToken, grant.sessionExpiresAt);
  } catch (error) {
    return actionFailure(error, formData);
  }
  redirect("/dashboard?password=reset");
}

export async function verifyEmailAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const token = formData.get("token");
  if (typeof token !== "string" || token.length < 20 || token.length > 200) {
    return { status: "error", message: "Ce lien de confirmation est invalide." };
  }
  try {
    await verifyEmail(token, await getRequestMeta());
  } catch (error) {
    return actionFailure(error);
  }
  return { status: "success", message: "Adresse email confirmée. Merci !" };
}

export async function signOutAction() {
  const session = await getCurrentSession();
  if (session) {
    await signOut(session, await getRequestMeta());
  }
  await deleteSessionCookie();
  redirect("/login");
}

async function guardInvitationAttempts() {
  const meta = await getRequestMeta();
  if (!meta.ipAddress) return meta;
  const limit = await consumeRateLimit("invitationAcceptByIp", meta.ipAddress);
  if (!limit.allowed) throw new AppError("RATE_LIMITED", "Trop de tentatives. Réessayez un peu plus tard.");
  return meta;
}

export async function acceptInvitationAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const token = formData.get("token");
  if (typeof token !== "string" || token.length < 20 || token.length > 200) {
    return { status: "error", message: "Cette invitation est invalide." };
  }
  try {
    const meta = await guardInvitationAttempts();
    const session = await getActionSession();
    await acceptInvitationAsUser(token, session, meta);
  } catch (error) {
    return actionFailure(error);
  }
  redirect("/dashboard?joined=1");
}

export async function acceptInvitationNewAccountAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = acceptInvitationNewAccountSchema.safeParse(formObject(formData));
  if (!parsed.success) return validationFailure(parsed.error, formData);
  try {
    const meta = await guardInvitationAttempts();
    const grant = await acceptInvitationWithNewAccount(parsed.data, meta);
    await setSessionCookie(grant.sessionToken, grant.sessionExpiresAt);
  } catch (error) {
    return actionFailure(error, formData);
  }
  redirect("/dashboard?joined=1");
}
