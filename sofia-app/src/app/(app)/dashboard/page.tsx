import { CircleCheckIcon, GlobeIcon, PartyPopperIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { channelStatusLabel, StatusDot } from "@/components/app/status-dot";
import { InstagramIcon, WhatsAppIcon } from "@/components/brand/channel-icons";
import { SofiaMark } from "@/components/brand/logo";
import { RevenueHero } from "@/components/dashboard/revenue-hero";
import { SetupChecklist, type ChecklistItem } from "@/components/dashboard/setup-checklist";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { firstName } from "@/lib/format";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { listMembers, listPendingInvitations } from "@/server/services/members";
import { getSetupChecklist, listIntegrations } from "@/server/services/organizations";
import { getRevenueSummary, monthRange } from "@/server/services/revenue";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const ctx = await requireTenant();
  const searchParams = await props.searchParams;
  const organizationId = ctx.organization.id;
  const now = new Date();

  // A transaction holds a single connection: queries run one after the other.
  const data = await withTenant(organizationId, async (tx) => ({
    checklist: await getSetupChecklist(tx, organizationId),
    revenue: await getRevenueSummary(tx, organizationId, monthRange(now, ctx.organization.timezone)),
    members: await listMembers(tx, organizationId),
    invitations: await listPendingInvitations(tx, organizationId),
    integrations: await listIntegrations(tx, organizationId),
  }));

  const statusOf = (provider: string) =>
    data.integrations.find((integration) => integration.provider === provider)?.status ?? "NOT_CONNECTED";

  const items: ChecklistItem[] = [
    {
      key: "profile",
      label: "Profil de l'établissement",
      done: data.checklist.profile,
      description: "Adresse, téléphone et présentation que SOFIA communique à vos clientes.",
      href: "/knowledge",
    },
    {
      key: "services",
      label: "Prestations et tarifs",
      done: data.checklist.services,
      description: "SOFIA ne donne que les prix et durées que vous avez renseignés.",
      href: "/knowledge",
    },
    {
      key: "hours",
      label: "Horaires d'ouverture",
      done: data.checklist.hours,
      description: "Utilisés pour proposer des créneaux réels, jamais inventés.",
      href: "/knowledge",
    },
    {
      key: "calendar",
      label: "Calendrier",
      done: data.checklist.calendar,
      description: "Agenda SOFIA, Google Calendar ou Calendly pour réserver sans double booking.",
      phase: 7,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      done: data.checklist.whatsapp,
      description: "Connexion officielle WhatsApp Business Platform (Meta).",
      phase: 5,
    },
    {
      key: "instagram",
      label: "Instagram",
      done: data.checklist.instagram,
      description: "Messages privés Instagram via l'API officielle Meta.",
      phase: 6,
    },
    {
      key: "widget",
      label: "Widget du site",
      done: data.checklist.widget,
      description: "Une ligne de code à ajouter sur votre site.",
      phase: 4,
    },
    {
      key: "sofia",
      label: "SOFIA activée",
      done: data.checklist.sofiaActive,
      description: "SOFIA commence à répondre à vos clientes, 24 h/24.",
      phase: 3,
    },
  ];

  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: ctx.organization.timezone,
  }).format(now);

  const channels = [
    { label: "WhatsApp", icon: WhatsAppIcon, status: statusOf("WHATSAPP_CLOUD"), href: "/channels/whatsapp" },
    { label: "Instagram", icon: InstagramIcon, status: statusOf("INSTAGRAM_MESSAGING"), href: "/channels/instagram" },
    { label: "Site web", icon: GlobeIcon, status: statusOf("WEBSITE_WIDGET"), href: "/channels/website" },
  ];

  return (
    <>
      <PageHeader
        eyebrow={ctx.organization.name}
        title={`Bonjour ${firstName(ctx.user.name)}`}
        description="Voici l'état de SOFIA pour votre établissement. Les indicateurs de conversations, leads et rendez-vous arrivent avec l'inbox et le CRM."
      />

      {searchParams.welcome ? (
        <Alert variant="sofia" className="mb-6">
          <PartyPopperIcon aria-hidden />
          <AlertDescription className="text-sofia-strong">
            Votre espace SOFIA est prêt. Suivez la mise en route ci-dessous : chaque étape se valide automatiquement.
          </AlertDescription>
        </Alert>
      ) : null}
      {searchParams.joined ? (
        <Alert variant="success" className="mb-6">
          <CircleCheckIcon aria-hidden />
          <AlertDescription className="text-success">Vous avez rejoint l&apos;équipe de {ctx.organization.name}.</AlertDescription>
        </Alert>
      ) : null}
      {searchParams.password ? (
        <Alert variant="success" className="mb-6">
          <CircleCheckIcon aria-hidden />
          <AlertDescription className="text-success">Votre mot de passe a été modifié et vos autres sessions déconnectées.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <RevenueHero
            confirmedCents={data.revenue.confirmedCents}
            estimatedCents={data.revenue.estimatedCents}
            attributedAppointments={data.revenue.attributedAppointments}
            monthLabel={monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
            currency="EUR"
          />
          <SetupChecklist items={items} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <SofiaMark className="size-9 text-sm" />
                <div>
                  <CardTitle>SOFIA</CardTitle>
                  <CardDescription>
                    {ctx.organization.sofiaStatus === "ACTIVE"
                      ? "Active, elle répond à vos clientes."
                      : ctx.organization.sofiaStatus === "PAUSED"
                        ? "En pause : aucune réponse automatique."
                        : "Pas encore activée."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-[0.8125rem] leading-relaxed text-muted-foreground">
              SOFIA s&apos;active une fois vos prestations renseignées et au moins un canal connecté. Elle ne répond qu&apos;à
              partir des informations de votre établissement et passe la main à votre équipe dès qu&apos;une question
              sort de son cadre.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Canaux</CardTitle>
              <CardDescription>Statut réel de chaque connexion.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {channels.map((channel) => (
                  <li key={channel.label}>
                    <Link
                      href={channel.href}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      <channel.icon className="size-4 text-foreground/70" />
                      <span className="flex-1 text-sm font-medium">{channel.label}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <StatusDot status={channel.status} />
                        {channelStatusLabel(channel.status)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="size-4 text-muted-foreground" aria-hidden />
                Équipe
              </CardTitle>
              <CardDescription>
                {data.members.length} membre{data.members.length > 1 ? "s" : ""}
                {data.invitations.length > 0
                  ? ` · ${data.invitations.length} invitation${data.invitations.length > 1 ? "s" : ""} en attente`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/team" className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}>
                {ctx.can("members:invite") ? "Inviter et gérer l'équipe" : "Voir l'équipe"}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
