"use client";

import { TicketPercentIcon } from "lucide-react";
import { useState } from "react";

import { FormField } from "@/components/forms/form-field";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fieldError, submittedValue, type ActionState } from "@/lib/forms/action-state";

import { DeleteEntryButton, EmptyEntries, EntryDialog, EntryForm, type EntryAction, type ServiceOption } from "./entry-parts";

export interface PromotionRow {
  id: string;
  title: string;
  description: string | null;
  serviceId: string | null;
  serviceName: string | null;
  /** Days in the establishment's time zone, "YYYY-MM-DD", the last one included. */
  startsOn: string | null;
  endsOn: string | null;
  state: "upcoming" | "running" | "ended";
  /** "du 1 nov. au 30 nov." as shown to the team. */
  period: string;
}

const STATE_BADGE = {
  running: { label: "En cours", variant: "success" },
  upcoming: { label: "À venir", variant: "info" },
  ended: { label: "Terminée", variant: "muted" },
} as const;

const NONE = "none";

function PromotionFields({ state, promotion, services }: { state: ActionState; promotion?: PromotionRow; services: ServiceOption[] }) {
  const value = (field: string, fallback: string) => submittedValue(state, field, fallback);
  const [serviceId, setServiceId] = useState(value("serviceId", promotion?.serviceId ?? "") || NONE);
  return (
    <>
      <FormField id="promotion-title" label="Titre" error={fieldError(state, "title")} hint="Ce que SOFIA annonce, par exemple « -20 % sur le premier soin visage ».">
        {(props) => <Input {...props} name="title" defaultValue={value("title", promotion?.title ?? "")} maxLength={120} required />}
      </FormField>
      <FormField id="promotion-description" label="Conditions" error={fieldError(state, "description")} hint="Pour qui, combien, comment en profiter. SOFIA n'ajoute aucune condition.">
        {(props) => <Textarea {...props} name="description" defaultValue={value("description", promotion?.description ?? "")} rows={3} maxLength={1000} />}
      </FormField>
      <FormField id="promotion-service" label="Prestation concernée" error={fieldError(state, "serviceId")}>
        {(props) => (
          <>
            <input type="hidden" name="serviceId" value={serviceId === NONE ? "" : serviceId} />
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger id={props.id} aria-invalid={props["aria-invalid"]} aria-describedby={props["aria-describedby"]} className="h-10 w-full bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Plusieurs prestations ou tout l&apos;établissement</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="promotion-starts" label="Premier jour" error={fieldError(state, "startsOn")} hint="Vide : dès aujourd'hui.">
          {(props) => <Input {...props} name="startsOn" type="date" defaultValue={value("startsOn", promotion?.startsOn ?? "")} />}
        </FormField>
        <FormField id="promotion-ends" label="Dernier jour" error={fieldError(state, "endsOn")} hint="Vide : jusqu'à ce que vous la supprimiez.">
          {(props) => <Input {...props} name="endsOn" type="date" defaultValue={value("endsOn", promotion?.endsOn ?? "")} />}
        </FormField>
      </div>
    </>
  );
}

export function PromotionsManager({
  promotions,
  services,
  canEdit,
  createAction,
  updateAction,
  deleteAction,
}: {
  promotions: PromotionRow[];
  services: ServiceOption[];
  canEdit: boolean;
  createAction: EntryAction;
  updateAction: (promotionId: string, state: ActionState, formData: FormData) => Promise<ActionState>;
  deleteAction: (promotionId: string) => Promise<ActionState>;
}) {
  const running = promotions.filter((promotion) => promotion.state === "running").length;
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {promotions.length === 0
            ? "Aucune promotion."
            : `${running} promotion${running > 1 ? "s" : ""} en cours. SOFIA n'annonce que celles-ci, jamais une promotion terminée ou à venir.`}
        </p>
        {canEdit ? (
          <EntryDialog title="Nouvelle promotion" description="Annoncée par SOFIA pendant ses dates, à l'identique." addLabel="Ajouter une promotion">
            {(close) => (
              <EntryForm action={createAction} submitLabel="Ajouter la promotion" onSuccess={close}>
                {(state) => <PromotionFields state={state} services={services} />}
              </EntryForm>
            )}
          </EntryDialog>
        ) : null}
      </div>

      {promotions.length === 0 ? (
        <EmptyEntries icon={TicketPercentIcon} title="Aucune promotion en ce moment">
          SOFIA ne propose jamais de remise de sa propre initiative. Ajoutez ici vos offres réelles, avec leurs dates : elle les annoncera quand une
          cliente s&apos;intéresse à la prestation concernée.
        </EmptyEntries>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {promotions.map((promotion) => (
            <li key={promotion.id} className="flex items-start gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  {promotion.title}
                  <Badge variant={STATE_BADGE[promotion.state].variant}>{STATE_BADGE[promotion.state].label}</Badge>
                </p>
                {promotion.description ? (
                  <p className="mt-1 text-[0.8125rem] leading-relaxed whitespace-pre-line text-muted-foreground">{promotion.description}</p>
                ) : null}
                <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">
                  {promotion.period}
                  {promotion.serviceName ? ` · ${promotion.serviceName}` : ""}
                </p>
              </div>
              {canEdit ? (
                <div className="flex shrink-0 items-center">
                  <EntryDialog title="Modifier la promotion" editLabel={`Modifier « ${promotion.title} »`}>
                    {(close) => (
                      <EntryForm action={updateAction.bind(null, promotion.id)} submitLabel="Enregistrer" onSuccess={close}>
                        {(state) => <PromotionFields state={state} promotion={promotion} services={services} />}
                      </EntryForm>
                    )}
                  </EntryDialog>
                  <DeleteEntryButton
                    label={`Supprimer « ${promotion.title} »`}
                    title="Supprimer cette promotion ?"
                    description="SOFIA cessera immédiatement de l'annoncer."
                    onConfirm={() => deleteAction(promotion.id)}
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
