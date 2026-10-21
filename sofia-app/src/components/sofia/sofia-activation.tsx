"use client";

import { cn } from "cn";
import { CheckCircle2Icon, CircleDashedIcon, GlobeIcon, PauseIcon, PlayIcon, PowerIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionState } from "@/lib/forms/action-state";

/*
 * SOFIA's on/off switch (settings and onboarding step 10): her status, what
 * is still missing before she can answer, and the action that fits.
 */

export interface ActivationCheck {
  key: string;
  label: string;
  ok: boolean;
  href: string | null;
}

const STATUS = {
  ACTIVE: {
    title: "SOFIA est active",
    description: "Elle répond à vos clientes 24 h/24 sur vos canaux connectés, et passe la main à l'équipe dès que c'est nécessaire.",
    dot: "bg-success",
  },
  PAUSED: {
    title: "SOFIA est en pause",
    description: "Aucune réponse automatique n'est envoyée. Les messages arrivent dans l'inbox et votre équipe répond seule.",
    dot: "bg-warning",
  },
  INACTIVE: {
    title: "SOFIA n'est pas encore activée",
    description: "Les messages reçus arrivent dans l'inbox et votre équipe y répond. Activez SOFIA quand sa configuration est prête.",
    dot: "bg-sand-strong",
  },
} as const;

export function SofiaActivation({
  status,
  checks,
  canToggle,
  widget,
  action,
}: {
  status: "INACTIVE" | "ACTIVE" | "PAUSED";
  checks: ActivationCheck[];
  canToggle: boolean;
  widget: { connected: boolean; seenOn: string | null };
  action: (target: "ACTIVE" | "PAUSED") => Promise<ActionState>;
}) {
  const [pending, startTransition] = useTransition();
  const ready = checks.every((check) => check.ok);
  const copy = STATUS[status];

  function run(target: "ACTIVE" | "PAUSED") {
    startTransition(async () => {
      const result = await action(target);
      if (result.status === "success") toast.success(result.message);
      if (result.status === "error") toast.error(result.message);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="relative mt-1.5 flex size-2.5 shrink-0">
            {status === "ACTIVE" ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/50 motion-reduce:animate-none" /> : null}
            <span className={cn("relative inline-flex size-2.5 rounded-full", copy.dot)} />
          </span>
          <div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription className="mt-1 max-w-xl">{copy.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div>
          <p className="mb-3 text-sm font-medium">Avant de répondre, SOFIA a besoin de</p>
          <ul className="grid gap-2.5">
            {checks.map((check) => (
              <li key={check.key} className="flex items-start gap-3 text-sm">
                {check.ok ? (
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" aria-label="Fait" />
                ) : (
                  <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="À faire" />
                )}
                <span className={cn(check.ok ? "text-foreground" : "text-muted-foreground")}>
                  {check.label}
                  {!check.ok && check.href ? (
                    <>
                      {" · "}
                      <Link href={check.href} className="font-medium text-foreground underline underline-offset-4 hover:no-underline">
                        Compléter
                      </Link>
                    </>
                  ) : null}
                  {!check.ok && check.key === "ai" ? (
                    <span className="block text-[0.8125rem]">BotFlow IA branche le modèle d&apos;IA de votre compte : rien à faire de votre côté.</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <GlobeIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="leading-relaxed text-muted-foreground">
            {widget.connected ? (
              <>
                Widget installé sur <span className="font-medium text-foreground">{widget.seenOn}</span>. SOFIA y répond dès qu&apos;elle est active.
              </>
            ) : (
              <>
                Le widget n&apos;est pas encore installé sur votre site.{" "}
                <Link href="/channels/website" className="font-medium text-foreground underline underline-offset-4 hover:no-underline">
                  L&apos;installer
                </Link>{" "}
                : SOFIA y répondra dès qu&apos;il sera en place.
              </>
            )}
          </p>
        </div>

        {canToggle ? (
          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
              {status === "ACTIVE"
                ? "La pause est immédiate et vous la levez quand vous voulez."
                : ready
                  ? "Tout est prêt. Vous pourrez mettre SOFIA en pause à tout moment."
                  : "Complétez les points ci-dessus pour pouvoir activer SOFIA."}
            </p>
            {status === "ACTIVE" ? (
              <Button variant="outline" onClick={() => run("PAUSED")} disabled={pending} className="shrink-0">
                <PauseIcon aria-hidden />
                Mettre SOFIA en pause
              </Button>
            ) : (
              <Button onClick={() => run("ACTIVE")} disabled={pending || !ready} className="shrink-0">
                {status === "PAUSED" ? <PlayIcon aria-hidden /> : <PowerIcon aria-hidden />}
                {status === "PAUSED" ? "Reprendre SOFIA" : "Activer SOFIA"}
              </Button>
            )}
          </div>
        ) : (
          <p className="border-t border-border pt-5 text-[0.8125rem] text-muted-foreground">
            Seuls les propriétaires et administrateurs peuvent activer SOFIA ou la mettre en pause.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
