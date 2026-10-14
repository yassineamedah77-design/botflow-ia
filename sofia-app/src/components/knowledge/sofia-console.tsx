"use client";

import { cn } from "cn";
import {
  CalendarCheckIcon,
  CircleAlertIcon,
  HandIcon,
  Loader2Icon,
  RotateCcwIcon,
  SearchIcon,
  SendIcon,
  ShieldAlertIcon,
  SparklesIcon,
  UserRoundXIcon,
} from "lucide-react";
import * as React from "react";
import { useState, useTransition } from "react";

import type { ConsoleActionResult } from "@/app/(app)/knowledge/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ConsoleAnswer } from "@/server/services/sofia-console";

/*
 * The test console: the team plays a customer, SOFIA answers with the real
 * knowledge base. Under each answer: language, understood intent and the
 * action she would take. Nothing is sent, nothing is executed, and the
 * conversation disappears when the page is left.
 */

type Answered = Extract<ConsoleAnswer, { status: "answered" }>;

interface Turn {
  id: number;
  author: "customer" | "assistant";
  text: string;
  analysis?: Answered;
}

const INTENT_LABELS: Record<string, string> = {
  NEW_LEAD: "Premier contact",
  PRICE_REQUEST: "Demande de prix",
  SERVICE_INFORMATION: "Question sur une prestation",
  BOOKING_REQUEST: "Prise de rendez-vous",
  RESCHEDULE: "Déplacement de rendez-vous",
  CANCELLATION: "Annulation",
  FOLLOW_UP: "Réponse à une relance",
  NO_SHOW: "Rendez-vous manqué",
  COMPLAINT: "Réclamation",
  HUMAN_REQUEST: "Demande à parler à l'équipe",
  EXISTING_CLIENT: "Cliente habituelle",
  GENERAL_INFORMATION: "Information pratique",
  MEDICAL_QUESTION: "Question médicale",
};

const LEVEL_LABELS: Record<string, string> = { LOW: "Se renseigne", MEDIUM: "Intéressée", HIGH: "Veut venir", READY_TO_BOOK: "Prête à réserver" };
const LANGUAGE_LABELS: Record<string, string> = { fr: "Français", pt: "Português", en: "English" };

const HANDOFF_LABELS: Record<string, string> = {
  medical: "question médicale",
  complaint: "réclamation",
  price_unknown: "tarif à confirmer",
  human_request: "demande à parler à l'équipe",
  out_of_scope: "hors du cadre",
  manipulation: "message suspect",
  other: "à reprendre par l'équipe",
};

const DAY_LABELS: Record<string, string> = {
  monday: "lundi",
  tuesday: "mardi",
  wednesday: "mercredi",
  thursday: "jeudi",
  friday: "vendredi",
  saturday: "samedi",
  sunday: "dimanche",
};

function ActionLine({ analysis, serviceNames }: { analysis: Answered; serviceNames: Record<string, string> }) {
  const { action } = analysis;
  switch (action.type) {
    case "none":
      return null;
    case "handoff":
      return (
        <p className={cn("flex items-start gap-2 text-[0.8125rem]", action.urgency === "high" ? "text-destructive" : "text-warning")}>
          <HandIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-medium">
              Transmettrait à l&apos;équipe : {HANDOFF_LABELS[action.reason] ?? action.reason}
              {action.urgency === "high" ? " · urgent" : ""}
            </span>
            {/* A blocked reply is explained just below: no need to repeat the summary. */}
            {action.summary && !analysis.replaced ? <span className="block text-muted-foreground">{action.summary}</span> : null}
          </span>
        </p>
      );
    case "booking_request": {
      const days = action.preferredDays.length ? action.preferredDays.map((day) => DAY_LABELS[day] ?? day).join(", ") : "jours flexibles";
      const period = { morning: "le matin", afternoon: "l'après-midi", any: "à tout moment" }[action.period];
      return (
        <p className="flex items-start gap-2 text-[0.8125rem] text-success">
          <CalendarCheckIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-medium">Demande de rendez-vous : {serviceNames[action.serviceSlug] ?? action.serviceSlug}</span>
            <span className="block text-muted-foreground">
              {[`${action.firstName} ${action.lastName}`.trim(), `${days}, ${period}`, action.isNewClient === true ? "première visite" : action.isNewClient === false ? "déjà cliente" : null, action.email]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        </p>
      );
    }
    case "opt_out":
      return (
        <p className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
          <UserRoundXIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="font-medium">Désinscrirait la cliente de tout message marketing</span>
        </p>
      );
  }
}

function Analysis({ analysis, serviceNames }: { analysis: Answered; serviceNames: Record<string, string> }) {
  return (
    <div className="mt-2 grid gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <p className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{LANGUAGE_LABELS[analysis.language] ?? analysis.language}</Badge>
        <Badge variant={analysis.intent === "MEDICAL_QUESTION" ? "destructive" : "muted"}>{INTENT_LABELS[analysis.intent] ?? analysis.intent}</Badge>
        <Badge variant="muted">{LEVEL_LABELS[analysis.intentLevel] ?? analysis.intentLevel}</Badge>
      </p>
      <ActionLine analysis={analysis} serviceNames={serviceNames} />
      {analysis.searches.length > 0 ? (
        <p className="flex items-start gap-2 text-[0.8125rem] text-muted-foreground">
          <SearchIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            A cherché dans vos documents :{" "}
            {analysis.searches.map((search) => `« ${search.query} » (${search.hits} passage${search.hits > 1 ? "s" : ""})`).join(", ")}
          </span>
        </p>
      ) : null}
      {analysis.replaced ? (
        <div className="flex items-start gap-2 text-[0.8125rem] text-destructive">
          <ShieldAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Réponse bloquée par un garde-fou : elle contenait {analysis.violations.join(", ")}.</p>
            <p className="text-muted-foreground">La cliente aurait reçu le message neutre ci-dessus, et l&apos;équipe aurait été prévenue.</p>
            {analysis.originalReply ? (
              <details className="mt-1 text-muted-foreground">
                <summary className="cursor-pointer">Voir la réponse bloquée</summary>
                <p className="mt-1 whitespace-pre-line">{analysis.originalReply}</p>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}
      {analysis.adjustments.length > 0 ? <p className="text-[0.8125rem] text-muted-foreground">Correction automatique : {analysis.adjustments.join(", ")}.</p> : null}
      <p className="text-xs text-muted-foreground/80">
        {analysis.model}
        {analysis.usedFallback ? " (modèle de secours)" : ""} · {(analysis.latencyMs / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s
      </p>
    </div>
  );
}

export function SofiaConsole({
  assistantName,
  suggestions,
  serviceNames,
  available,
  simulated,
  send,
}: {
  assistantName: string;
  suggestions: string[];
  /** slug → name, to show booking requests in words. */
  serviceNames: Record<string, string>;
  /** False when no model is configured on this deployment. */
  available: boolean;
  /** True in the automated tests: fixed answers, no model. */
  simulated: boolean;
  send: (transcript: Array<{ author: "customer" | "assistant"; text: string }>) => Promise<ConsoleActionResult>;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nextId = React.useRef(1);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, pending]);

  function submit(text: string) {
    const message = text.trim();
    if (!message || pending || !available) return;
    const customerTurn: Turn = { id: nextId.current++, author: "customer", text: message };
    const transcript = [...turns, customerTurn];
    setTurns(transcript);
    setDraft("");
    setError(null);
    startTransition(async () => {
      const result = await send(transcript.map(({ author, text: body }) => ({ author, text: body })));
      if (result.status === "answered") {
        setTurns((current) => [...current, { id: nextId.current++, author: "assistant", text: result.reply, analysis: result }]);
      } else {
        setError(result.message);
        // The message stays in the conversation: it can be sent again.
        setTurns((current) => current.filter((turn) => turn.id !== customerTurn.id));
        setDraft(message);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section aria-label="Conversation de test" className="flex min-h-[32rem] flex-col rounded-xl border border-border bg-card shadow-xs">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-sofia-soft text-sofia-strong">
              <SparklesIcon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium">{assistantName}</p>
              <p className="text-xs text-muted-foreground">Conversation de test : rien n&apos;est envoyé</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setTurns([])} disabled={turns.length === 0 || pending}>
            <RotateCcwIcon aria-hidden />
            Recommencer
          </Button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-live="polite">
          {turns.length === 0 ? (
            <p className="mx-auto max-w-sm py-10 text-center text-sm leading-relaxed text-muted-foreground">
              Écrivez comme une cliente le ferait. {assistantName} répond avec votre Knowledge Base actuelle, et vous voyez ce qu&apos;elle a compris.
            </p>
          ) : null}
          {turns.map((turn) =>
            turn.author === "customer" ? (
              <div key={turn.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm whitespace-pre-line text-primary-foreground">{turn.text}</p>
              </div>
            ) : (
              <div key={turn.id} className="max-w-[92%]">
                <p className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm whitespace-pre-line text-foreground" data-testid="sofia-reply">
                  {turn.text}
                </p>
                {turn.analysis ? <Analysis analysis={turn.analysis} serviceNames={serviceNames} /> : null}
              </div>
            ),
          )}
          {pending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
              {assistantName} rédige sa réponse…
            </p>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          className="border-t border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit(draft);
          }}
        >
          {error ? (
            <Alert variant="destructive" className="mb-3">
              <CircleAlertIcon aria-hidden />
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex items-end gap-2">
            <label htmlFor="sofia-console-input" className="sr-only">
              Message de la cliente
            </label>
            <Textarea
              id="sofia-console-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(draft);
                }
              }}
              placeholder={available ? "Écrivez comme une cliente…" : "Indisponible : modèle non configuré"}
              rows={2}
              maxLength={2000}
              disabled={!available}
              className="min-h-11 resize-none"
            />
            <Button type="submit" size="icon" aria-label="Envoyer" disabled={!available || pending || !draft.trim()}>
              {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : <SendIcon aria-hidden />}
            </Button>
          </div>
        </form>
      </section>

      <aside className="grid content-start gap-4">
        {!available ? (
          <Alert variant="warning">
            <CircleAlertIcon aria-hidden />
            <AlertTitle>Modèle d&apos;IA non configuré</AlertTitle>
            <AlertDescription>
              SOFIA a besoin d&apos;une clé API Anthropic sur le serveur pour répondre. Tant qu&apos;elle manque, aucune cliente ne reçoit de réponse
              automatique : votre équipe garde la main.
            </AlertDescription>
          </Alert>
        ) : null}
        {simulated ? (
          <Alert variant="info">
            <CircleAlertIcon aria-hidden />
            <AlertDescription>Mode de test automatique : réponses fixes, aucun modèle n&apos;est appelé.</AlertDescription>
          </Alert>
        ) : null}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-sm font-medium">Essayez par exemple</p>
          <ul className="mt-3 grid gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => submit(suggestion)}
                  disabled={!available || pending}
                  className="w-full rounded-lg border border-border px-3 py-2 text-left text-[0.8125rem] leading-snug text-muted-foreground transition-colors hover:border-input hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
          Une réponse ne vous convient pas ? Complétez la Knowledge Base (prestations, FAQ, documents) et reposez la question : SOFIA ne sait que ce
          que vous lui avez appris.
        </p>
      </aside>
    </div>
  );
}
