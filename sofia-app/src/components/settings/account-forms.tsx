"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function useToastOnResult(state: ActionState) {
  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Enregistré.");
    if (state.status === "error") toast.error(state.message);
  }, [state]);
}

export function ProfileForm({ action, name, email }: { action: FormAction; name: string; email: string }) {
  const [state, formAction] = useActionState(action, idleState);
  useToastOnResult(state);
  return (
    <form action={formAction} className="grid gap-5">
      <FormField id="profile-name" label="Prénom et nom" error={fieldError(state, "name")}>
        {(props) => <Input {...props} name="name" autoComplete="name" defaultValue={submittedValue(state, "name", name)} required />}
      </FormField>
      <FormField id="profile-email" label="Email" hint="L'adresse de connexion ne peut pas encore être modifiée depuis l'application.">
        {(props) => <Input {...props} value={email} readOnly disabled />}
      </FormField>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </div>
    </form>
  );
}

export function ChangePasswordForm({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState(action, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  useToastOnResult(state);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-5" noValidate>
      <FormField id="currentPassword" label="Mot de passe actuel" error={fieldError(state, "currentPassword")}>
        {(props) => <PasswordInput {...props} name="currentPassword" autoComplete="current-password" required />}
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="newPassword" label="Nouveau mot de passe" error={fieldError(state, "newPassword")} hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères.`}>
          {(props) => <PasswordInput {...props} name="newPassword" autoComplete="new-password" required />}
        </FormField>
        <FormField id="confirmPassword" label="Confirmation" error={fieldError(state, "confirmPassword")}>
          {(props) => <PasswordInput {...props} name="confirmPassword" autoComplete="new-password" required />}
        </FormField>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Modification…">Modifier le mot de passe</SubmitButton>
      </div>
    </form>
  );
}

export function SessionActionButton({
  action,
  label,
  variant = "outline",
}: {
  action: () => Promise<ActionState>;
  label: string;
  variant?: "outline" | "destructive" | "ghost";
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant={variant}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if (result.status === "success") toast.success(result.message ?? "Fait.");
          else if (result.status === "error") toast.error(result.message);
        })
      }
    >
      {label}
    </Button>
  );
}
