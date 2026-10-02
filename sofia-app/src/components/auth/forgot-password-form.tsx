"use client";

import { MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";

export function ForgotPasswordForm({ action }: { action: (state: ActionState, formData: FormData) => Promise<ActionState> }) {
  const [state, formAction] = useActionState(action, idleState);

  if (state.status === "success") {
    return (
      <div className="grid gap-6">
        <div className="flex gap-3 rounded-xl border border-success/20 bg-success-soft p-4 text-sm leading-relaxed text-success" role="status">
          <MailCheckIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>{state.message}</p>
        </div>
        <Link href="/login" className="text-center text-sm font-medium underline-offset-4 hover:underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <FormField id="email" label="Email du compte" error={fieldError(state, "email")}>
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
      <SubmitButton size="xl" className="w-full" pendingLabel="Envoi…">
        Recevoir le lien
      </SubmitButton>
      <Link href="/login" className="text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        Retour à la connexion
      </Link>
    </form>
  );
}
