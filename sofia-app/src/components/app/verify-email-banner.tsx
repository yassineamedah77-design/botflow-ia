"use client";

import { MailWarningIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/forms/action-state";

export function VerifyEmailBanner({ email, action }: { email: string; action: () => Promise<ActionState> }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="border-b border-warning/20 bg-warning-soft px-4 py-2.5 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 text-sm text-warning sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <MailWarningIcon className="size-4 shrink-0" aria-hidden />
          <span>
            Confirmez votre adresse <strong className="font-semibold">{email}</strong> pour sécuriser votre compte.
          </span>
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          className="self-start border-warning/30 bg-transparent text-warning hover:bg-warning/10 hover:text-warning sm:self-auto"
          onClick={() =>
            startTransition(async () => {
              const result = await action();
              if (result.status === "success") toast.success(result.message ?? "Email envoyé.");
              else if (result.status === "error") toast.error(result.message);
            })
          }
        >
          Renvoyer l&apos;email
        </Button>
      </div>
    </div>
  );
}
