"use client";

import { FileTextIcon } from "lucide-react";

import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fieldError, submittedValue, type ActionState } from "@/lib/forms/action-state";
import { DOCUMENT_MAX_LENGTH } from "@/lib/validation/knowledge";

import { DeleteEntryButton, EmptyEntries, EntryDialog, EntryForm, type EntryAction } from "./entry-parts";

export interface DocumentRow {
  id: string;
  title: string;
  content: string;
  chunkCount: number;
  /** "mis à jour le 12 octobre 2026" */
  updatedLabel: string;
}

function DocumentFields({ state, document }: { state: ActionState; document?: DocumentRow }) {
  const value = (field: string, fallback: string) => submittedValue(state, field, fallback);
  return (
    <>
      <FormField id="document-title" label="Titre" error={fieldError(state, "title")}>
        {(props) => (
          <Input {...props} name="title" defaultValue={value("title", document?.title ?? "")} maxLength={120} placeholder="Protocole laser, conditions des cartes cadeaux…" required />
        )}
      </FormField>
      <FormField
        id="document-content"
        label="Texte"
        error={fieldError(state, "content")}
        hint="Collez le texte tel quel. SOFIA y cherche les passages utiles quand une question n'est pas couverte par vos prestations ou votre FAQ."
      >
        {(props) => (
          <Textarea {...props} name="content" defaultValue={value("content", document?.content ?? "")} rows={14} maxLength={DOCUMENT_MAX_LENGTH} required className="min-h-72 font-normal" />
        )}
      </FormField>
    </>
  );
}

export function DocumentsManager({
  documents,
  canEdit,
  createAction,
  updateAction,
  deleteAction,
}: {
  documents: DocumentRow[];
  canEdit: boolean;
  createAction: EntryAction;
  updateAction: (documentId: string, state: ActionState, formData: FormData) => Promise<ActionState>;
  deleteAction: (documentId: string) => Promise<ActionState>;
}) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {documents.length === 0
            ? "Aucun document."
            : `${documents.length} document${documents.length > 1 ? "s" : ""} dans lesquels SOFIA peut chercher une réponse.`}
        </p>
        {canEdit ? (
          <EntryDialog title="Nouveau document" description="Un texte de référence que SOFIA consulte quand elle en a besoin." addLabel="Ajouter un document" wide>
            {(close) => (
              <EntryForm action={createAction} submitLabel="Ajouter le document" onSuccess={close}>
                {(state) => <DocumentFields state={state} />}
              </EntryForm>
            )}
          </EntryDialog>
        ) : null}
      </div>

      {documents.length === 0 ? (
        <EmptyEntries icon={FileTextIcon} title="Vos textes de référence">
          Politique d&apos;annulation détaillée, déroulé d&apos;un protocole, conditions des cartes cadeaux… SOFIA ne cite que ce qui y est écrit, et passe
          la main à votre équipe si la réponse n&apos;y est pas.
        </EmptyEntries>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {documents.map((document) => (
            <li key={document.id} className="flex items-start gap-3 px-4 py-3.5">
              <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{document.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">{document.content}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {document.content.length.toLocaleString("fr-FR")} caractères · {document.chunkCount} passage{document.chunkCount > 1 ? "s" : ""} ·{" "}
                  {document.updatedLabel}
                </p>
              </div>
              {canEdit ? (
                <div className="flex shrink-0 items-center">
                  <EntryDialog title="Modifier le document" editLabel={`Modifier « ${document.title} »`} wide>
                    {(close) => (
                      <EntryForm action={updateAction.bind(null, document.id)} submitLabel="Enregistrer" onSuccess={close}>
                        {(state) => <DocumentFields state={state} document={document} />}
                      </EntryForm>
                    )}
                  </EntryDialog>
                  <DeleteEntryButton
                    label={`Supprimer « ${document.title} »`}
                    title="Supprimer ce document ?"
                    description="SOFIA n'y cherchera plus de réponses."
                    onConfirm={() => deleteAction(document.id)}
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
