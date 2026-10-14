"use client";

import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { fieldError, idleState, type ActionState } from "@/lib/forms/action-state";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

export function ResetPasswordForm({
  action,
  token,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  token: string;
}) {
  const [state, formAction] = useActionState(action, idleState);

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <FormField
        id="password"
        label="Nouveau mot de passe"
        error={fieldError(state, "password")}
        hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères.`}
      >
        {(props) => <PasswordInput {...props} name="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} required autoFocus />}
      </FormField>
      <FormField id="confirmPassword" label="Confirmez le mot de passe" error={fieldError(state, "confirmPassword")}>
        {(props) => <PasswordInput {...props} name="confirmPassword" autoComplete="new-password" required />}
      </FormField>
      <SubmitButton size="xl" className="mt-1 w-full" pendingLabel="Enregistrement…">
        Enregistrer et me connecter
      </SubmitButton>
    </form>
  );
}
