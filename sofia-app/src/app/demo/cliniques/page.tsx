import { ExternalLinkIcon, LayoutDashboardIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { CopyLinkButton, DemoKeyForm, PreparedDemoForm } from "@/components/demo/prepared-demo-forms";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { isDemoAdmin, isDemoAdminEnabled } from "@/server/demo/admin";
import { LUMINA_SLUG, listPreparedDemos } from "@/server/demo/prepared";
import { env } from "@/server/env";

import {
  createPreparedDemoAction,
  deletePreparedDemoAction,
  openPreparedDemoAction,
  resetClinicaLuminaAction,
  signInDemoAdminAction,
} from "./actions";

export const metadata: Metadata = { title: "Cliniques de démonstration", robots: { index: false } };

/** The founder's page: prospect clinics prepared for sales calls. */
export default async function PreparedDemosPage() {
  if (!isDemoAdminEnabled()) notFound();

  if (!(await isDemoAdmin())) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-8 px-5 py-10">
        <Logo withTagline />
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Cliniques de démonstration</h1>
          <p className="mt-2 text-sm text-muted-foreground">Réservé à BotFlow IA.</p>
        </div>
        <DemoKeyForm action={signInDemoAdminAction} />
      </main>
    );
  }

  const demos = await listPreparedDemos();
  const origin = env().APP_URL;

  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Logo withTagline />
        <form action={resetClinicaLuminaAction}>
          <SubmitButton variant="outline" size="sm" pendingLabel="Recréation…">
            <RotateCcwIcon aria-hidden />
            {demos.some((demo) => demo.slug === LUMINA_SLUG) ? "Remettre Clínica Lumina à zéro" : "Créer Clínica Lumina"}
          </SubmitButton>
        </form>
      </header>

      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Cliniques de démonstration</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Préparez la clinique du prospect avant l&apos;appel, puis envoyez-lui son lien : la gérante écrit à SOFIA depuis son téléphone, et vous
          lui montrez la conversation dans le tableau de bord.
        </p>
      </div>

      <section aria-labelledby="demos-title" className="grid gap-3">
        <h2 id="demos-title" className="text-sm font-semibold">
          {demos.length ? `${demos.length} clinique${demos.length > 1 ? "s" : ""}` : "Aucune clinique pour l'instant"}
        </h2>
        <ul className="grid gap-3">
          {demos.map((demo) => {
            const url = `${origin}/d/${demo.slug}`;
            return (
              <li key={demo.organizationId} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {demo.name}
                    <span className="ml-2 text-xs font-normal text-muted-foreground uppercase">{demo.language}</span>
                  </p>
                  <p className="text-[0.8125rem] text-muted-foreground">
                    {[demo.city, `créée le ${formatDate(demo.createdAt)}`, `${demo.conversations} conversation${demo.conversations > 1 ? "s" : ""}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[0.8125rem] text-sofia-strong underline-offset-4 hover:underline">
                    <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{url}</span>
                  </a>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CopyLinkButton url={url} />
                  <form action={openPreparedDemoAction}>
                    <input type="hidden" name="organizationId" value={demo.organizationId} />
                    <SubmitButton size="sm" pendingLabel="Ouverture…">
                      <LayoutDashboardIcon aria-hidden />
                      Tableau de bord
                    </SubmitButton>
                  </form>
                  <form action={deletePreparedDemoAction}>
                    <input type="hidden" name="organizationId" value={demo.organizationId} />
                    <SubmitButton size="sm" variant="ghost" aria-label={`Supprimer ${demo.name}`} pendingLabel="…">
                      <Trash2Icon aria-hidden />
                    </SubmitButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle clinique</CardTitle>
          <CardDescription>Cinq minutes, à partir du site de la clinique.</CardDescription>
        </CardHeader>
        <CardContent>
          <PreparedDemoForm action={createPreparedDemoAction} />
        </CardContent>
      </Card>
    </main>
  );
}
