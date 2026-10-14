import { CheckIcon, ClockIcon } from "lucide-react";
import type * as React from "react";

import { Card, CardContent } from "@/components/ui/card";

import { PageHeader } from "./page-header";

/**
 * Page of a module that is not delivered yet. It states plainly what the
 * module will do and when — no fake buttons, no sample data posing as real.
 */
export function ModulePlaceholder({
  title,
  description,
  phase,
  capabilities,
  children,
}: {
  title: string;
  description: string;
  phase: number;
  capabilities: string[];
  children?: React.ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card size="lg" className="overflow-visible">
        <CardContent className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sand px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              <ClockIcon className="size-3.5" aria-hidden />
              Disponible en phase {phase}
            </span>
            <h2 className="mt-4 text-xl font-semibold">Ce module est en cours de construction</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Il n&apos;affiche pas de données fictives : il s&apos;activera ici, sur les vraies données de votre
              établissement, dès sa livraison.
            </p>
            {children ? <div className="mt-5">{children}</div> : null}
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-5">
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Ce qu&apos;il fera</p>
            <ul className="mt-3 space-y-2.5">
              {capabilities.map((capability) => (
                <li key={capability} className="flex items-start gap-2.5 text-sm leading-relaxed">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-sofia" aria-hidden />
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
