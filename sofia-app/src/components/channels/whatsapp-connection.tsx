"use client";

import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** The three values from Meta's WhatsApp Manager. The token field is never filled back. */
export function WhatsappConnectForm({ action, reconnect }: { action: FormAction; reconnect: boolean }) {
  const [state, formAction] = useActionState(action, idleState);

  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "WhatsApp connecté.");
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="phoneNumberId"
          label="Identifiant du numéro"
          error={fieldError(state, "phoneNumberId")}
          hint="WhatsApp Manager → Numéros de téléphone : le « Phone number ID » sous votre numéro."
        >
          {(props) => (
            <Input {...props} name="phoneNumberId" inputMode="numeric" autoComplete="off" required defaultValue={submittedValue(state, "phoneNumberId")} />
          )}
        </FormField>
        <FormField
          id="businessAccountId"
          label="Identifiant du compte WhatsApp Business"
          error={fieldError(state, "businessAccountId")}
          hint="Le « WhatsApp Business Account ID », affiché sur la même page."
        >
          {(props) => (
            <Input {...props} name="businessAccountId" inputMode="numeric" autoComplete="off" required defaultValue={submittedValue(state, "businessAccountId")} />
          )}
        </FormField>
      </div>
      <FormField
        id="accessToken"
        label="Jeton d'accès permanent"
        error={fieldError(state, "accessToken")}
        hint="Paramètres de l'entreprise Meta → Utilisateurs système : générez un jeton sans expiration avec les autorisations whatsapp_business_messaging et whatsapp_business_management. Il est chiffré et ne s'affiche plus jamais."
      >
        {(props) => <Input {...props} name="accessToken" type="password" autoComplete="off" spellCheck={false} required />}
      </FormField>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Vérification auprès de Meta…">{reconnect ? "Reconnecter le numéro" : "Connecter WhatsApp"}</SubmitButton>
      </div>
    </form>
  );
}

export function WhatsappDisconnectButton({ action, displayName }: { action: FormAction; displayName: string | null }) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={pending}>
          Déconnecter
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Déconnecter WhatsApp ?</AlertDialogTitle>
          <AlertDialogDescription>
            SOFIA n&apos;enverra plus rien sur {displayName ?? "ce numéro"} et oubliera le jeton d&apos;accès. Les conversations restent dans
            l&apos;inbox. Les messages que vos clientes enverront ensuite n&apos;arriveront plus dans SOFIA.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                const result = await action(idleState, new FormData());
                if (result.status === "success") toast.success(result.message ?? "WhatsApp déconnecté.");
                if (result.status === "error") toast.error(result.message);
              })
            }
          >
            Déconnecter
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
