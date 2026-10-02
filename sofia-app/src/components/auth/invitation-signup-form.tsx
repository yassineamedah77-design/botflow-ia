"use client";

import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

export function InvitationSignupForm({
  action,
  token,
  email,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  token: string;
  email: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const termsError = fieldError(state, "acceptTerms");

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <FormField id="email" label="Email" hint="L'adresse à laquelle l'invitation a été envoyée.">
        {(props) => <Input {...props} value={email} readOnly disabled />}
      </FormField>
      <FormField id="name" label="Votre prénom et nom" error={fieldError(state, "name")}>
        {(props) => <Input {...props} name="name" autoComplete="name" defaultValue={submittedValue(state, "name")} required autoFocus />}
      </FormField>
      <FormField
        id="password"
        label="Choisissez un mot de passe"
        error={fieldError(state, "password")}
        hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères.`}
      >
        {(props) => <PasswordInput {...props} name="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} required />}
      </FormField>
      <div className="grid gap-2">
        <label htmlFor="acceptTerms" className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
          <Checkbox id="acceptTerms" name="acceptTerms" value="on" className="mt-0.5" aria-invalid={termsError ? true : undefined} />
          <span>J&apos;accepte les conditions d&apos;utilisation de SOFIA et la politique de confidentialité.</span>
        </label>
        {termsError ? <p className="text-[0.8125rem] font-medium text-destructive">{termsError}</p> : null}
      </div>
      <SubmitButton size="xl" className="mt-1 w-full" pendingLabel="Création du compte…">
        Créer mon compte et rejoindre l&apos;équipe
      </SubmitButton>
    </form>
  );
}
