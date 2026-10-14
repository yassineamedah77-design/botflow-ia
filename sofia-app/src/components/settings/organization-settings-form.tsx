"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, TIMEZONES } from "@/lib/validation/organization";

export function OrganizationSettingsForm({
  action,
  initial,
  canEdit,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial: { name: string; timezone: string; defaultLanguage: string; allowedLanguages: string[] };
  canEdit: boolean;
}) {
  const [state, formAction] = useActionState(action, idleState);

  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Enregistré.");
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  const allowedError = fieldError(state, "allowedLanguages");

  return (
    <form action={formAction} className="grid gap-6">
      <fieldset disabled={!canEdit} className="grid gap-6 disabled:opacity-80">
        <FormField id="name" label="Nom de l'établissement" error={fieldError(state, "name")}>
          {(props) => <Input {...props} name="name" defaultValue={submittedValue(state, "name", initial.name)} required />}
        </FormField>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            id="timezone"
            label="Fuseau horaire"
            error={fieldError(state, "timezone")}
            hint="Utilisé pour les horaires, les rappels et les statistiques."
          >
            {(props) => (
              <Select name="timezone" defaultValue={initial.timezone} disabled={!canEdit}>
                <SelectTrigger id={props.id} aria-invalid={props["aria-invalid"]} aria-describedby={props["aria-describedby"]} className="h-10 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((zone) => (
                    <SelectItem key={zone.value} value={zone.value}>
                      {zone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          <FormField
            id="defaultLanguage"
            label="Langue par défaut de SOFIA"
            error={fieldError(state, "defaultLanguage")}
            hint="Utilisée quand la langue du message n'est pas claire."
          >
            {(props) => (
              <Select name="defaultLanguage" defaultValue={initial.defaultLanguage} disabled={!canEdit}>
                <SelectTrigger id={props.id} aria-invalid={props["aria-invalid"]} aria-describedby={props["aria-describedby"]} className="h-10 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((language) => (
                    <SelectItem key={language} value={language}>
                      {LANGUAGE_LABELS[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium">Langues autorisées</legend>
          <p className="-mt-1 text-[0.8125rem] text-muted-foreground">
            SOFIA détecte la langue de chaque cliente et répond dans celle-ci, uniquement parmi les langues cochées.
          </p>
          <div className="flex flex-wrap gap-3">
            {SUPPORTED_LANGUAGES.map((language) => (
              <Label
                key={language}
                htmlFor={`language-${language}`}
                className="flex h-10 items-center gap-2.5 rounded-lg border border-input bg-card px-3.5 font-normal shadow-xs has-[[data-state=checked]]:border-foreground/40"
              >
                <Checkbox
                  id={`language-${language}`}
                  name="allowedLanguages"
                  value={language}
                  defaultChecked={initial.allowedLanguages.includes(language)}
                  disabled={!canEdit}
                />
                {LANGUAGE_LABELS[language]}
              </Label>
            ))}
          </div>
          {allowedError ? <p className="text-[0.8125rem] font-medium text-destructive">{allowedError}</p> : null}
        </fieldset>
      </fieldset>

      {canEdit ? (
        <div className="flex justify-end border-t border-border pt-5">
          <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
        </div>
      ) : (
        <p className="border-t border-border pt-5 text-[0.8125rem] text-muted-foreground">
          Seuls les propriétaires et administrateurs peuvent modifier ces réglages.
        </p>
      )}
    </form>
  );
}
