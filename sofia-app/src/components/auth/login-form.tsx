"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";

export function LoginForm({
  action,
  next,
  signupEnabled,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  next?: string;
  signupEnabled: boolean;
}) {
  const [state, formAction] = useActionState(action, idleState);

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormField id="email" label="Email professionnel" error={fieldError(state, "email")}>
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="vous@etablissement.fr"
            defaultValue={submittedValue(state, "email")}
            required
            autoFocus
          />
        )}
      </FormField>
      <FormField
        id="password"
        label="Mot de passe"
        error={fieldError(state, "password")}
        action={
          <Link href="/forgot-password" className="text-[0.8125rem] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Mot de passe oublié ?
          </Link>
        }
      >
        {(props) => <PasswordInput {...props} name="password" autoComplete="current-password" required />}
      </FormField>
      <SubmitButton size="xl" className="mt-1 w-full" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
      {signupEnabled ? (
        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Créer mon espace SOFIA
          </Link>
        </p>
      ) : null}
    </form>
  );
}
