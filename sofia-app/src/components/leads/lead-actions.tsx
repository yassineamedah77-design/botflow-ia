"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addLeadNoteAction,
  assignLeadAction,
  changeLeadStatusAction,
  createLeadAction,
  deleteLeadAction,
  deleteLeadNoteAction,
  updateLeadAction,
} from "@/app/(app)/leads/actions";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_STATUSES, LEAD_STATUS_META, type LeadStatus } from "@/lib/crm";
import { formatRelativeTime } from "@/lib/format";
import { fieldError, idleState, type ActionState } from "@/lib/forms/action-state";

import { EMPTY_LEAD, LeadForm, type LeadFormDefaults } from "./lead-form";

type Option = { id: string; name: string };

function report(result: ActionState) {
  if (result.status === "success") toast.success(result.message ?? "Fait.");
  else if (result.status === "error") toast.error(result.message);
}

export function NewLeadDialog({ services, members }: { services: Option[]; members: Option[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon aria-hidden />
          Nouveau contact
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouveau contact</DialogTitle>
          <DialogDescription>Un appel, une recommandation, une visite à l&apos;institut : ajoutez la personne au CRM.</DialogDescription>
        </DialogHeader>
        <LeadForm action={createLeadAction} defaults={EMPTY_LEAD} services={services} members={members} submitLabel="Créer le contact" />
      </DialogContent>
    </Dialog>
  );
}

export function EditLeadDialog({
  leadId,
  defaults,
  services,
  members,
  optedOut,
}: {
  leadId: string;
  defaults: LeadFormDefaults;
  services: Option[];
  members: Option[];
  optedOut: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PencilIcon aria-hidden />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier la fiche</DialogTitle>
          <DialogDescription>Coordonnées, prestation recherchée, valeur et consentement.</DialogDescription>
        </DialogHeader>
        <LeadForm
          action={updateLeadAction.bind(null, leadId)}
          defaults={defaults}
          services={services}
          members={members}
          optedOut={optedOut}
          submitLabel="Enregistrer"
          onSuccess={close}
        />
      </DialogContent>
    </Dialog>
  );
}

export function LeadStatusSelect({ leadId, status, disabled }: { leadId: string; status: LeadStatus; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={disabled || pending}
      onValueChange={(next) => startTransition(async () => report(await changeLeadStatusAction(leadId, next)))}
    >
      <SelectTrigger className="h-10 w-[12.5rem] bg-card" aria-label="Étape du pipeline">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEAD_STATUSES.map((option) => (
          <SelectItem key={option} value={option}>
            {LEAD_STATUS_META[option].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const UNASSIGNED = "none";

export function LeadAssigneeSelect({ leadId, assigneeId, members, disabled }: { leadId: string; assigneeId: string | null; members: Option[]; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={assigneeId ?? UNASSIGNED}
      disabled={disabled || pending}
      onValueChange={(next) => startTransition(async () => report(await assignLeadAction(leadId, next === UNASSIGNED ? "" : next)))}
    >
      <SelectTrigger className="h-10 w-[11rem] bg-card" aria-label="Assigné à">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Non assigné</SelectItem>
        {members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DeleteLeadButton({ leadId, name }: { leadId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-10 text-destructive hover:bg-danger-soft hover:text-destructive" aria-label="Supprimer le contact" title="Supprimer le contact">
          <Trash2Icon aria-hidden />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer {name} ?</AlertDialogTitle>
          <AlertDialogDescription>
            La fiche, ses conversations, ses notes, ses rendez-vous et le chiffre d&apos;affaires attribué seront définitivement effacés. C&apos;est
            aussi la façon de répondre à une demande d&apos;effacement RGPD.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await deleteLeadAction(leadId);
                if (result.status === "error") toast.error(result.message);
              });
            }}
          >
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface NoteItem {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string | null;
  canDelete: boolean;
}

export function LeadNotes({ leadId, notes, now, canWrite }: { leadId: string; notes: NoteItem[]; now: Date; canWrite: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await addLeadNoteAction(previous, formData);
    if (result.status === "success") formRef.current?.reset();
    return result;
  }, idleState);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (state.status === "success") toast.success(state.message ?? "Note ajoutée.");
  }, [state]);

  return (
    <div className="grid gap-4">
      {canWrite ? (
        <form ref={formRef} action={formAction} className="grid gap-2">
          <input type="hidden" name="leadId" value={leadId} />
          <label htmlFor="note-body" className="sr-only">
            Nouvelle note
          </label>
          <Textarea
            id="note-body"
            name="body"
            rows={3}
            maxLength={2000}
            placeholder="Préférences, informations utiles pour l'équipe…"
            aria-invalid={fieldError(state, "body") ? true : undefined}
          />
          {state.status === "error" ? <FormMessage state={state} /> : null}
          <div className="flex justify-end">
            <SubmitButton size="sm" pendingLabel="Ajout…">
              Ajouter la note
            </SubmitButton>
          </div>
        </form>
      ) : null}
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune note pour l&apos;instant.</p>
      ) : (
        <ul className="grid gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-border bg-background/60 px-4 py-3">
              <p className="text-sm leading-relaxed whitespace-pre-line">{note.body}</p>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {note.authorName ?? "SOFIA"} · {formatRelativeTime(note.createdAt, now)}
                </span>
                {note.canDelete ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground"
                    disabled={pending}
                    onClick={() => startTransition(async () => report(await deleteLeadNoteAction(leadId, note.id)))}
                  >
                    Supprimer
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
