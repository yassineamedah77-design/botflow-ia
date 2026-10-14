"use client";

import { CircleCheckIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import type * as React from "react";

import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { idleState, type ActionState } from "@/lib/forms/action-state";

/**
 * One-click confirmation for links received by email. The token is only
 * consumed when the person presses the button (a POST), never on page load:
 * email security scanners that open links cannot use it up.
 */
export function ConfirmTokenForm({
  action,
  token,
  label,
  successLink,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  token: string;
  label: string;
  successLink?: { href: string; label: React.ReactNode };
}) {
  const [state, formAction] = useActionState(action, idleState);

  if (state.status === "success") {
    return (
      <div className="grid gap-6">
        <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success-soft p-4 text-sm font-medium text-success" role="status">
          <CircleCheckIcon className="size-5 shrink-0" aria-hidden />
          {state.message}
        </div>
        {successLink ? (
          <Link
            href={successLink.href}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-[0.9375rem] font-medium text-primary-foreground transition-colors hover:bg-primary/88"
          >
            {successLink.label}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-5">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <SubmitButton size="xl" className="w-full" pendingLabel="Confirmation…">
        {label}
      </SubmitButton>
    </form>
  );
}
