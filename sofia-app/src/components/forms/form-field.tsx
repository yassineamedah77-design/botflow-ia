import { cn } from "cn";
import type * as React from "react";

import { Label } from "@/components/ui/label";

/**
 * Label + control + hint + error, wired for accessibility: the control is
 * described by the hint and the error, and marked invalid when there is one.
 */
export function FormField({
  id,
  label,
  error,
  hint,
  action,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  /** Right-aligned element on the label row (e.g. "Mot de passe oublié ?"). */
  action?: React.ReactNode;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid content-start gap-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error ? (
        <p id={hintId} className="text-[0.8125rem] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-[0.8125rem] leading-relaxed font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
