"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import type * as React from "react";

import { FormField } from "@/components/forms/form-field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";

export interface EstablishmentDefaults {
  assistantName: string;
  description: string;
  tone: string;
  addressLine: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  websiteUrl: string;
  instagramHandle: string;
  bookingPolicy: string;
  cancellationPolicy: string;
  importantInfo: string;
}

function Group({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-5 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <div>
        <legend className="text-sm font-semibold text-foreground">{title}</legend>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children}
    </fieldset>
  );
}

export function EstablishmentForm({
  action,
  defaults,
  canEdit,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults: EstablishmentDefaults;
  canEdit: boolean;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const value = (field: keyof EstablishmentDefaults) => submittedValue(state, field, defaults[field]);

  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Enregistré.");
  }, [state]);

  return (
    <form action={formAction} className="grid gap-6">
      <FormMessage state={state.status === "error" ? state : idleState} />
      <fieldset disabled={!canEdit} className="grid gap-6 disabled:opacity-80">
        <Group title="Votre assistante" description="Le prénom et le ton qu'elle utilise avec vos clientes.">
          <div className="grid gap-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <FormField id="assistantName" label="Prénom de l'assistante" error={fieldError(state, "assistantName")}>
              {(props) => <Input {...props} name="assistantName" defaultValue={value("assistantName")} maxLength={40} required />}
            </FormField>
            <FormField
              id="tone"
              label="Ton à adopter"
              error={fieldError(state, "tone")}
              hint="Quelques mots suffisent : vouvoiement, chaleureux, phrases courtes…"
            >
              {(props) => <Input {...props} name="tone" defaultValue={value("tone")} maxLength={300} placeholder="Chaleureux et professionnel, vouvoiement" />}
            </FormField>
          </div>
          <FormField
            id="description"
            label="Présentation de l'établissement"
            error={fieldError(state, "description")}
            hint="Ce que SOFIA dira de vous : spécialités, équipe, ambiance. Elle ne dira rien d'autre."
          >
            {(props) => <Textarea {...props} name="description" defaultValue={value("description")} rows={4} maxLength={1500} />}
          </FormField>
        </Group>

        <Group title="Coordonnées" description="Adresse, téléphone et liens que SOFIA communique quand une cliente les demande.">
          <FormField id="addressLine" label="Adresse" error={fieldError(state, "addressLine")}>
            {(props) => <Input {...props} name="addressLine" defaultValue={value("addressLine")} autoComplete="street-address" required />}
          </FormField>
          <div className="grid gap-5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
            <FormField id="postalCode" label="Code postal" error={fieldError(state, "postalCode")}>
              {(props) => <Input {...props} name="postalCode" defaultValue={value("postalCode")} autoComplete="postal-code" required />}
            </FormField>
            <FormField id="city" label="Ville" error={fieldError(state, "city")}>
              {(props) => <Input {...props} name="city" defaultValue={value("city")} autoComplete="address-level2" required />}
            </FormField>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="phone" label="Téléphone" error={fieldError(state, "phone")}>
              {(props) => <Input {...props} name="phone" type="tel" inputMode="tel" defaultValue={value("phone")} autoComplete="tel" required />}
            </FormField>
            <FormField id="email" label="Email de contact" error={fieldError(state, "email")}>
              {(props) => <Input {...props} name="email" type="email" defaultValue={value("email")} autoComplete="email" />}
            </FormField>
            <FormField id="websiteUrl" label="Site web" error={fieldError(state, "websiteUrl")}>
              {(props) => <Input {...props} name="websiteUrl" defaultValue={value("websiteUrl")} placeholder="maison-eclat.fr" autoComplete="url" />}
            </FormField>
            <FormField id="instagramHandle" label="Instagram" error={fieldError(state, "instagramHandle")}>
              {(props) => <Input {...props} name="instagramHandle" defaultValue={value("instagramHandle")} placeholder="@votre.compte" />}
            </FormField>
          </div>
        </Group>

        <Group
          title="Règles à communiquer"
          description="Facultatif, mais précieux : SOFIA s'appuie sur ces règles plutôt que de répondre au hasard."
        >
          <FormField id="bookingPolicy" label="Réservation" error={fieldError(state, "bookingPolicy")} hint="Acompte, délai minimum, première visite…">
            {(props) => <Textarea {...props} name="bookingPolicy" defaultValue={value("bookingPolicy")} rows={2} maxLength={1000} />}
          </FormField>
          <FormField id="cancellationPolicy" label="Annulation" error={fieldError(state, "cancellationPolicy")} hint="Délai pour annuler ou déplacer sans frais.">
            {(props) => <Textarea {...props} name="cancellationPolicy" defaultValue={value("cancellationPolicy")} rows={2} maxLength={1000} />}
          </FormField>
          <FormField id="importantInfo" label="Informations utiles" error={fieldError(state, "importantInfo")} hint="Accès, parking, paiement accepté…">
            {(props) => <Textarea {...props} name="importantInfo" defaultValue={value("importantInfo")} rows={2} maxLength={1000} />}
          </FormField>
        </Group>
      </fieldset>

      {canEdit ? (
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <SubmitButton variant="outline" pendingLabel="Enregistrement…">
            Enregistrer
          </SubmitButton>
          <SubmitButton name="then" value="next" pendingLabel="Enregistrement…">
            Enregistrer et continuer
          </SubmitButton>
        </div>
      ) : (
        <p className="border-t border-border pt-5 text-[0.8125rem] text-muted-foreground">
          Seuls les propriétaires et administrateurs peuvent modifier ces informations.
        </p>
      )}
    </form>
  );
}
