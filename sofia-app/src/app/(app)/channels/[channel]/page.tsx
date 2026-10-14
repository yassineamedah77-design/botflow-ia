import { CircleAlertIcon, ClockIcon, GlobeIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { ChannelStatus } from "@/components/app/navigation";
import { PageHeader } from "@/components/app/page-header";
import { channelStatusLabel, StatusDot } from "@/components/app/status-dot";
import { InstagramIcon, WhatsAppIcon } from "@/components/brand/channel-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHANNEL_SETUP, type ChannelSlug } from "@/lib/channels";
import { formatDateTime } from "@/lib/format";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { listIntegrations } from "@/server/services/organizations";

const ICONS = { whatsapp: WhatsAppIcon, instagram: InstagramIcon, website: GlobeIcon } as const;
const CHANNELS = CHANNEL_SETUP;

function isChannel(value: string): value is ChannelSlug {
  return value in CHANNELS;
}

export async function generateMetadata(props: PageProps<"/channels/[channel]">): Promise<Metadata> {
  const { channel } = await props.params;
  return { title: isChannel(channel) ? CHANNELS[channel].title : "Canal" };
}

const STATUS_BADGE: Record<ChannelStatus, "success" | "warning" | "destructive" | "muted"> = {
  CONNECTED: "success",
  PENDING: "warning",
  ERROR: "destructive",
  DISCONNECTED: "destructive",
  NOT_CONNECTED: "muted",
};

export default async function ChannelPage(props: PageProps<"/channels/[channel]">) {
  const { channel } = await props.params;
  if (!isChannel(channel)) notFound();

  const ctx = await requireTenant();
  const definition = CHANNELS[channel];
  const integrations = await withTenant(ctx.organization.id, (tx) => listIntegrations(tx, ctx.organization.id));
  const integration = integrations.find((candidate) => candidate.provider === definition.provider);
  const status = (integration?.status ?? "NOT_CONNECTED") as ChannelStatus;
  const Icon = ICONS[channel];

  return (
    <>
      <PageHeader
        eyebrow="Canaux"
        title={
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-xs">
              <Icon className="size-5" />
            </span>
            {definition.title}
          </span>
        }
        description={definition.description}
        actions={
          <Badge variant={STATUS_BADGE[status]} className="h-7 gap-2 px-3 text-[0.8125rem]">
            <StatusDot status={status} />
            {channelStatusLabel(status)}
          </Badge>
        }
      />

      {status === "ERROR" && integration?.lastError ? (
        <Alert variant="destructive" className="mb-6">
          <CircleAlertIcon aria-hidden />
          <AlertDescription className="text-destructive">
            Dernière erreur
            {integration.lastErrorAt ? ` (${formatDateTime(integration.lastErrorAt, { timeZone: ctx.organization.timezone })})` : ""} :{" "}
            {integration.lastError}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              {status === "CONNECTED"
                ? `Connecté${integration?.displayName ? ` : ${integration.displayName}` : ""}.`
                : "Ce canal n'est pas connecté. Le statut « Connecté » ne s'affichera qu'après une connexion réellement vérifiée."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-input bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  La connexion {definition.title} sera disponible en phase {definition.phase}.
                </p>
              </div>
              <Button disabled variant="outline" className="shrink-0">
                Connecter {definition.title}
              </Button>
            </div>
            {channel === "website" ? (
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium">Identifiant de votre widget</p>
                <p className="mt-1 text-[0.8125rem] text-muted-foreground">
                  Généré à la création de votre établissement. Il identifiera votre widget dans le script d&apos;intégration.
                </p>
                <code className="mt-3 inline-block rounded-md bg-muted px-2.5 py-1.5 font-mono text-[0.8125rem]">
                  {ctx.organization.widgetPublicId}
                </code>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-muted-foreground" aria-hidden />
              Ce qu&apos;il faudra
            </CardTitle>
            <CardDescription>Préparez ces éléments pour connecter le canal dès sa disponibilité.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {definition.requirements.map((requirement) => (
                <li key={requirement} className="flex items-start gap-2.5 text-sm leading-relaxed">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sofia" aria-hidden />
                  {requirement}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
