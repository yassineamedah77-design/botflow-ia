import { cn } from "cn";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ClockIcon,
  GlobeIcon,
  HandIcon,
  LanguagesIcon,
  RefreshCcwIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type * as React from "react";

import { channelStatusLabel, StatusDot } from "@/components/app/status-dot";
import { InstagramIcon, WhatsAppIcon } from "@/components/brand/channel-icons";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { EstablishmentForm } from "@/components/onboarding/establishment-form";
import { HoursEditor } from "@/components/onboarding/hours-editor";
import { ServicesManager } from "@/components/onboarding/services-manager";
import { StepList, stepPhase } from "@/components/onboarding/step-list";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHANNEL_SETUP, type ChannelSlug } from "@/lib/channels";
import { ONBOARDING_STEPS, isOnboardingSlug, type OnboardingSlug } from "@/lib/onboarding";
import { describePrice, WEEKDAYS } from "@/lib/pricing";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { getSetupChecklist, listIntegrations } from "@/server/services/organizations";
import { getEstablishmentProfile, listActiveServices, listOpeningHours } from "@/server/services/setup";

import { archiveServiceAction, createServiceAction, saveEstablishmentAction, saveHoursAction, updateServiceAction } from "../actions";

const DESCRIPTIONS: Record<OnboardingSlug, string> = {
  welcome: "Quelques minutes pour que SOFIA connaisse votre établissement aussi bien que votre équipe.",
  establishment: "Ce que SOFIA dit de vous, et comment elle le dit. Tout ce qui n'est pas renseigné, elle ne l'invente pas.",
  services: "Les prestations que SOFIA peut proposer, avec leurs vrais prix et durées.",
  hours: "SOFIA ne propose des créneaux que pendant vos heures d'ouverture.",
  calendar: "Pour réserver sur vos vraies disponibilités, sans double réservation.",
  whatsapp: "Le canal préféré de vos clientes, connecté par l'API officielle de Meta.",
  instagram: "Vos messages privés Instagram, traités au même endroit que le reste.",
  widget: "Une fenêtre de conversation sur votre site, ajoutée avec une ligne de code.",
  test: "Vérifier ce que SOFIA sait avant de la laisser répondre à vos clientes.",
  activation: "Le moment où SOFIA commence à répondre, 24 h/24.",
};

const CHANNEL_ICONS: Record<ChannelSlug, React.ComponentType<{ className?: string }>> = {
  whatsapp: WhatsAppIcon,
  instagram: InstagramIcon,
  website: GlobeIcon,
};

export async function generateMetadata(props: PageProps<"/onboarding/[step]">): Promise<Metadata> {
  const { step } = await props.params;
  const definition = ONBOARDING_STEPS.find((candidate) => candidate.slug === step);
  return { title: definition ? `${definition.title} · Mise en route` : "Mise en route" };
}

function Requirement({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      {done ? (
        <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
      ) : (
        <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <span className={done ? "text-foreground" : "text-muted-foreground"}>
        {children}
        <span className="sr-only">{done ? " (fait)" : " (à faire)"}</span>
      </span>
    </li>
  );
}

function PhaseNotice({ phase, children }: { phase: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-input bg-muted/30 p-5">
      <ClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="text-sm leading-relaxed text-muted-foreground">
        <Badge variant="muted" className="mb-2">
          Disponible en phase {phase}
        </Badge>
        <p>{children}</p>
      </div>
    </div>
  );
}

export default async function OnboardingStepPage(props: PageProps<"/onboarding/[step]">) {
  const { step } = await props.params;
  if (!isOnboardingSlug(step)) notFound();

  const ctx = await requireTenant();
  const organizationId = ctx.organization.id;
  const data = await withTenant(organizationId, async (tx) => ({
    checklist: await getSetupChecklist(tx, organizationId),
    profile: step === "establishment" ? await getEstablishmentProfile(tx, organizationId) : null,
    services: step === "services" || step === "test" || step === "activation" ? await listActiveServices(tx, organizationId) : [],
    hours: step === "hours" || step === "test" ? await listOpeningHours(tx, organizationId) : [],
    integrations: await listIntegrations(tx, organizationId),
  }));

  const index = ONBOARDING_STEPS.findIndex((candidate) => candidate.slug === step);
  const definition = ONBOARDING_STEPS[index]!;
  const previous = ONBOARDING_STEPS[index - 1];
  const next = ONBOARDING_STEPS[index + 1];
  const canEdit = ctx.can("knowledge:write");
  const phase = stepPhase(step);
  const statusOf = (provider: string) => data.integrations.find((integration) => integration.provider === provider)?.status ?? "NOT_CONNECTED";
  const pricedServices = data.services.filter((service) => describePrice(service.priceType, service.priceCents).configured);
  const unpricedServices = data.services.filter((service) => !describePrice(service.priceType, service.priceCents).configured);
  const openDays = new Set(data.hours.map((range) => range.day));
  const channelConnected = ["WHATSAPP_CLOUD", "INSTAGRAM_MESSAGING", "WEBSITE_WIDGET"].some((provider) => statusOf(provider) === "CONNECTED");

  let content: React.ReactNode;
  switch (step) {
    case "welcome":
      content = (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ce que fait SOFIA</CardTitle>
              <CardDescription>Une assistante qui ne dort jamais et ne parle que de ce que vous lui avez appris.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: LanguagesIcon, title: "Elle répond 24 h/24", text: "Sur WhatsApp, Instagram et votre site, dans la langue de la cliente." },
                  { icon: CalendarDaysIcon, title: "Elle réserve", text: "Sur vos vraies disponibilités, sans double réservation." },
                  { icon: RefreshCcwIcon, title: "Elle récupère du chiffre d'affaires", text: "Relance des prospects silencieux, no-shows, anciennes clientes." },
                  { icon: HandIcon, title: "Elle passe la main", text: "Dès qu'une question sort de son cadre : médical, réclamation, cas particulier." },
                ].map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sofia-soft text-sofia-strong">
                      <item.icon className="size-4" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-foreground">{item.title}</span>
                      <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-muted-foreground">{item.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="bg-muted/40 shadow-none">
            <CardContent className="grid gap-2 text-sm leading-relaxed text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Dix étapes, dans l&apos;ordre que vous voulez.</span> Votre établissement, vos prestations et vos
                horaires se renseignent dès aujourd&apos;hui : comptez une dizaine de minutes.
              </p>
              <p>
                Les connexions (calendrier, WhatsApp, Instagram, widget) et l&apos;activation arrivent avec les prochaines versions de SOFIA. Elles sont
                marquées « Phase » : rien n&apos;est simulé, chaque coche correspond à votre configuration réelle.
              </p>
            </CardContent>
          </Card>
        </div>
      );
      break;

    case "establishment":
      content = (
        <Card>
          <CardContent>
            <EstablishmentForm
              action={saveEstablishmentAction}
              canEdit={canEdit}
              defaults={{
                assistantName: data.profile?.assistantName ?? "SOFIA",
                description: data.profile?.description ?? "",
                tone: data.profile?.tone ?? "",
                addressLine: data.profile?.addressLine ?? "",
                postalCode: data.profile?.postalCode ?? "",
                city: data.profile?.city ?? "",
                phone: data.profile?.phone ?? "",
                email: data.profile?.email ?? "",
                websiteUrl: data.profile?.websiteUrl ?? "",
                instagramHandle: data.profile?.instagramHandle ?? "",
                bookingPolicy: data.profile?.bookingPolicy ?? "",
                cancellationPolicy: data.profile?.cancellationPolicy ?? "",
                importantInfo: data.profile?.importantInfo ?? "",
              }}
            />
          </CardContent>
        </Card>
      );
      break;

    case "services":
      content = (
        <ServicesManager
          services={data.services}
          canEdit={canEdit}
          createAction={createServiceAction}
          updateAction={updateServiceAction}
          archiveAction={archiveServiceAction}
        />
      );
      break;

    case "hours":
      content = <HoursEditor initial={data.hours} canEdit={canEdit} save={saveHoursAction} nextHref="/onboarding/calendar" />;
      break;

    case "calendar":
      content = (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Trois façons de gérer vos rendez-vous</CardTitle>
              <CardDescription>Vous choisirez celle qui correspond à votre organisation actuelle.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-4">
                {[
                  { title: "Agenda SOFIA", text: "Inclus : un agenda par praticienne, avec vos horaires et la durée de chaque prestation." },
                  { title: "Google Calendar", text: "SOFIA lit vos disponibilités et ajoute les rendez-vous dans votre agenda existant." },
                  { title: "Calendly", text: "Si vous réservez déjà avec Calendly, SOFIA s'appuie sur vos types de rendez-vous." },
                ].map((option) => (
                  <li key={option.title} className="flex gap-3">
                    <CalendarClockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span>
                      <span className="block text-sm font-medium text-foreground">{option.title}</span>
                      <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-muted-foreground">{option.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <PhaseNotice phase={7}>
            Le calendrier arrive avec le module Rendez-vous. D&apos;ici là, SOFIA ne réserve rien à votre place : aucun créneau n&apos;est proposé sans
            agenda connecté.
          </PhaseNotice>
        </div>
      );
      break;

    case "whatsapp":
    case "instagram":
    case "widget": {
      const channel = CHANNEL_SETUP[step === "widget" ? "website" : step];
      const Icon = CHANNEL_ICONS[channel.slug];
      const status = statusOf(channel.provider);
      content = (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-xs">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <CardTitle>{channel.title}</CardTitle>
                    <CardDescription>{channel.description}</CardDescription>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <StatusDot status={status} />
                  {channelStatusLabel(status)}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm font-medium text-foreground">Ce qu&apos;il vous faudra</p>
              <ul className="grid gap-2.5">
                {channel.requirements.map((requirement) => (
                  <li key={requirement} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <CircleDashedIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {requirement}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[0.8125rem] leading-relaxed text-muted-foreground">
                Préparez ces éléments dès maintenant : la connexion prendra ensuite quelques minutes.
              </p>
            </CardContent>
          </Card>
          <PhaseNotice phase={channel.phase}>
            La connexion {channel.title === "Site web" ? "du widget" : channel.title} sera disponible en phase {channel.phase}. Le statut
            « Connecté » ne s&apos;affichera qu&apos;après une connexion réellement vérifiée.
          </PhaseNotice>
        </div>
      );
      break;
    }

    case "test":
      content = (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ce que SOFIA sait déjà</CardTitle>
              <CardDescription>D&apos;après votre configuration actuelle.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3">
                <Requirement done={data.checklist.profile}>
                  {data.checklist.profile ? "Adresse et téléphone de l'établissement" : "Adresse et téléphone de l'établissement à renseigner"}
                </Requirement>
                <Requirement done={pricedServices.length > 0}>
                  {pricedServices.length > 0
                    ? `${pricedServices.length} prestation${pricedServices.length > 1 ? "s" : ""} avec un prix qu'elle peut annoncer`
                    : "Aucune prestation avec un prix"}
                </Requirement>
                {unpricedServices.length > 0 ? (
                  <Requirement done={false}>
                    Sans prix, donc jamais chiffrées par SOFIA : {unpricedServices.map((service) => service.name).join(", ")}
                  </Requirement>
                ) : null}
                <Requirement done={openDays.size > 0}>
                  {openDays.size > 0
                    ? `Ouvert ${openDays.size} jour${openDays.size > 1 ? "s" : ""} sur 7 : ${WEEKDAYS.filter((_, day) => openDays.has(day + 1))
                        .map((day) => day.toLowerCase())
                        .join(", ")}`
                    : "Horaires d'ouverture à renseigner"}
                </Requirement>
              </ul>
            </CardContent>
          </Card>
          <PhaseNotice phase={3}>
            Une conversation d&apos;essai avec SOFIA, sur un écran de test, arrive avec le moteur d&apos;intelligence artificielle. Vous verrez exactement ce
            qu&apos;elle répond avant qu&apos;une cliente ne lui écrive.
          </PhaseNotice>
        </div>
      );
      break;

    case "activation":
      content = (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Avant d&apos;activer SOFIA</CardTitle>
              <CardDescription>Chaque point est vérifié sur votre configuration réelle.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3">
                <Requirement done={data.checklist.profile}>Établissement renseigné</Requirement>
                <Requirement done={pricedServices.length > 0}>Au moins une prestation avec un prix</Requirement>
                <Requirement done={data.checklist.hours}>Horaires d&apos;ouverture</Requirement>
                <Requirement done={channelConnected}>Au moins un canal connecté (WhatsApp, Instagram ou site)</Requirement>
              </ul>
            </CardContent>
          </Card>
          <PhaseNotice phase={3}>
            L&apos;activation arrive avec le moteur d&apos;intelligence artificielle, et demandera au moins un canal connecté. Vous pourrez la mettre en
            pause à tout moment : vos conversations restent alors entre les mains de votre équipe.
          </PhaseNotice>
        </div>
      );
      break;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-12">
      <aside className="hidden lg:block">
        <div className="sticky top-24 grid gap-8">
          <StepList current={step} state={data.checklist} />
          <SetupChecklist state={data.checklist} className="rounded-xl border border-border bg-card p-4 shadow-xs" />
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-3 lg:hidden" aria-hidden>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-sofia" style={{ width: `${((index + 1) / ONBOARDING_STEPS.length) * 100}%` }} />
            </div>
          </div>
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Étape {index + 1} sur {ONBOARDING_STEPS.length}
            {phase ? ` · phase ${phase}` : ""}
          </p>
          <h1 className="mt-2 text-[1.75rem] leading-tight font-semibold sm:text-[2rem]">{definition.title}</h1>
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground">{DESCRIPTIONS[step]}</p>
        </div>

        {content}

        <nav aria-label="Navigation entre les étapes" className={cn("mt-8 flex items-center gap-3 border-t border-border pt-6", previous ? "justify-between" : "justify-end")}>
          {previous ? (
            <Link href={`/onboarding/${previous.slug}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ArrowLeftIcon aria-hidden />
              <span className="hidden sm:inline">{previous.title}</span>
              <span className="sm:hidden">Précédent</span>
            </Link>
          ) : null}
          {next ? (
            <Link href={`/onboarding/${next.slug}`} className={buttonVariants({ variant: step === "welcome" ? "default" : "outline", size: step === "welcome" ? "default" : "sm" })}>
              {step === "welcome" ? "Commencer" : <span className="hidden sm:inline">{next.title}</span>}
              {step === "welcome" ? null : <span className="sm:hidden">Suivant</span>}
              <ArrowRightIcon aria-hidden />
            </Link>
          ) : (
            <Link href="/dashboard" className={buttonVariants()}>
              Aller au dashboard
              <ArrowRightIcon aria-hidden />
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
