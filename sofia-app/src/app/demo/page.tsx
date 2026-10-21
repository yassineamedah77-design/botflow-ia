import { ArrowRightIcon, CircleAlertIcon, LayoutDashboardIcon, MessageCircleIcon, SparklesIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandPanel } from "@/components/auth/brand-panel";
import { Logo } from "@/components/brand/logo";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentTenant } from "@/server/auth/dal";
import { isDemoMode } from "@/server/demo/sandbox";

import { startDemoAction } from "./actions";

export const metadata: Metadata = {
  title: "Démo de SOFIA",
  description: "Essayez SOFIA sur un institut de démonstration : son site web, ses conversations, son chiffre d'affaires récupéré.",
};

const STEPS = [
  {
    icon: MessageCircleIcon,
    title: "Écrivez à SOFIA comme une cliente",
    text: "Sur le site de l'institut, demandez un prix, un rendez-vous, posez une question délicate : SOFIA répond avec les vraies informations de l'établissement.",
  },
  {
    icon: LayoutDashboardIcon,
    title: "Passez de l'autre côté",
    text: "Dans le tableau de bord, votre conversation est déjà là : fiche cliente créée, intention comprise, équipe prévenue si besoin. Reprenez la main et répondez.",
  },
  {
    icon: SparklesIcon,
    title: "Explorez trois mois d'activité",
    text: "Chiffre d'affaires récupéré, pipeline de clientes, inbox WhatsApp et Instagram, réactivation des anciennes clientes, base de connaissances.",
  },
];

const ERRORS: Record<string, string> = {
  limite: "Trop de démonstrations ont été lancées depuis votre connexion aujourd'hui. Reprenez celle en cours, ou réessayez demain.",
  indisponible: "La démonstration n'a pas pu être préparée. Réessayez dans un instant.",
};

export default async function DemoPage({ searchParams }: PageProps<"/demo">) {
  if (!isDemoMode()) notFound();
  const { erreur } = await searchParams;
  const error = typeof erreur === "string" ? ERRORS[erreur] : undefined;

  const ongoing = (await getCurrentTenant())?.organization.isDemo ?? false;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      <div className="flex min-h-dvh flex-col px-5 py-7 sm:px-10 lg:px-14">
        <header>
          <Logo withTagline />
        </header>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[460px] animate-in duration-500 fade-in slide-in-from-bottom-2">
            <p className="text-xs font-semibold tracking-[0.2em] text-sofia-strong uppercase">Démonstration</p>
            <h1 className="mt-3 font-heading text-[2rem] leading-[1.15] font-semibold tracking-tight text-balance">
              Voyez SOFIA travailler pour un institut, en deux minutes.
            </h1>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted-foreground">
              Une copie privée de Maison Éclat, un institut fictif, vous attend : son site web avec SOFIA installée, et trois mois
              de clientes, de conversations et de chiffre d&apos;affaires.
            </p>

            {error ? (
              <Alert variant="destructive" className="mt-6">
                <CircleAlertIcon aria-hidden />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <ol className="mt-8 grid gap-5">
              {STEPS.map(({ icon: Icon, title, text }, index) => (
                <li key={title} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sofia-soft text-sofia-strong">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      {index + 1}. {title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-9 grid gap-3">
              {ongoing ? (
                <>
                  <Link href="/demo/institut" className={buttonVariants({ size: "lg" })}>
                    Reprendre ma démo
                    <ArrowRightIcon aria-hidden />
                  </Link>
                  <form action={startDemoAction}>
                    <SubmitButton variant="outline" size="lg" className="w-full" pendingLabel="Préparation de votre institut…">
                      Recommencer avec une copie neuve
                    </SubmitButton>
                  </form>
                </>
              ) : (
                <form action={startDemoAction}>
                  <SubmitButton size="lg" className="w-full" pendingLabel="Préparation de votre institut…">
                    Lancer ma démo
                    <ArrowRightIcon aria-hidden />
                  </SubmitButton>
                </form>
              )}
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Sans inscription. Données fictives, effacées après 24 heures. Aucun email ni message n&apos;est envoyé.
              </p>
            </div>
          </div>
        </main>
        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} BotFlow IA</span>
          <span aria-hidden>·</span>
          <a href="https://botflow-ia.fr" className="underline-offset-4 hover:underline">
            botflow-ia.fr
          </a>
        </footer>
      </div>
      <BrandPanel />
    </div>
  );
}
