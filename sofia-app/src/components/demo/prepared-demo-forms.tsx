"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";
import { MAX_DEMO_SERVICES } from "@/lib/validation/demo";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function DemoKeyForm({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState(action, idleState);
  return (
    <form action={formAction} className="grid gap-4">
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <FormField id="key" label="Clé d'accès">
        {(props) => <Input {...props} name="key" type="password" autoComplete="current-password" required />}
      </FormField>
      <SubmitButton pendingLabel="Vérification…">Entrer</SubmitButton>
    </form>
  );
}

/** A prospect clinic in a few minutes: only what is on its website. */
export function PreparedDemoForm({ action }: { action: FormAction }) {
  const [state, formAction] = useActionState(action, idleState);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Clinique prête.");
      form.current?.reset();
    }
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  const value = (field: string, fallback = "") => submittedValue(state, field, fallback);

  return (
    <form ref={form} action={formAction} className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="name" label="Nom de la clinique" error={fieldError(state, "name")}>
          {(props) => <Input {...props} name="name" defaultValue={value("name")} placeholder="Clínica Sorriso" required />}
        </FormField>
        <FormField id="city" label="Ville" error={fieldError(state, "city")}>
          {(props) => <Input {...props} name="city" defaultValue={value("city")} placeholder="Porto" required />}
        </FormField>
        <FormField id="addressLine" label="Adresse" error={fieldError(state, "addressLine")}>
          {(props) => <Input {...props} name="addressLine" defaultValue={value("addressLine")} placeholder="Rua de Santa Catarina 210" />}
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField id="postalCode" label="Code postal" error={fieldError(state, "postalCode")}>
            {(props) => <Input {...props} name="postalCode" defaultValue={value("postalCode")} placeholder="4000-442" />}
          </FormField>
          <FormField id="phone" label="Téléphone" error={fieldError(state, "phone")}>
            {(props) => <Input {...props} name="phone" type="tel" defaultValue={value("phone")} placeholder="+351 22 000 0000" />}
          </FormField>
        </div>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">Langue de SOFIA</legend>
        <div className="flex gap-5 text-sm">
          {[
            ["pt", "Portugais (Portugal)"],
            ["fr", "Français"],
          ].map(([code, label]) => (
            <label key={code} className="flex items-center gap-2">
              <input type="radio" name="language" value={code} defaultChecked={value("language", "pt") === code} className="accent-primary" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid grid-cols-2 gap-4">
          <FormField id="weekdayOpens" label="Lun–ven : ouverture" error={fieldError(state, "weekdayOpens")}>
            {(props) => <Input {...props} name="weekdayOpens" type="time" defaultValue={value("weekdayOpens", "09:30")} required />}
          </FormField>
          <FormField id="weekdayCloses" label="Fermeture" error={fieldError(state, "weekdayCloses")}>
            {(props) => <Input {...props} name="weekdayCloses" type="time" defaultValue={value("weekdayCloses", "19:00")} required />}
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField id="saturdayOpens" label="Samedi : ouverture" error={fieldError(state, "saturdayOpens")} hint="Vide si fermé.">
            {(props) => <Input {...props} name="saturdayOpens" type="time" defaultValue={value("saturdayOpens")} />}
          </FormField>
          <FormField id="saturdayCloses" label="Fermeture" error={fieldError(state, "saturdayCloses")}>
            {(props) => <Input {...props} name="saturdayCloses" type="time" defaultValue={value("saturdayCloses")} />}
          </FormField>
        </div>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">Soins (de 1 à {MAX_DEMO_SERVICES})</legend>
        <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
          Uniquement les prix affichés sur le site de la clinique. Prix vide : SOFIA dira que le prix est indiqué en consultation, elle
          n&apos;en invente jamais.
        </p>
        {Array.from({ length: MAX_DEMO_SERVICES }, (_, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_6.5rem_5.5rem] gap-2">
            <Input
              name={`service${index}Name`}
              aria-label={`Soin ${index + 1}`}
              aria-invalid={fieldError(state, `service${index}Name`) ? true : undefined}
              defaultValue={value(`service${index}Name`)}
              placeholder={index === 0 ? "Limpeza de pele" : `Soin ${index + 1}`}
            />
            <Input
              name={`service${index}Price`}
              aria-label={`Prix du soin ${index + 1}, en euros`}
              aria-invalid={fieldError(state, `service${index}Price`) ? true : undefined}
              defaultValue={value(`service${index}Price`)}
              placeholder="Prix €"
              inputMode="decimal"
            />
            <Input
              name={`service${index}Duration`}
              aria-label={`Durée du soin ${index + 1}, en minutes`}
              aria-invalid={fieldError(state, `service${index}Duration`) ? true : undefined}
              defaultValue={value(`service${index}Duration`)}
              placeholder="Min"
              inputMode="numeric"
            />
          </div>
        ))}
      </fieldset>

      <SubmitButton className="justify-self-start" pendingLabel="Création…">
        Créer la clinique
      </SubmitButton>
    </form>
  );
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Copie impossible : sélectionnez le lien à la main.");
        }
      }}
    >
      {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
      {copied ? "Copié" : "Copier le lien"}
    </Button>
  );
}
