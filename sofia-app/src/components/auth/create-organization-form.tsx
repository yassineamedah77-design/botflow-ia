"use client";

import { useActionState } from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";

export function CreateOrganizationForm({ action }: { action: (state: ActionState, formData: FormData) => Promise<ActionState> }) {
  const [state, formAction] = useActionState(action, idleState);
  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <FormField id="organizationName" label="Nom de l'établissement" error={fieldError(state, "organizationName")}>
        {(props) => (
          <Input
            {...props}
            name="organizationName"
            autoComplete="organization"
            placeholder="Institut, clinique, spa…"
            defaultValue={submittedValue(state, "organizationName")}
            required
            autoFocus
          />
        )}
      </FormField>
      <SubmitButton size="xl" className="w-full" pendingLabel="Création…">
        Créer mon établissement
      </SubmitButton>
    </form>
  );
}
