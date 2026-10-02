"use client";

import { UserPlusIcon } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/forms/action-state";

function notify(result: ActionState) {
  if (result.status === "success") toast.success(result.message ?? "Fait.");
  else if (result.status === "error") toast.error(result.message);
}

export function InviteMemberDialog({
  action,
  roles,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  roles: Role[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result.status !== "success") return result;
    toast.success(result.message ?? "Invitation envoyée.");
    // Closing unmounts the form, so the next invitation starts from a blank form.
    setOpen(false);
    return idleState;
  }, idleState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon aria-hidden />
          Inviter un membre
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="grid gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>Inviter un membre</DialogTitle>
            <DialogDescription>Un email avec un lien personnel valable 7 jours sera envoyé.</DialogDescription>
          </DialogHeader>
          {state.status === "error" ? <FormMessage state={state} /> : null}
          <FormField id="invite-email" label="Email" error={fieldError(state, "email")}>
            {(props) => (
              <Input
                {...props}
                name="email"
                type="email"
                autoComplete="off"
                placeholder="prenom@etablissement.fr"
                defaultValue={submittedValue(state, "email")}
                required
                autoFocus
              />
            )}
          </FormField>
          <FormField id="invite-role" label="Rôle" error={fieldError(state, "role")}>
            {(props) => (
              <Select name="role" defaultValue={submittedValue(state, "role", roles.includes("STAFF") ? "STAFF" : roles[0])}>
                <SelectTrigger id={props.id} className="h-10 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      <span className="flex flex-col items-start">
                        <span>{ROLE_LABELS[role]}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <ul className="grid gap-1.5 rounded-lg bg-muted/60 p-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
            {roles.map((role) => (
              <li key={role}>
                <span className="font-medium text-foreground">{ROLE_LABELS[role]}</span> : {ROLE_DESCRIPTIONS[role]}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <SubmitButton pendingLabel="Envoi…">Envoyer l&apos;invitation</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MemberRoleSelect({
  membershipId,
  role,
  roles,
  action,
  label,
}: {
  membershipId: string;
  role: Role;
  roles: Role[];
  action: (membershipId: string, role: string) => Promise<ActionState>;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={role}
      disabled={pending}
      onValueChange={(value) => startTransition(async () => notify(await action(membershipId, value)))}
    >
      <SelectTrigger className="h-8 w-40 bg-card" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roles.map((option) => (
          <SelectItem key={option} value={option}>
            {ROLE_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ConfirmActionButton({
  action,
  triggerLabel,
  title,
  description,
  confirmLabel,
  variant = "ghost",
}: {
  action: () => Promise<ActionState>;
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "ghost" | "outline" | "destructive";
}) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={variant} disabled={pending}>
          {triggerLabel}
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
            variant="destructive"
            onClick={() => startTransition(async () => notify(await action()))}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function InlineActionButton({ action, label }: { action: () => Promise<ActionState>; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(async () => notify(await action()))}>
      {label}
    </Button>
  );
}
