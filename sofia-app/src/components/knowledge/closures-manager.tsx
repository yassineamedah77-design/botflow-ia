"use client";

import { CalendarOffIcon } from "lucide-react";

import { FormField } from "@/components/forms/form-field";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { fieldError, submittedValue, type ActionState } from "@/lib/forms/action-state";

import { DeleteEntryButton, EmptyEntries, EntryDialog, EntryForm, type EntryAction } from "./entry-parts";

export interface ClosureRow {
  id: string;
  /** "du 24 déc. au 2 janv." */
  period: string;
  reason: string | null;
  state: "upcoming" | "current" | "past";
}

function ClosureFields({ state }: { state: ActionState }) {
  const value = (field: string) => submittedValue(state, field, "");
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="closure-starts" label="Premier jour fermé" error={fieldError(state, "startsOn")}>
          {(props) => <Input {...props} name="startsOn" type="date" defaultValue={value("startsOn")} required />}
        </FormField>
        <FormField id="closure-ends" label="Dernier jour fermé" error={fieldError(state, "endsOn")} hint="Le même jour pour une seule journée.">
          {(props) => <Input {...props} name="endsOn" type="date" defaultValue={value("endsOn")} required />}
        </FormField>
      </div>
      <FormField id="closure-reason" label="Motif" error={fieldError(state, "reason")} hint="Facultatif. SOFIA peut le dire : « congés d'été », « formation de l'équipe ».">
        {(props) => <Input {...props} name="reason" defaultValue={value("reason")} maxLength={200} />}
      </FormField>
    </>
  );
}

export function ClosuresManager({
  closures,
  canEdit,
  createAction,
  deleteAction,
}: {
  closures: ClosureRow[];
  canEdit: boolean;
  createAction: EntryAction;
  deleteAction: (closureId: string) => Promise<ActionState>;
}) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Jours fériés, congés, formations : SOFIA prévient les clientes qui veulent venir pendant une fermeture.
        </p>
        {canEdit ? (
          <EntryDialog title="Nouvelle fermeture" addLabel="Ajouter une fermeture">
            {(close) => (
              <EntryForm action={createAction} submitLabel="Ajouter la fermeture" onSuccess={close}>
                {(state) => <ClosureFields state={state} />}
              </EntryForm>
            )}
          </EntryDialog>
        ) : null}
      </div>

      {closures.length === 0 ? (
        <EmptyEntries icon={CalendarOffIcon} title="Aucune fermeture prévue">
          En dehors de vos horaires habituels, ajoutez ici les jours où l&apos;établissement sera fermé.
        </EmptyEntries>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {closures.map((closure) => (
            <li key={closure.id} className={closure.state === "past" ? "flex items-center gap-3 px-4 py-3 opacity-60" : "flex items-center gap-3 px-4 py-3"}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  {closure.period}
                  {closure.state === "current" ? <Badge variant="warning">Fermé en ce moment</Badge> : null}
                  {closure.state === "past" ? <Badge variant="muted">Passée</Badge> : null}
                </p>
                {closure.reason ? <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{closure.reason}</p> : null}
              </div>
              {canEdit ? (
                <DeleteEntryButton
                  label={`Supprimer la fermeture ${closure.period}`}
                  title="Supprimer cette fermeture ?"
                  description="SOFIA considérera l'établissement ouvert ces jours-là, selon vos horaires habituels."
                  onConfirm={() => deleteAction(closure.id)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
