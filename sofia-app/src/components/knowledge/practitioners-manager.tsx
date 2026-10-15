"use client";

import { UserRoundIcon } from "lucide-react";

import { FormField } from "@/components/forms/form-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fieldError, submittedValue, type ActionState } from "@/lib/forms/action-state";

import { DeleteEntryButton, EmptyEntries, EntryDialog, EntryForm, type EntryAction, type ServiceOption } from "./entry-parts";

export interface PractitionerRow {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  serviceIds: string[];
}

function PractitionerFields({ state, practitioner, services }: { state: ActionState; practitioner?: PractitionerRow; services: ServiceOption[] }) {
  const value = (field: string, fallback: string) => submittedValue(state, field, fallback);
  const selected = new Set(practitioner?.serviceIds ?? []);
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="practitioner-name" label="Nom" error={fieldError(state, "name")} hint="Tel que SOFIA le dit : « Dre Inês Marques », « Léa ».">
          {(props) => <Input {...props} name="name" defaultValue={value("name", practitioner?.name ?? "")} maxLength={80} required />}
        </FormField>
        <FormField id="practitioner-title" label="Fonction" error={fieldError(state, "title")}>
          {(props) => (
            <Input {...props} name="title" defaultValue={value("title", practitioner?.title ?? "")} maxLength={80} placeholder="Esthéticienne, médecin esthétique…" />
          )}
        </FormField>
      </div>
      <FormField id="practitioner-bio" label="Présentation" error={fieldError(state, "bio")} hint="Formation, spécialités. SOFIA ne dit rien de plus que ce texte.">
        {(props) => <Textarea {...props} name="bio" defaultValue={value("bio", practitioner?.bio ?? "")} rows={3} maxLength={600} />}
      </FormField>
      {services.length > 0 ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Prestations réalisées</legend>
          {fieldError(state, "serviceIds") ? <p className="text-[0.8125rem] font-medium text-destructive">{fieldError(state, "serviceIds")}</p> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((service) => (
              <Label key={service.id} htmlFor={`practitioner-service-${service.id}`} className="flex items-center gap-2.5 font-normal">
                <Checkbox id={`practitioner-service-${service.id}`} name="serviceIds" value={service.id} defaultChecked={selected.has(service.id)} />
                <span className="text-sm">{service.name}</span>
              </Label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </>
  );
}

export function PractitionersManager({
  practitioners,
  services,
  canEdit,
  createAction,
  updateAction,
  archiveAction,
}: {
  practitioners: PractitionerRow[];
  services: ServiceOption[];
  canEdit: boolean;
  createAction: EntryAction;
  updateAction: (practitionerId: string, state: ActionState, formData: FormData) => Promise<ActionState>;
  archiveAction: (practitionerId: string) => Promise<ActionState>;
}) {
  const serviceNames = new Map(services.map((service) => [service.id, service.name]));
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {practitioners.length === 0
            ? "Aucune fiche pour l'instant."
            : `${practitioners.length} personne${practitioners.length > 1 ? "s" : ""} que SOFIA peut présenter à vos clientes.`}
        </p>
        {canEdit ? (
          <EntryDialog title="Nouvelle fiche" description="Qui réalise quoi : SOFIA ne cite jamais un nom absent de cette liste." addLabel="Ajouter une personne">
            {(close) => (
              <EntryForm action={createAction} submitLabel="Ajouter" onSuccess={close}>
                {(state) => <PractitionerFields state={state} services={services} />}
              </EntryForm>
            )}
          </EntryDialog>
        ) : null}
      </div>

      {practitioners.length === 0 ? (
        <EmptyEntries icon={UserRoundIcon} title="Votre équipe de soins">
          Les clientes demandent souvent « avec qui ? ». Sans fiche, SOFIA répond simplement que l&apos;équipe s&apos;occupera d&apos;elles.
        </EmptyEntries>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {practitioners.map((practitioner) => (
            <li key={practitioner.id} className="flex items-start gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {practitioner.name}
                  {practitioner.title ? <span className="font-normal text-muted-foreground"> · {practitioner.title}</span> : null}
                </p>
                {practitioner.bio ? <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">{practitioner.bio}</p> : null}
                {practitioner.serviceIds.length > 0 ? (
                  <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">
                    {practitioner.serviceIds
                      .map((id) => serviceNames.get(id))
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
              {canEdit ? (
                <div className="flex shrink-0 items-center">
                  <EntryDialog title={`Modifier la fiche de ${practitioner.name}`} editLabel={`Modifier ${practitioner.name}`}>
                    {(close) => (
                      <EntryForm action={updateAction.bind(null, practitioner.id)} submitLabel="Enregistrer" onSuccess={close}>
                        {(state) => <PractitionerFields state={state} practitioner={practitioner} services={services} />}
                      </EntryForm>
                    )}
                  </EntryDialog>
                  <DeleteEntryButton
                    label={`Retirer ${practitioner.name}`}
                    title={`Retirer ${practitioner.name} ?`}
                    description="SOFIA ne mentionnera plus cette personne. Les rendez-vous passés gardent son nom dans leur historique."
                    confirmLabel="Retirer"
                    onConfirm={() => archiveAction(practitioner.id)}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
