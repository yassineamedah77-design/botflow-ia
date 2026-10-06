"use client";

import { InfoIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CONSENT_LABELS, LEAD_SOURCE_LABELS, MANUAL_SOURCES } from "@/lib/crm";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";

const NONE = "none";

export interface LeadFormDefaults {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  instagramHandle: string;
  source: string;
  interestedServiceId: string;
  potentialValue: string;
  assignedToUserId: string;
  marketingConsent: "UNKNOWN" | "GRANTED" | "DENIED" | "WITHDRAWN";
}

export const EMPTY_LEAD: LeadFormDefaults = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  instagramHandle: "",
  source: "MANUAL",
  interestedServiceId: "",
  potentialValue: "",
  assignedToUserId: "",
  marketingConsent: "UNKNOWN",
};

/** Select bound to a hidden input, so "none" is submitted as an empty value. */
function HiddenSelect({
  id,
  name,
  value,
  onChange,
  options,
  noneLabel,
  describedBy,
  invalid,
  disabled,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  noneLabel?: string;
  describedBy?: string;
  invalid?: true;
  disabled?: boolean;
}) {
  return (
    <>
      <input type="hidden" name={name} value={value === NONE ? "" : value} />
      <Select value={value || NONE} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} aria-invalid={invalid} aria-describedby={describedBy} className="h-10 w-full bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {noneLabel ? <SelectItem value={NONE}>{noneLabel}</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

export function LeadForm({
  action,
  defaults,
  services,
  members,
  submitLabel,
  optedOut = false,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults: LeadFormDefaults;
  services: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string }>;
  submitLabel: string;
  optedOut?: boolean;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const value = (field: keyof LeadFormDefaults) => submittedValue(state, field, defaults[field]);
  const [source, setSource] = useState(value("source"));
  const [service, setService] = useState(value("interestedServiceId"));
  const [assignee, setAssignee] = useState(value("assignedToUserId"));
  const consentLocked = defaults.marketingConsent === "WITHDRAWN" || optedOut;
  const [consent, setConsent] = useState(defaults.marketingConsent === "WITHDRAWN" ? "DENIED" : value("marketingConsent"));

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Enregistré.");
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="grid gap-5">
      <FormMessage state={state.status === "error" ? state : idleState} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="lead-firstName" label="Prénom" error={fieldError(state, "firstName")}>
          {(props) => <Input {...props} name="firstName" defaultValue={value("firstName")} autoComplete="off" />}
        </FormField>
        <FormField id="lead-lastName" label="Nom" error={fieldError(state, "lastName")}>
          {(props) => <Input {...props} name="lastName" defaultValue={value("lastName")} autoComplete="off" />}
        </FormField>
        <FormField id="lead-phone" label="Téléphone" error={fieldError(state, "phone")} hint="Format libre : 06 12 34 56 78, +351 912 345 678…">
          {(props) => <Input {...props} name="phone" type="tel" inputMode="tel" defaultValue={value("phone")} autoComplete="off" />}
        </FormField>
        <FormField id="lead-email" label="Email" error={fieldError(state, "email")}>
          {(props) => <Input {...props} name="email" type="email" defaultValue={value("email")} autoComplete="off" />}
        </FormField>
        <FormField id="lead-instagram" label="Instagram" error={fieldError(state, "instagramHandle")}>
          {(props) => <Input {...props} name="instagramHandle" placeholder="@identifiant" defaultValue={value("instagramHandle")} autoComplete="off" />}
        </FormField>
        <FormField id="lead-source" label="Source" error={fieldError(state, "source")}>
          {(props) => (
            <HiddenSelect
              id={props.id}
              name="source"
              value={source}
              onChange={setSource}
              invalid={props["aria-invalid"]}
              describedBy={props["aria-describedby"]}
              options={MANUAL_SOURCES.map((option) => ({ value: option, label: LEAD_SOURCE_LABELS[option] }))}
            />
          )}
        </FormField>
        <FormField id="lead-service" label="Prestation recherchée" error={fieldError(state, "interestedServiceId")}>
          {(props) => (
            <HiddenSelect
              id={props.id}
              name="interestedServiceId"
              value={service}
              onChange={setService}
              invalid={props["aria-invalid"]}
              describedBy={props["aria-describedby"]}
              noneLabel="Aucune pour l'instant"
              options={services.map((option) => ({ value: option.id, label: option.name }))}
            />
          )}
        </FormField>
        <FormField id="lead-value" label="Valeur potentielle (€)" error={fieldError(state, "potentialValue")} hint="Laisser vide si inconnue.">
          {(props) => <Input {...props} name="potentialValue" inputMode="decimal" placeholder="180" defaultValue={value("potentialValue")} />}
        </FormField>
        <FormField id="lead-assignee" label="Assigné à" error={fieldError(state, "assignedToUserId")}>
          {(props) => (
            <HiddenSelect
              id={props.id}
              name="assignedToUserId"
              value={assignee}
              onChange={setAssignee}
              invalid={props["aria-invalid"]}
              describedBy={props["aria-describedby"]}
              noneLabel="Personne"
              options={members.map((member) => ({ value: member.id, label: member.name }))}
            />
          )}
        </FormField>
        <FormField
          id="lead-consent"
          label="Consentement marketing"
          error={fieldError(state, "marketingConsent")}
          hint={
            consentLocked ? (
              <span className="inline-flex items-start gap-1.5">
                <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Ce contact a demandé à ne plus recevoir de messages : seul son propre accord peut le rétablir.
              </span>
            ) : (
              "Accord pour recevoir des offres et relances commerciales. Chaque changement est tracé."
            )
          }
        >
          {(props) => (
            <HiddenSelect
              id={props.id}
              name="marketingConsent"
              value={consentLocked ? "DENIED" : consent}
              onChange={setConsent}
              disabled={consentLocked}
              invalid={props["aria-invalid"]}
              describedBy={props["aria-describedby"]}
              options={(["UNKNOWN", "GRANTED", "DENIED"] as const).map((option) => ({
                value: option,
                label: consentLocked && option === "DENIED" ? CONSENT_LABELS.WITHDRAWN : CONSENT_LABELS[option],
              }))}
            />
          )}
        </FormField>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
