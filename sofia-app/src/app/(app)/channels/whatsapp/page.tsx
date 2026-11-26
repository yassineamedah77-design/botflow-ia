import { ArrowRightIcon, CircleAlertIcon, ClockIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { connectWhatsappAction, disconnectWhatsappAction } from "@/app/(app)/channels/actions";
import type { ChannelStatus } from "@/components/app/navigation";
import { PageHeader } from "@/components/app/page-header";
import { channelStatusLabel, StatusDot } from "@/components/app/status-dot";
import { WhatsAppIcon } from "@/components/brand/channel-icons";
import { WhatsappConnectForm, WhatsappDisconnectButton } from "@/components/channels/whatsapp-connection";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHANNEL_SETUP } from "@/lib/channels";
import { formatDateTime } from "@/lib/format";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { getWhatsappChannel } from "@/server/whatsapp/connection";

export const metadata: Metadata = { title: "WhatsApp" };

const STATUS_BADGE: Record<ChannelStatus, "success" | "warning" | "destructive" | "muted"> = {
  CONNECTED: "success",
  PENDING: "warning",
  ERROR: "destructive",
  DISCONNECTED: "muted",
  NOT_CONNECTED: "muted",
};

/** Meta's rating of the number, from the messages customers block or report. */
const QUALITY: Record<string, string> = {
  GREEN: "Bonne",
  YELLOW: "Moyenne : des clientes ont bloqué ou signalé des messages",
  RED: "Faible : Meta peut limiter l'envoi depuis ce numéro",
};

const SOFIA_LINE = {
  ACTIVE: "SOFIA répond aux messages WhatsApp écrits. Les messages vocaux, photos et documents vont à l'équipe.",
  PAUSED: "SOFIA est en pause : l'équipe répond aux messages WhatsApp depuis l'inbox.",
  INACTIVE: "SOFIA n'est pas encore activée : l'équipe répond aux messages WhatsApp depuis l'inbox.",
} as const;

export default async function WhatsappChannelPage() {
  const ctx = await requireTenant();
  const channel = await withTenant(ctx.organization.id, (tx) => getWhatsappChannel(tx, ctx.organization.id));
  const status = channel.status as ChannelStatus;
  const connected = status === "CONNECTED";
  const canManage = ctx.can("integrations:manage");

  return (
    <>
      <PageHeader
        eyebrow="Canaux"
        title={
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-xs">
              <WhatsAppIcon className="size-5" />
            </span>
            WhatsApp
          </span>
        }
        description={CHANNEL_SETUP.whatsapp.description}
        actions={
          <Badge variant={STATUS_BADGE[status]} className="h-7 gap-2 px-3 text-[0.8125rem]">
            <StatusDot status={status} />
            {status === "DISCONNECTED" ? "Déconnecté" : channelStatusLabel(status)}
          </Badge>
        }
      />

      {status === "ERROR" && channel.lastError ? (
        <Alert variant="destructive" className="mb-6">
          <CircleAlertIcon aria-hidden />
          <AlertDescription className="text-destructive">
            {channel.lastError}
            {channel.lastErrorAt ? ` (${formatDateTime(channel.lastErrorAt, { timeZone: ctx.organization.timezone })})` : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid min-w-0 content-start gap-6 lg:col-span-2">
          {connected ? (
            <Card>
              <CardHeader>
                <CardTitle>Numéro connecté</CardTitle>
                <CardDescription>Vérifié auprès de Meta : SOFIA reçoit les messages de ce numéro et y répond.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <dl className="grid gap-4 text-sm sm:grid-cols-2" data-testid="whatsapp-number">
                  <div>
                    <dt className="text-muted-foreground">Numéro</dt>
                    <dd className="mt-1 font-medium">{channel.displayName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Nom affiché aux clientes</dt>
                    <dd className="mt-1 font-medium">{channel.config.verifiedName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Qualité selon Meta</dt>
                    <dd className="mt-1 font-medium">{channel.config.qualityRating ? (QUALITY[channel.config.qualityRating] ?? channel.config.qualityRating) : "Pas encore évaluée"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Connecté le</dt>
                    <dd className="mt-1 font-medium">{channel.connectedAt ? formatDateTime(channel.connectedAt, { timeZone: ctx.organization.timezone }) : "—"}</dd>
                  </div>
                </dl>
                {canManage ? (
                  <div className="flex justify-end">
                    <WhatsappDisconnectButton action={disconnectWhatsappAction} displayName={channel.displayName} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{status === "ERROR" ? "Reconnecter le numéro" : "Connecter votre numéro"}</CardTitle>
                <CardDescription>
                  Le statut « Connecté » ne s&apos;affiche qu&apos;après vérification auprès de Meta : le numéro, le compte et le jeton
                  doivent aller ensemble.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canManage ? (
                  <WhatsappConnectForm action={connectWhatsappAction} reconnect={status === "ERROR"} />
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">Seuls les propriétaires et administrateurs peuvent connecter WhatsApp.</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="size-4 text-muted-foreground" aria-hidden />
                La règle des 24 heures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                WhatsApp autorise une réponse libre pendant 24 heures après le dernier message de la cliente. Au-delà, seuls les modèles de
                messages approuvés par Meta peuvent lui parvenir : ils serviront aux relances automatiques. L&apos;inbox indique quand une
                conversation sort de cette fenêtre.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
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
                {ctx.organization.sofiaStatus === "ACTIVE" ? "Mettre en pause" : "Activer SOFIA"}
                <ArrowRightIcon className="size-3.5" aria-hidden />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-muted-foreground" aria-hidden />
                Ce qu&apos;il faut
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {CHANNEL_SETUP.whatsapp.requirements.map((requirement) => (
                  <li key={requirement} className="flex items-start gap-2.5 text-sm leading-relaxed">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sofia" aria-hidden />
                    {requirement}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
