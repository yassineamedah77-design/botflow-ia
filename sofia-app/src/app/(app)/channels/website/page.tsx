import { ArrowRightIcon, EyeIcon, GlobeIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { saveWidgetSettingsAction } from "@/app/(app)/channels/actions";
import type { ChannelStatus } from "@/components/app/navigation";
import { PageHeader } from "@/components/app/page-header";
import { channelStatusLabel, StatusDot } from "@/components/app/status-dot";
import { WidgetInstall } from "@/components/channels/widget-install";
import { WidgetSettingsForm } from "@/components/channels/widget-settings-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { fillText, pickWidgetLanguage, WIDGET_TEXTS } from "@/lib/widget";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { env } from "@/server/env";
import { getEstablishmentProfile } from "@/server/services/setup";
import { getWidgetChannel } from "@/server/services/widget-settings";

export const metadata: Metadata = { title: "Site web" };

const STATUS_BADGE: Record<ChannelStatus, "success" | "warning" | "destructive" | "muted"> = {
  CONNECTED: "success",
  PENDING: "warning",
  ERROR: "destructive",
  DISCONNECTED: "muted",
  NOT_CONNECTED: "muted",
};

const SOFIA_LINE = {
  ACTIVE: "SOFIA répond aux visiteuses du widget.",
  PAUSED: "SOFIA est en pause : l'équipe répond aux visiteuses depuis l'inbox.",
  INACTIVE: "SOFIA n'est pas encore activée : l'équipe répond aux visiteuses depuis l'inbox.",
} as const;

export default async function WebsiteChannelPage() {
  const ctx = await requireTenant();
  const { channel, profile } = await withTenant(ctx.organization.id, async (tx) => ({
    channel: await getWidgetChannel(tx, ctx.organization),
    profile: await getEstablishmentProfile(tx, ctx.organization.id),
  }));
  const origin = new URL(env().APP_URL).origin;
  const snippet = `<script src="${origin}/widget.js" data-sofia="${channel.publicId}" async></script>`;
  const status = channel.status as ChannelStatus;
  const language = pickWidgetLanguage([], ctx.organization.allowedLanguages, ctx.organization.defaultLanguage);
  const sofiaActive = ctx.organization.sofiaStatus === "ACTIVE";
  const defaultGreeting = fillText(sofiaActive ? WIDGET_TEXTS[language].greetingAi : WIDGET_TEXTS[language].greetingTeam, {
    org: ctx.organization.name,
    assistant: profile?.assistantName ?? "SOFIA",
  });

  return (
    <>
      <PageHeader
        eyebrow="Canaux"
        title={
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-xs">
              <GlobeIcon className="size-5" aria-hidden />
            </span>
            Site web
          </span>
        }
        description="Un widget de conversation sur votre site : SOFIA y répond 24 h/24, et l'équipe y prend le relais depuis l'inbox."
        actions={
          <Badge variant={STATUS_BADGE[status]} className="h-7 gap-2 px-3 text-[0.8125rem]">
            <StatusDot status={status} />
            {status === "DISCONNECTED" ? "Désactivé" : channelStatusLabel(status)}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid min-w-0 content-start gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Installation</CardTitle>
              <CardDescription>Une seule ligne, identique pour toutes les pages de votre site.</CardDescription>
            </CardHeader>
            <CardContent>
              <WidgetInstall snippet={snippet} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Réglages</CardTitle>
              <CardDescription>Où le widget s&apos;affiche, et à quoi il ressemble.</CardDescription>
            </CardHeader>
            <CardContent>
              <WidgetSettingsForm
                action={saveWidgetSettingsAction}
                initial={channel.settings}
                canEdit={ctx.can("integrations:manage")}
                hasWhatsappNumber={channel.hasWhatsappNumber}
                defaultGreeting={defaultGreeting}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>État</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <p className="leading-relaxed text-muted-foreground" data-testid="widget-status">
                {status === "CONNECTED" && channel.seenOn ? (
                  <>
                    Installé sur <span className="font-medium text-foreground">{channel.seenOn}</span>
                    {channel.lastSeenAt
                      ? `, vu pour la dernière fois le ${formatDateTime(channel.lastSeenAt, { timeZone: ctx.organization.timezone })}.`
                      : "."}
                  </>
                ) : status === "DISCONNECTED" ? (
                  "Le widget est désactivé : il ne s'affiche plus sur votre site."
                ) : channel.settings.allowedDomains.length === 0 ? (
                  "Indiquez le domaine de votre site dans les réglages, puis collez le code d'installation."
                ) : (
                  "Pas encore vu sur votre site. Le statut passe à « Connecté » dès que le widget s'y charge."
                )}
              </p>
              <p className="text-muted-foreground">
                <span className="text-2xl font-semibold text-foreground tabular-nums">{channel.conversationsLast30Days}</span> conversation
                {channel.conversationsLast30Days > 1 ? "s" : ""} sur les 30 derniers jours
              </p>
              <Link href="/channels/website/preview" className={buttonVariants({ variant: "outline", className: "w-full" })}>
                <EyeIcon aria-hidden />
                Essayer le widget
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="size-4 text-muted-foreground" aria-hidden />
                SOFIA
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p className="leading-relaxed text-muted-foreground">{SOFIA_LINE[ctx.organization.sofiaStatus]}</p>
              <Link href="/settings/sofia" className="flex items-center gap-1.5 font-medium underline-offset-4 hover:underline">
                {sofiaActive ? "Mettre en pause" : "Activer SOFIA"}
                <ArrowRightIcon className="size-3.5" aria-hidden />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" aria-hidden />
                Protection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
                Le navigateur refuse d&apos;afficher la conversation sur un site qui n&apos;est pas dans vos domaines autorisés. Chaque visiteuse est
                limitée en nombre de messages, les robots sont écartés, et SOFIA répond au plus à 1 000 messages du widget par jour pour borner le
                coût d&apos;un éventuel abus. Les visiteuses sont informées qu&apos;elles parlent à une assistante virtuelle.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
