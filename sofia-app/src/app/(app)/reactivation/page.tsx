import { ArrowRightIcon, CrownIcon, InfoIcon, MegaphoneIcon, ShieldCheckIcon, UploadIcon, UserRoundXIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";

import { PageHeader } from "@/components/app/page-header";
import { ChannelIcon } from "@/components/leads/lead-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/format";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { getReactivationOverview, INACTIVITY_OPTIONS, parseInactivity, type ReactivationSegment } from "@/server/services/reactivation";

export const metadata: Metadata = { title: "Réactivation" };

const SEGMENT_COPY = {
  never_returned: {
    title: "Jamais revenues",
    description: "Venues une seule fois, puis plus de nouvelles.",
    visits: "once",
    icon: UserRoundXIcon,
  },
  lost: {
    title: "Clientes perdues",
    description: "Venues plusieurs fois, absentes depuis.",
    visits: "repeat",
    icon: CrownIcon,
  },
} as const;

function ReachBar({ segment }: { segment: ReactivationSegment }) {
  const parts = [
    { key: "consent", value: segment.withConsent, label: "Consentement donné", className: "bg-success" },
    { key: "rule", value: segment.existingClientRule, label: "Email ou SMS sous conditions", className: "bg-sand-strong" },
    { key: "excluded", value: segment.excluded, label: "À ne pas contacter", className: "bg-border" },
  ];
  const total = Math.max(segment.count, 1);
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        {parts.map((part) => (part.value > 0 ? <span key={part.key} className={part.className} style={{ width: `${(part.value / total) * 100}%` }} /> : null))}
      </div>
      <ul className="mt-3 grid gap-1.5 text-sm">
        {parts.map((part) => (
          <li key={part.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className={cn("size-2 rounded-full", part.className)} aria-hidden />
              {part.label}
            </span>
            <span className="font-medium tabular">{part.value.toLocaleString("fr-FR")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ReactivationPage(props: PageProps<"/reactivation">) {
  const ctx = await requireTenant();
  const days = parseInactivity((await props.searchParams).days);
  const now = new Date();
  const overview = await withTenant(ctx.organization.id, (tx) => getReactivationOverview(tx, ctx.organization.id, days, now));
  const currency = ctx.organization.currency;
  const timeZone = ctx.organization.timezone;
  const segments = [overview.segments.neverReturned, overview.segments.lost];
  const inactiveTotal = segments.reduce((total, segment) => total + segment.count, 0);
  const dormantValue = segments.reduce((total, segment) => total + segment.oneVisitValueCents, 0);

  const importButton = ctx.can("leads:import") ? (
    <Button variant="outline" asChild>
      <Link href="/leads/import">
        <UploadIcon aria-hidden />
        Importer un fichier clients
      </Link>
    </Button>
  ) : null;

  return (
    <>
      <PageHeader
        title="Réactivation"
        description="Les clientes qui ne sont jamais revenues ou plus venues depuis des mois, prêtes à être relancées par SOFIA dans le respect de leur consentement."
        actions={importButton}
      />

      {overview.totalClients === 0 ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Commencez par importer votre fichier clients</CardTitle>
            <CardDescription>
              L&apos;export de votre logiciel de réservation ou de caisse suffit. SOFIA y repère les clientes inactives, calcule ce qu&apos;elles
              représentent et prépare leur réactivation.
            </CardDescription>
          </CardHeader>
          <CardContent>{importButton}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-8">
          <section className="flex flex-col gap-5 rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-primary-foreground/65">Clientes sans visite depuis {days} jours</p>
              <p className="mt-3 font-heading text-[2.75rem] leading-none font-semibold tabular">{inactiveTotal.toLocaleString("fr-FR")}</p>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-primary-foreground/75">
                Une visite de chacune représente {formatCurrency(dormantValue, currency)}
                <Tooltip>
                  <TooltipTrigger className="rounded-full text-primary-foreground/50 outline-none hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-sofia/60">
                    <InfoIcon className="size-3.5" aria-hidden />
                    <span className="sr-only">Comment ce montant est calculé</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Panier moyen de chaque cliente d&apos;après son historique (total dépensé divisé par ses visites), ou panier moyen de
                    l&apos;établissement à défaut
                    {overview.averageBasketCents ? ` (${formatCurrency(overview.averageBasketCents, currency)})` : ""}. C&apos;est un potentiel, pas
                    un chiffre d&apos;affaires.
                  </TooltipContent>
                </Tooltip>
              </p>
            </div>
            <nav className="flex items-center rounded-lg bg-white/10 p-0.5" aria-label="Période d'inactivité">
              {INACTIVITY_OPTIONS.map((option) => (
                <Link
                  key={option}
                  href={option === 90 ? "/reactivation" : `/reactivation?days=${option}`}
                  scroll={false}
                  aria-current={option === days ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium text-primary-foreground/70 transition-colors hover:text-primary-foreground",
                    option === days && "bg-primary-foreground text-primary hover:text-primary",
                  )}
                >
                  {option} j
                </Link>
              ))}
            </nav>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {segments.map((segment) => {
              const copy = SEGMENT_COPY[segment.key];
              const Icon = copy.icon;
              return (
                <Card key={segment.key}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" aria-hidden />
                          {copy.title}
                        </CardTitle>
                        <CardDescription>{copy.description}</CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-3xl font-semibold tabular">{segment.count.toLocaleString("fr-FR")}</p>
                        <p className="text-xs text-muted-foreground tabular">{formatCurrency(segment.oneVisitValueCents, currency)} pour une visite</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <ReachBar segment={segment} />
                    {segment.topClients.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Les plus précieuses</p>
                        <ul className="divide-y divide-border rounded-xl border border-border">
                          {segment.topClients.map((client) => (
                            <li key={client.id}>
                              <Link href={`/leads/${client.id}`} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm hover:bg-muted/50">
                                <span className="min-w-0">
                                  <span className="block truncate font-medium">{client.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {client.visitCount} visite{client.visitCount > 1 ? "s" : ""}
                                    {client.lastVisitAt ? ` · dernière ${formatRelativeTime(client.lastVisitAt, now)}` : ""}
                                  </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                  {client.optedOut || client.consent === "DENIED" || client.consent === "WITHDRAWN" ? (
                                    <Badge variant="muted">Ne pas contacter</Badge>
                                  ) : client.consent === "GRANTED" ? (
                                    <Badge variant="success">Consentement</Badge>
                                  ) : null}
                                  {client.lifetimeValueCents !== null ? (
                                    <span className="tabular">{formatCurrency(client.lifetimeValueCents, currency)}</span>
                                  ) : null}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <Button variant="outline" asChild className="justify-self-start">
                      <Link href={`/leads?inactive=${days}&visits=${copy.visits}&sort=spent`}>
                        Voir les {segment.count.toLocaleString("fr-FR")} clientes
                        <ArrowRightIcon aria-hidden />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>Campagnes de réactivation</CardTitle>
                    <CardDescription>Message personnalisé, canal et date d&apos;envoi, puis SOFIA répond et propose un rendez-vous.</CardDescription>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0} className="rounded-lg">
                        <Button disabled>
                          <MegaphoneIcon aria-hidden />
                          Nouvelle campagne
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Disponible en phase 8, une fois WhatsApp connecté (modèles de messages approuvés par Meta) et l&apos;envoi d&apos;emails et SMS
                      marketing en place.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>
              <CardContent>
                {overview.campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune campagne pour l&apos;instant.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {overview.campaigns.map((campaign) => (
                      <li key={campaign.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium">
                            <ChannelIcon channel={campaign.channel} />
                            <span className="truncate">{campaign.name}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {campaign.startedAt ? `Envoyée le ${formatDate(campaign.startedAt, { timeZone })}` : "Brouillon"} ·{" "}
                            {campaign.recipients} destinataires · {campaign.replied} réponses · {campaign.booked} rendez-vous · {campaign.optedOut} STOP
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-medium tabular">{formatCurrency(campaign.revenue.confirmed, currency)}</p>
                          {campaign.revenue.estimated > 0 ? (
                            <p className="text-xs text-muted-foreground tabular">+ {formatCurrency(campaign.revenue.estimated, currency)} à venir</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheckIcon className="size-4 text-success" aria-hidden />
                  Qui peut être contactée, et comment
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-relaxed text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Consentement donné :</span> tous les canaux. WhatsApp exige en plus l&apos;accord de la
                  cliente pour être contactée sur WhatsApp, et un modèle de message approuvé par Meta.
                </p>
                <p>
                  <span className="font-medium text-foreground">Consentement non renseigné :</span> email ou SMS uniquement, pour une prestation
                  analogue à celles déjà achetées, avec un moyen de se désinscrire dans chaque message (règle des clientes existantes : article
                  L34-5 du code des postes et des communications électroniques en France, article 13.º-A de la loi 41/2004 au Portugal).
                </p>
                <p>
                  <span className="font-medium text-foreground">Refus ou STOP :</span> jamais contactée. Un STOP est appliqué immédiatement et
                  définitivement.
                </p>
                {overview.clientsWithoutVisitDate > 0 ? (
                  <p className="border-t border-border pt-3">
                    {overview.clientsWithoutVisitDate.toLocaleString("fr-FR")} cliente(s) n&apos;ont pas de date de dernière visite et
                    n&apos;apparaissent dans aucun segment.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
