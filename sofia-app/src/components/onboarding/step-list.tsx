import { cn } from "cn";
import { CheckIcon } from "lucide-react";
import Link from "next/link";

import { ONBOARDING_STEPS, SETUP_ITEMS, type OnboardingSlug, type SetupChecklistState } from "@/lib/onboarding";

/** Phase of a step whose feature is not built yet. */
export function stepPhase(slug: OnboardingSlug): number | undefined {
  if (slug === "test") return 3;
  return SETUP_ITEMS.find((item) => item.step === slug)?.phase;
}

export function stepDone(slug: OnboardingSlug, state: SetupChecklistState): boolean {
  const item = SETUP_ITEMS.find((candidate) => candidate.step === slug);
  return item ? state[item.key] : false;
}

/** The ten steps, with their real state: done, current, or waiting for a later phase. */
export function StepList({ current, state }: { current: OnboardingSlug; state: SetupChecklistState }) {
  return (
    <nav aria-label="Étapes de la mise en route">
      <ol className="space-y-1">
        {ONBOARDING_STEPS.map((step, index) => {
          const done = stepDone(step.slug, state);
          const phase = stepPhase(step.slug);
          const active = step.slug === current;
          return (
            <li key={step.slug}>
              <Link
                href={`/onboarding/${step.slug}`}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2.5 py-2 text-[0.8125rem] transition-colors outline-none hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/40",
                  active ? "bg-card font-semibold text-foreground shadow-xs ring-1 ring-border" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-semibold tabular-nums",
                    done ? "border-success bg-success text-white" : active ? "border-foreground text-foreground" : "border-input",
                  )}
                  aria-hidden
                >
                  {done ? <CheckIcon className="size-3" strokeWidth={3} /> : index + 1}
                </span>
                <span className="flex-1 truncate">{step.title}</span>
                {phase && !done ? <span className="text-[0.6875rem] font-normal text-muted-foreground">Phase {phase}</span> : null}
                <span className="sr-only">{done ? "(terminé)" : phase ? `(disponible en phase ${phase})` : ""}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
