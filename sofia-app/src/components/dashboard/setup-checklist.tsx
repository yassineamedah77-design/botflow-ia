import { cn } from "cn";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SETUP_ITEMS, setupProgress, type SetupChecklistState } from "@/lib/onboarding";

/** Onboarding checklist (specification §15), computed from real data only. */
export function SetupChecklist({ state, className }: { state: SetupChecklistState; className?: string }) {
  const { done, total } = setupProgress(state);
  const percent = Math.round((done / total) * 100);

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Checklist</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {done}/{total}
        </p>
      </div>
      <Progress value={percent} className="mt-2 h-1.5" aria-label={`Progression : ${percent} %`} />
      <ol className="mt-4 space-y-2.5">
        {SETUP_ITEMS.map((item) => {
          const checked = state[item.key];
          return (
            <li key={item.key} className="flex items-center gap-2.5 text-[0.8125rem]">
              <span
                className={cn(
                  "flex size-4.5 shrink-0 items-center justify-center rounded-full border",
                  checked ? "border-success bg-success text-white" : "border-input bg-card",
                )}
                aria-hidden
              >
                {checked ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
              </span>
              <Link
                href={`/onboarding/${item.step}`}
                className={cn("flex-1 underline-offset-4 hover:underline", checked ? "text-foreground" : "text-muted-foreground")}
              >
                {item.label}
                <span className="sr-only">{checked ? " — terminé" : " — à faire"}</span>
              </Link>
              {item.phase && !checked ? <span className="text-[0.6875rem] text-muted-foreground">Phase {item.phase}</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Compact progress card for the dashboard, until everything is set up. */
export function SetupProgress({ state }: { state: SetupChecklistState }) {
  const { done, total, next } = setupProgress(state);
  const percent = Math.round((done / total) * 100);
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
          style={{ background: `conic-gradient(var(--sofia) ${percent * 3.6}deg, var(--muted) 0deg)` }}
          aria-hidden
        >
          <span className="flex size-8.5 items-center justify-center rounded-full bg-card">
            {done}/{total}
          </span>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Mise en route de SOFIA</p>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
            {done} étape{done > 1 ? "s" : ""} sur {total} validée{done > 1 ? "s" : ""} d&apos;après votre configuration réelle.
            {next ? (
              <>
                {" "}
                Prochaine étape : <span className="font-medium text-foreground">{next.label}</span>
                {next.phase ? ` (disponible en phase ${next.phase})` : ""}.
              </>
            ) : null}
          </p>
        </div>
      </div>
      <Link href={next ? `/onboarding/${next.step}` : "/onboarding/welcome"} className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0" })}>
        Continuer la mise en route
        <ArrowRightIcon aria-hidden />
      </Link>
    </div>
  );
}
