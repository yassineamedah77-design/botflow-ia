"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

export function SignupForm({ action }: { action: (state: ActionState, formData: FormData) => Promise<ActionState> }) {
  const [state, formAction] = useActionState(action, idleState);
  const termsError = fieldError(state, "acceptTerms");

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <FormField id="name" label="Votre prénom et nom" error={fieldError(state, "name")}>
        {(props) => (
          <Input {...props} name="name" autoComplete="name" placeholder="Camille Laurent" defaultValue={submittedValue(state, "name")} required autoFocus />
        )}
      </FormField>
      <FormField id="organizationName" label="Nom de l'établissement" error={fieldError(state, "organizationName")}>
        {(props) => (
          <Input
            {...props}
            name="organizationName"
            autoComplete="organization"
            placeholder="Institut, clinique, spa…"
            defaultValue={submittedValue(state, "organizationName")}
            required
          />
        )}
      </FormField>
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
          />
        )}
      </FormField>
      <FormField
        id="password"
        label="Mot de passe"
        error={fieldError(state, "password")}
        hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères. Une phrase facile à retenir fonctionne très bien.`}
      >
        {(props) => <PasswordInput {...props} name="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} required />}
      </FormField>
      <div className="grid gap-2">
        <label htmlFor="acceptTerms" className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
          <Checkbox
            id="acceptTerms"
            name="acceptTerms"
            value="on"
            className="mt-0.5"
            aria-invalid={termsError ? true : undefined}
            defaultChecked={submittedValue(state, "acceptTerms") === "on"}
          />
          <span>
            J&apos;accepte les conditions d&apos;utilisation de SOFIA et la politique de confidentialité, y compris le
            traitement des données de mes clientes pour le compte de mon établissement.
          </span>
        </label>
        {termsError ? <p className="text-[0.8125rem] font-medium text-destructive">{termsError}</p> : null}
      </div>
      <SubmitButton size="xl" className="mt-1 w-full" pendingLabel="Création de votre espace…">
        Créer mon espace SOFIA
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
