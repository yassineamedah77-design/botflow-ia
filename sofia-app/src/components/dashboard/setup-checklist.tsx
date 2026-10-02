import { cn } from "cn";
import { ArrowUpRightIcon, CheckIcon } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  description: string;
  href?: string;
  /** Delivery phase of the feature that completes this step, when not built yet. */
  phase?: number;
}

/** Onboarding checklist (specification §15), computed from real data only. */
export function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((item) => item.done).length;
  const percent = Math.round((done / items.length) * 100);

  return (
    <Card size="lg">
      <CardHeader>
        <CardTitle className="text-base">Mise en route de SOFIA</CardTitle>
        <CardDescription>
          {done} étape{done > 1 ? "s" : ""} sur {items.length} terminée{done > 1 ? "s" : ""}. Chaque statut est calculé à
          partir de votre configuration réelle.
        </CardDescription>
        <Progress value={percent} className="mt-3 h-1.5" aria-label={`Progression : ${percent} %`} />
      </CardHeader>
      <CardContent>
        <ol className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.key} className="flex items-start gap-3.5 py-3.5 first:pt-1 last:pb-0">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                  item.done ? "border-success bg-success text-white" : "border-input bg-card",
                )}
                aria-hidden
              >
                {item.done ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", item.done ? "text-foreground" : "text-foreground")}>
                  {item.label}
                  <span className="sr-only">{item.done ? " — terminé" : " — à faire"}</span>
                </p>
                <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
              {item.phase && !item.done ? (
                <span className="mt-0.5 shrink-0 rounded-full bg-sand px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                  Phase {item.phase}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md text-[0.8125rem] font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Voir
                  <ArrowUpRightIcon className="size-3.5" aria-hidden />
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
