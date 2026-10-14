import { CircleCheckIcon, FlaskConicalIcon, UploadIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { ChannelPerformanceCard } from "@/components/dashboard/channel-performance";
import { ColumnChart, type ChartDatum } from "@/components/dashboard/column-chart";
import { ConversionFunnel } from "@/components/dashboard/conversion-funnel";
import { KpiGroup, type KpiItem } from "@/components/dashboard/kpi";
import { PeriodScope } from "@/components/dashboard/period-scope";
import { RevenueHero } from "@/components/dashboard/revenue-hero";
import { SetupProgress } from "@/components/dashboard/setup-checklist";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatResponseTime, parseDashboardPeriod, relativeChange, resolveDashboardPeriod, type Delta } from "@/lib/dashboard";
import { firstName, formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { setupProgress } from "@/lib/onboarding";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { getChannelPerformance, getDashboardMetrics, getDashboardTrends, type DashboardMetrics, type TrendPoint } from "@/server/services/dashboard";
import { getSetupChecklist } from "@/server/services/organizations";
import { getPendingRevenue } from "@/server/services/revenue";

export const metadata: Metadata = { title: "Dashboard" };

const count = (value: number) => formatNumber(value);
const percent = (value: number | null) => (value === null ? "—" : formatPercent(value));

function change(current: number, previous: number, goodWhen: Delta["goodWhen"] = "up"): Delta {
  return { value: relativeChange(current, previous), unit: "percent", goodWhen, fromZero: previous === 0 && current > 0 };
}

function kpiGroups(current: DashboardMetrics, previous: DashboardMetrics, currency: string): Array<{ title: string; items: KpiItem[] }> {
  return [
    {
      title: "Acquisition",
      items: [
        {
          key: "incoming",
          label: "Leads entrants",
          value: count(current.incomingLeads),
          hint: "Nouveaux contacts arrivés pendant la période (WhatsApp, Instagram, site, saisie, recommandation). Les clientes importées depuis votre fichier ne sont pas comptées.",
          delta: change(current.incomingLeads, previous.incomingLeads),
        },
        {
          key: "qualified",
          label: "Leads qualifiés",
          value: count(current.qualifiedLeads),
          hint: "Parmi les leads entrants de la période, ceux dont le besoin a été identifié (qualifiés, chauds ou ayant réservé) avant la fin de la période.",
          delta: change(current.qualifiedLeads, previous.qualifiedLeads),
        },
        {
          key: "conversion",
          label: "Taux de conversion",
          value: percent(current.conversionRate),
          hint: "Part des leads entrants de la période qui ont réservé un rendez-vous avant la fin de la période. L'écart avec la période précédente est en points.",
          delta: {
            value: current.conversionRate !== null && previous.conversionRate !== null ? current.conversionRate - previous.conversionRate : null,
            unit: "points",
            goodWhen: "up",
          },
        },
        {
          key: "response",
          label: "Temps de réponse moyen",
          value: current.responseTimeSeconds === null ? "—" : formatResponseTime(current.responseTimeSeconds),
          hint: "Délai moyen entre le dernier message d'une cliente et la réponse qui suit, de SOFIA ou de votre équipe. Les relances et rappels automatiques ne sont pas comptés.",
          delta: {
            value: current.responseTimeSeconds !== null && previous.responseTimeSeconds ? relativeChange(current.responseTimeSeconds, previous.responseTimeSeconds) : null,
            unit: "percent",
            goodWhen: "down",
          },
        },
      ],
    },
    {
      title: "Rendez-vous",
      items: [
        {
          key: "generated",
          label: "RDV générés",
          value: count(current.appointmentsGenerated),
          hint: "Rendez-vous réservés par SOFIA pendant la période. Déplacer un rendez-vous n'en crée pas un nouveau ; reprendre rendez-vous après un no-show, si.",
          delta: change(current.appointmentsGenerated, previous.appointmentsGenerated),
        },
        {
          key: "honoured",
          label: "RDV confirmés",
          value: count(current.appointmentsHonoured),
          hint: "Rendez-vous réservés par SOFIA et honorés pendant la période : la cliente est venue. C'est ce qui rend un montant « confirmé ».",
          delta: change(current.appointmentsHonoured, previous.appointmentsHonoured),
        },
        {
          key: "noshows",
          label: "No-shows",
          value: count(current.noShows),
          hint: "Rendez-vous manqués sans prévenir pendant la période, quelle que soit leur origine. Une baisse est une bonne nouvelle.",
          delta: change(current.noShows, previous.noShows, "down"),
        },
        {
          key: "noshows-recovered",
          label: "No-shows récupérés",
          value: count(current.noShowsRecovered),
          hint: "Nouveaux rendez-vous pris avec SOFIA pendant la période pour remplacer un rendez-vous manqué.",
          delta: change(current.noShowsRecovered, previous.noShowsRecovered),
        },
      ],
    },
    {
      title: "Revenus et fidélisation",
      items: [
        {
          key: "revenue-generated",
          label: "CA généré",
          value: formatCurrency(current.revenueGeneratedCents, currency),
          hint: "Prix des rendez-vous honorés pendant la période, quelle que soit leur origine (SOFIA ou votre équipe). Les rendez-vous sans prix renseigné ne sont pas comptés.",
          delta: change(current.revenueGeneratedCents, previous.revenueGeneratedCents),
        },
        {
          key: "revenue-recovered",
          label: "CA récupéré",
          value: formatCurrency(current.revenue.totalCents, currency),
          hint: "Part du CA due à SOFIA : rendez-vous générés, leads récupérés, no-shows récupérés et clientes réactivées, honorés pendant la période.",
          delta: change(current.revenue.totalCents, previous.revenue.totalCents),
        },
        {
          key: "leads-recovered",
          label: "Leads récupérés",
          value: count(current.leadsRecovered),
          hint: "Leads qui ne répondaient plus et qui ont réservé avec SOFIA dans les 30 jours suivant une relance.",
          delta: change(current.leadsRecovered, previous.leadsRecovered),
        },
        {
          key: "reactivated",
          label: "Clientes réactivées",
          value: count(current.clientsReactivated),
          hint: "Anciennes clientes qui ont repris rendez-vous pendant la période après une campagne de réactivation.",
          delta: change(current.clientsReactivated, previous.clientsReactivated),
        },
      ],
    },
  ];
}

function chartData(
  points: TrendPoint[],
  timeZone: string,
  unit: "day" | "week" | "month",
  options: { note?: (point: TrendPoint) => string | undefined } = {},
): ChartDatum[] {
  const tick = new Intl.DateTimeFormat("fr-FR", unit === "month" ? { month: "short", timeZone } : { day: "numeric", month: "short", timeZone });
  const label = new Intl.DateTimeFormat(
    "fr-FR",
    unit === "month"
      ? { month: "long", year: "numeric", timeZone }
      : unit === "week"
        ? { day: "numeric", month: "long", timeZone }
        : { weekday: "long", day: "numeric", month: "long", timeZone },
  );
  return points.map((point, index) => {
    const text = label.format(point.start);
    const current = index === points.length - 1 ? (unit === "week" ? "" : " (en cours)") : "";
    return {
      key: point.start.toISOString(),
      tick: tick.format(point.start),
      label: unit === "week" ? `Semaine du ${text}` : `${text.charAt(0).toUpperCase()}${text.slice(1)}${current}`,
      values: point.values,
      note: options.note?.(point),
    };
  });
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const ctx = await requireTenant();
  const searchParams = await props.searchParams;
  const { id: organizationId, timezone, currency, isDemo } = ctx.organization;
  const now = new Date();
  const period = resolveDashboardPeriod(parseDashboardPeriod(searchParams.period), now, timezone);

  // Independent reads, each in its own transaction, run side by side.
  const [current, previous, trends, channels, rest] = await Promise.all([
    withTenant(organizationId, (tx) => getDashboardMetrics(tx, organizationId, period.current)),
    withTenant(organizationId, (tx) => getDashboardMetrics(tx, organizationId, period.previous)),
    withTenant(organizationId, (tx) => getDashboardTrends(tx, organizationId, now, timezone)),
    withTenant(organizationId, (tx) => getChannelPerformance(tx, organizationId, period.current)),
    withTenant(organizationId, async (tx) => ({
      checklist: await getSetupChecklist(tx, organizationId),
      pending: await getPendingRevenue(tx, organizationId),
    })),
  ]);

  const setup = setupProgress(rest.checklist);
  const hasActivity =
    trends.conversationsPerDay.some((point) => point.values.conversations! > 0) ||
    trends.leadsPerWeek.some((point) => point.values.leads! > 0) ||
    trends.appointmentsPerWeek.some((point) => Object.values(point.values).some((value) => value > 0));

  return (
    <>
      <PageHeader
        eyebrow={ctx.organization.name}
        title={`Bonjour ${firstName(ctx.user.name)}`}
        description="Ce que SOFIA vous rapporte, et l'activité de votre établissement."
      />

      <div className="space-y-6">
        {isDemo ? (
          <Alert variant="sofia">
            <FlaskConicalIcon aria-hidden />
            <AlertDescription className="text-sofia-strong">
              Établissement de démonstration : les clientes, conversations et montants sont fictifs, et aucun message n&apos;est réellement envoyé.
            </AlertDescription>
          </Alert>
        ) : null}
        {searchParams.joined ? (
          <Alert variant="success">
            <CircleCheckIcon aria-hidden />
            <AlertDescription className="text-success">Vous avez rejoint l&apos;équipe de {ctx.organization.name}.</AlertDescription>
          </Alert>
        ) : null}
        {searchParams.password ? (
          <Alert variant="success">
            <CircleCheckIcon aria-hidden />
            <AlertDescription className="text-success">Votre mot de passe a été modifié et vos autres sessions déconnectées.</AlertDescription>
          </Alert>
        ) : null}

        {setup.complete ? null : <SetupProgress state={rest.checklist} />}

        <PeriodScope
          period={period.period}
          heading={
            <div>
              <h2 id="results-title" className="text-lg font-semibold">
                Résultats
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {period.label}, {period.comparison}
              </p>
            </div>
          }
        >
          <div className="space-y-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <RevenueHero
                revenue={current.revenue}
                previousCents={previous.revenue.totalCents}
                pending={rest.pending}
                periodLabel={period.label}
                comparison={period.comparison}
                currency={currency}
              />
              <ConversionFunnel
                incoming={current.incomingLeads}
                qualified={current.qualifiedLeads}
                booked={current.bookedLeads}
                showed={current.showedLeads}
                periodLabel={period.label}
              />
            </div>

            {kpiGroups(current, previous, currency).map((group) => (
              <KpiGroup key={group.title} title={group.title} items={group.items} comparison={period.comparison} />
            ))}

            <ChannelPerformanceCard rows={channels} currency={currency} periodLabel={period.label} />
          </div>
        </PeriodScope>

        <section aria-labelledby="trends-title" className="pt-2">
          <div className="mb-5">
            <h2 id="trends-title" className="text-lg font-semibold">
              Évolution
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Les dernières semaines, quelle que soit la période choisie ci-dessus.</p>
          </div>

          {hasActivity ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Conversations par jour</CardTitle>
                  <CardDescription>Conversations où une cliente a écrit, sur les 30 derniers jours.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ColumnChart
                    title="Conversations par jour"
                    data={chartData(trends.conversationsPerDay, timezone, "day")}
                    series={[{ key: "conversations", label: "Conversations", color: "var(--viz-ink)" }]}
                    tickEvery={7}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Leads par semaine</CardTitle>
                  <CardDescription>Nouveaux contacts sur 12 semaines, hors fichier clients importé.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ColumnChart
                    title="Leads par semaine"
                    data={chartData(trends.leadsPerWeek, timezone, "week")}
                    series={[{ key: "leads", label: "Leads", color: "var(--viz-ink)" }]}
                    tickEvery={3}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rendez-vous par semaine</CardTitle>
                  <CardDescription>Rendez-vous pris par SOFIA, à la date du rendez-vous : 8 semaines passées et 4 à venir.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ColumnChart
                    title="Rendez-vous par semaine"
                    data={chartData(trends.appointmentsPerWeek, timezone, "week", {
                      note: (point) => {
                        const noShow = point.values.noShow ?? 0;
                        const cancelled = (point.values.missed ?? 0) - noShow;
                        const parts = [
                          noShow ? `${noShow} no-show${noShow > 1 ? "s" : ""}` : "",
                          cancelled ? `${cancelled} annulation${cancelled > 1 ? "s" : ""}` : "",
                        ].filter(Boolean);
                        return parts.length ? `Non honorés : ${parts.join(", ")}` : undefined;
                      },
                    })}
                    series={[
                      { key: "honoured", label: "Honorés", color: "var(--viz-sofia)" },
                      { key: "missed", label: "Non honorés", color: "var(--viz-muted)" },
                      { key: "planned", label: "Prévus", color: "var(--viz-planned)" },
                    ]}
                    tickEvery={3}
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>CA récupéré par mois</CardTitle>
                  <CardDescription>Montants confirmés (rendez-vous honorés) sur 6 mois, mois en cours compris.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ColumnChart
                    title="CA récupéré par mois"
                    data={chartData(trends.recoveredPerMonth, timezone, "month")}
                    series={[{ key: "recovered", label: "CA récupéré", color: "var(--viz-sofia)" }]}
                    format={{ kind: "money", currency }}
                    annotateLast
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-start gap-4 py-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Les graphiques se rempliront dès que SOFIA échangera avec vos clientes. En attendant, importez votre fichier clients : SOFIA
                  repère tout de suite les clientes à réactiver.
                </p>
                {ctx.can("leads:import") ? (
                  <Link href="/leads/import" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <UploadIcon aria-hidden />
                    Importer mon fichier clients
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
