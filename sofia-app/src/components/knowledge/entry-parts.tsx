"use client";

import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type * as React from "react";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

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
import { idleState, type ActionState } from "@/lib/forms/action-state";

/*
 * Building blocks shared by the knowledge base managers: a dialog holding a
 * create or edit form, a confirmed delete, an empty state.
 */

export type EntryAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** A form wired to a server action; closes its dialog once saved. */
export function EntryForm({
  action,
  submitLabel,
  onSuccess,
  children,
}: {
  action: EntryAction;
  submitLabel: string;
  onSuccess: () => void;
  children: (state: ActionState) => React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, idleState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Enregistré.");
      onSuccess();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="grid gap-5">
      <FormMessage state={state.status === "error" ? state : idleState} />
      {children(state)}
      <div className="flex justify-end border-t border-border pt-5">
        <SubmitButton pendingLabel="Enregistrement…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function EntryDialog({
  title,
  description,
  addLabel,
  editLabel,
  wide,
  children,
}: {
  title: string;
  description?: string;
  /** Shown on the trigger of a create dialog. */
  addLabel?: string;
  /** Accessible name of the pencil trigger of an edit dialog. */
  editLabel?: string;
  wide?: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // A fresh form (and fresh action state) each time the dialog opens.
  const [generation, setGeneration] = useState(0);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setGeneration((value) => value + 1);
      }}
    >
      <DialogTrigger asChild>
        {editLabel ? (
          <Button variant="ghost" size="icon" aria-label={editLabel}>
            <PencilIcon aria-hidden />
          </Button>
        ) : (
          <Button>
            <PlusIcon aria-hidden />
            {addLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={wide ? "max-h-[92dvh] overflow-y-auto sm:max-w-3xl" : "max-h-[92dvh] overflow-y-auto sm:max-w-2xl"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div key={generation}>{children(close)}</div>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteEntryButton({
  label,
  title,
  description,
  confirmLabel = "Supprimer",
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<ActionState>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : <Trash2Icon aria-hidden />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                const result = await onConfirm();
                if (result.status === "success") toast.success(result.message ?? "Supprimé.");
                else if (result.status === "error") toast.error(result.message);
              })
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function EmptyEntries({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-input bg-muted/30 px-6 py-10 text-center">
      <Icon className="mx-auto size-6 text-sofia" aria-hidden />
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[0.8125rem] leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

export interface ServiceOption {
  id: string;
  name: string;
}
