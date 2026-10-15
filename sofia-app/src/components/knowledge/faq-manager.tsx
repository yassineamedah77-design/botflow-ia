"use client";

import { MessagesSquareIcon } from "lucide-react";
import { useState } from "react";

import { FormField } from "@/components/forms/form-field";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fieldError, submittedValue, type ActionState } from "@/lib/forms/action-state";
import { LANGUAGE_LABELS, type SupportedLanguage } from "@/lib/validation/organization";

import { DeleteEntryButton, EmptyEntries, EntryDialog, EntryForm, type EntryAction, type ServiceOption } from "./entry-parts";

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  language: string;
  serviceId: string | null;
  serviceName: string | null;
}

const GENERAL = "general";

function FaqFields({ state, faq, languages, services }: { state: ActionState; faq?: FaqRow; languages: SupportedLanguage[]; services: ServiceOption[] }) {
  const value = (field: string, fallback: string) => submittedValue(state, field, fallback);
  const [language, setLanguage] = useState(value("language", faq?.language ?? languages[0] ?? "fr"));
  const [serviceId, setServiceId] = useState(value("serviceId", faq?.serviceId ?? "") || GENERAL);
  return (
    <>
      <FormField id="faq-question" label="Question" error={fieldError(state, "question")} hint="Telle qu'une cliente la poserait.">
        {(props) => <Input {...props} name="question" defaultValue={value("question", faq?.question ?? "")} maxLength={300} required />}
      </FormField>
      <FormField id="faq-answer" label="Réponse" error={fieldError(state, "answer")} hint="SOFIA s'appuie sur cette réponse, sans rien y ajouter.">
        {(props) => <Textarea {...props} name="answer" defaultValue={value("answer", faq?.answer ?? "")} rows={5} maxLength={2000} required />}
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="faq-language" label="Langue" error={fieldError(state, "language")}>
          {(props) => (
            <>
              <input type="hidden" name="language" value={language} />
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id={props.id} aria-invalid={props["aria-invalid"]} aria-describedby={props["aria-describedby"]} className="h-10 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((code) => (
                    <SelectItem key={code} value={code}>
                      {LANGUAGE_LABELS[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </FormField>
        <FormField id="faq-service" label="Concerne" error={fieldError(state, "serviceId")}>
          {(props) => (
            <>
              <input type="hidden" name="serviceId" value={serviceId === GENERAL ? "" : serviceId} />
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger id={props.id} aria-invalid={props["aria-invalid"]} aria-describedby={props["aria-describedby"]} className="h-10 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENERAL}>Tout l&apos;établissement</SelectItem>
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
      </div>
    </>
  );
}

export function FaqManager({
  faqs,
  services,
  languages,
  canEdit,
  createAction,
  updateAction,
  deleteAction,
}: {
  faqs: FaqRow[];
  services: ServiceOption[];
  languages: SupportedLanguage[];
  canEdit: boolean;
  createAction: EntryAction;
  updateAction: (faqId: string, state: ActionState, formData: FormData) => Promise<ActionState>;
  deleteAction: (faqId: string) => Promise<ActionState>;
}) {
  const multilingual = languages.length > 1;
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {faqs.length === 0 ? "Aucune question pour l'instant." : `${faqs.length} question${faqs.length > 1 ? "s" : ""} connue${faqs.length > 1 ? "s" : ""} de SOFIA.`}
          {multilingual ? " Une réponse écrite dans une langue sert aussi dans les autres : SOFIA la traduit fidèlement." : ""}
        </p>
        {canEdit ? (
          <EntryDialog title="Nouvelle question" description="SOFIA répondra avec ces informations, et seulement celles-ci." addLabel="Ajouter une question">
            {(close) => (
              <EntryForm action={createAction} submitLabel="Ajouter la question" onSuccess={close}>
                {(state) => <FaqFields state={state} languages={languages} services={services} />}
              </EntryForm>
            )}
          </EntryDialog>
        ) : null}
      </div>

      {faqs.length === 0 ? (
        <EmptyEntries icon={MessagesSquareIcon} title="Les questions qu'on vous pose tout le temps">
          Parking, moyens de paiement, cartes cadeaux, délai entre deux séances… Chaque réponse ajoutée ici évite à SOFIA de passer la main à votre équipe.
        </EmptyEntries>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {faqs.map((faq) => (
            <li key={faq.id} className="flex items-start gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{faq.question}</p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed whitespace-pre-line text-muted-foreground">{faq.answer}</p>
                <p className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="muted">{faq.serviceName ?? "Tout l'établissement"}</Badge>
                  {multilingual ? <Badge variant="outline">{LANGUAGE_LABELS[faq.language as SupportedLanguage] ?? faq.language}</Badge> : null}
                </p>
              </div>
              {canEdit ? (
                <div className="flex shrink-0 items-center">
                  <EntryDialog title="Modifier la question" editLabel={`Modifier « ${faq.question} »`}>
                    {(close) => (
                      <EntryForm action={updateAction.bind(null, faq.id)} submitLabel="Enregistrer" onSuccess={close}>
                        {(state) => <FaqFields state={state} faq={faq} languages={languages} services={services} />}
                      </EntryForm>
                    )}
                  </EntryDialog>
                  <DeleteEntryButton
                    label={`Supprimer « ${faq.question} »`}
                    title="Supprimer cette question ?"
                    description="SOFIA ne s'appuiera plus sur cette réponse. Une question qu'elle ne sait pas traiter est transmise à votre équipe."
                    onConfirm={() => deleteAction(faq.id)}
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
