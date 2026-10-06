import { ArrowLeftIcon, BotIcon, MailIcon, PhoneIcon, ShieldOffIcon, UserRoundIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";

import { InstagramIcon } from "@/components/brand/channel-icons";
import { DeleteLeadButton, EditLeadDialog, LeadAssigneeSelect, LeadNotes, LeadStatusSelect } from "@/components/leads/lead-actions";
import { ChannelIcon, LeadAvatar, LeadOrigin, LeadStatusBadge, ScoreMeter } from "@/components/leads/lead-bits";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APPOINTMENT_STATUS_META,
  ATTRIBUTION_LABELS,
  CONSENT_LABELS,
  CONSENT_SOURCE_LABELS,
  INTENT_LEVEL_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_META,
} from "@/lib/crm";
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { LANGUAGE_LABELS, type SupportedLanguage } from "@/lib/validation/organization";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { getLeadDetail, listAssignableMembers, listServiceOptions } from "@/server/services/leads";

export const metadata: Metadata = { title: "Fiche contact" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

const muted = <span className="text-muted-foreground">—</span>;

export default async function LeadPage(props: PageProps<"/leads/[id]">) {
  const ctx = await requireTenant();
  const { id } = await props.params;
  if (!UUID_PATTERN.test(id)) notFound();
  const organizationId = ctx.organization.id;
  const now = new Date();

  const data = await withTenant(organizationId, async (tx) => {
    const detail = await getLeadDetail(tx, organizationId, id);
    if (!detail) return null;
    return { detail, members: await listAssignableMembers(tx, organizationId), services: await listServiceOptions(tx, organizationId) };
  });
  if (!data) notFound();

  const { detail, members, services } = data;
  const { lead } = detail;
  const currency = ctx.organization.currency;
  const timeZone = ctx.organization.timezone;
  const canWrite = ctx.can("leads:write");
  const confirmedRevenue = detail.revenue.filter((row) => row.status === "CONFIRMED").reduce((total, row) => total + row.amountCents, 0);
  const pendingRevenue = detail.revenue.filter((row) => row.status === "ESTIMATED").reduce((total, row) => total + row.amountCents, 0);
  const language = lead.language && lead.language in LANGUAGE_LABELS ? LANGUAGE_LABELS[lead.language as SupportedLanguage] : null;

  return (
    <>
      <Link href="/leads" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden />
        Leads
      </Link>

      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <LeadAvatar name={lead.name} seed={lead.id} className="size-14 text-base" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[1.75rem] leading-tight font-semibold">{lead.name}</h1>
              <LeadStatusBadge status={lead.status} />
              {lead.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <LeadOrigin source={lead.source} channel={lead.channel} withLabel />
              <span aria-hidden>·</span>
              <span>Contact depuis le {formatDate(lead.createdAt, { timeZone })}</span>
              {lead.isExistingClient ? (
                <>
                  <span aria-hidden>·</span>
                  <span>Client·e de l&apos;établissement</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:flex-nowrap">
            <LeadStatusSelect leadId={lead.id} status={lead.status} />
            <LeadAssigneeSelect leadId={lead.id} assigneeId={lead.assignedToUserId} members={members} />
            <EditLeadDialog
              leadId={lead.id}
              services={services}
              members={members}
              optedOut={Boolean(lead.optedOutAt)}
              defaults={{
                firstName: lead.firstName ?? "",
                lastName: lead.lastName ?? "",
                phone: lead.phone ? formatPhone(lead.phone) : "",
                email: lead.email ?? "",
                instagramHandle: lead.instagramHandle ?? "",
                source: ["MANUAL", "REFERRAL", "WHATSAPP", "INSTAGRAM", "WEBSITE", "OTHER"].includes(lead.source) ? lead.source : "OTHER",
                interestedServiceId: lead.interestedServiceId ?? "",
                potentialValue: lead.potentialValueCents !== null ? String(lead.potentialValueCents / 100).replace(".", ",") : "",
                assignedToUserId: lead.assignedToUserId ?? "",
                marketingConsent: lead.marketingConsent,
              }}
            />
            {ctx.can("leads:delete") ? <DeleteLeadButton leadId={lead.id} name={lead.name} /> : null}
          </div>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>Tous les échanges avec SOFIA et l&apos;équipe, par canal.</CardDescription>
            </CardHeader>
            <CardContent>
              {detail.conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune conversation : ce contact a été ajouté par l&apos;équipe ou importé depuis le fichier clients.
                </p>
              ) : (
                <ul className="-mx-2">
                  {detail.conversations.map((conversation) => (
                    <li key={conversation.id} className="min-w-0">
                      <Link
                        href={`/inbox?conversation=${conversation.id}`}
                        className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60"
                      >
                        <ChannelIcon channel={conversation.channel} className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{conversation.lastMessagePreview ?? "Conversation sans message"}</p>
                          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            {conversation.lastMessageAt ? formatRelativeTime(conversation.lastMessageAt, now) : null}
                            <span aria-hidden>·</span>
                            {conversation.handlingMode === "HUMAN_ACTIVE" ? (
                              <span className="inline-flex items-center gap-1">
                                <UserRoundIcon className="size-3" aria-hidden />
                                Équipe
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <BotIcon className="size-3" aria-hidden />
                                SOFIA
                              </span>
                            )}
                          </p>
                        </div>
                        {conversation.unreadCount > 0 ? (
                          <Badge variant="sofia" className="tabular">
                            {conversation.unreadCount} non lu{conversation.unreadCount > 1 ? "s" : ""}
                          </Badge>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rendez-vous</CardTitle>
              <CardDescription>Le chiffre d&apos;affaires n&apos;est compté qu&apos;une fois le rendez-vous honoré.</CardDescription>
            </CardHeader>
            <CardContent>
              {detail.appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {lead.lastAppointmentAt
                    ? `Pas encore de rendez-vous dans SOFIA. Dernière visite d'après le fichier clients : ${formatDate(lead.lastAppointmentAt, { timeZone })}.`
                    : "Aucun rendez-vous pour l'instant."}
                </p>
              ) : (
                <ul className="grid divide-y divide-border">
                  {detail.appointments.map((appointment) => {
                    const meta = APPOINTMENT_STATUS_META[appointment.status];
                    return (
                      <li key={appointment.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{appointment.serviceName ?? "Prestation supprimée"}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDateTime(appointment.startsAt, { timeZone })} · {appointment.source === "AI" ? "réservé par SOFIA" : "réservé par l'équipe"}
                          </p>
                          {appointment.attribution && appointment.attribution.status !== "CANCELLED" ? (
                            <p className="mt-1.5 text-xs font-medium text-sofia-strong">
                              {ATTRIBUTION_LABELS[appointment.attribution.attributionType]}
                              {appointment.attribution.status === "ESTIMATED" ? " · estimé" : null}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={meta.tone}>{meta.label}</Badge>
                          <span className="text-sm tabular">
                            {appointment.priceCents !== null ? formatCurrency(appointment.priceCents, currency) : "Prix non configuré"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes de l&apos;équipe</CardTitle>
              <CardDescription>Visibles par toute l&apos;équipe, jamais par le contact.</CardDescription>
            </CardHeader>
            <CardContent>
              <LeadNotes
                leadId={lead.id}
                now={now}
                canWrite={canWrite}
                notes={detail.notes.map((note) => ({
                  id: note.id,
                  body: note.body,
                  createdAt: note.createdAt,
                  authorName: note.authorName,
                  canDelete: canWrite && (note.authorUserId === ctx.user.id || ctx.can("leads:delete")),
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historique du pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun changement d&apos;étape enregistré.</p>
              ) : (
                <ol className="relative grid gap-4 border-l border-border pl-5">
                  {detail.history.map((change) => (
                    <li key={change.id} className="relative">
                      <span className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full border-2 border-card bg-sand-strong" aria-hidden />
                      <p className="text-sm">
                        {change.fromStatus ? (
                          <>
                            <span className="text-muted-foreground">{LEAD_STATUS_META[change.fromStatus].label}</span>
                            <span aria-hidden> → </span>
                            <span className="sr-only"> vers </span>
                          </>
                        ) : null}
                        <span className="font-medium">{LEAD_STATUS_META[change.toStatus].label}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {change.actorType === "AI" ? "SOFIA" : change.actorType === "SYSTEM" ? "Automatique" : (change.actorName ?? "Équipe")} ·{" "}
                        {formatDateTime(change.createdAt, { timeZone })}
                        {change.reason ? ` · ${change.reason}` : null}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Coordonnées</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="-my-2.5 divide-y divide-border">
                <Detail label="Téléphone">
                  {lead.phone ? (
                    <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <PhoneIcon className="size-3.5 text-muted-foreground" aria-hidden />
                      {formatPhone(lead.phone)}
                    </a>
                  ) : (
                    muted
                  )}
                </Detail>
                <Detail label="Email">
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="inline-flex max-w-full items-center gap-1.5 hover:underline">
                      <MailIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate">{lead.email}</span>
                    </a>
                  ) : (
                    muted
                  )}
                </Detail>
                <Detail label="Instagram">
                  {lead.instagramHandle ? (
                    <a
                      href={`https://www.instagram.com/${lead.instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      <InstagramIcon className="size-3.5 text-muted-foreground" />@{lead.instagramHandle}
                    </a>
                  ) : (
                    muted
                  )}
                </Detail>
                <Detail label="WhatsApp">{lead.whatsappId ? "Conversation ouverte" : muted}</Detail>
                <Detail label="Langue">{language ?? muted}</Detail>
                <Detail label="Source">{LEAD_SOURCE_LABELS[lead.source]}</Detail>
                <Detail label="Dernière interaction">{lead.lastInteractionAt ? formatRelativeTime(lead.lastInteractionAt, now) : muted}</Detail>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Potentiel et valeur</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="-my-2.5 divide-y divide-border">
                <Detail label="Score">
                  <ScoreMeter score={lead.score} />
                </Detail>
                <Detail label="Intention">{INTENT_LEVEL_LABELS[lead.intentLevel]}</Detail>
                <Detail label="Prestation recherchée">{detail.service?.name ?? muted}</Detail>
                <Detail label="Valeur potentielle">
                  {lead.potentialValueCents !== null ? <span className="tabular">{formatCurrency(lead.potentialValueCents, currency)}</span> : muted}
                </Detail>
                <Detail label="Valeur générée par SOFIA">
                  <span className="tabular">{formatCurrency(confirmedRevenue, currency)}</span>
                  {pendingRevenue > 0 ? (
                    <span className="block text-xs text-muted-foreground tabular">+ {formatCurrency(pendingRevenue, currency)} à venir</span>
                  ) : null}
                </Detail>
                <Detail label="Prochaine relance">
                  {lead.nextFollowUpAt ? (
                    <span className={cn(lead.nextFollowUpAt <= now && "font-medium text-sofia-strong")}>
                      {lead.nextFollowUpAt <= now ? "À relancer" : formatRelativeTime(lead.nextFollowUpAt, now)}
                    </span>
                  ) : (
                    muted
                  )}
                </Detail>
                {lead.isExistingClient ? (
                  <>
                    <Detail label="Visites">{lead.visitCount || muted}</Detail>
                    <Detail label="Dernière visite">{lead.lastAppointmentAt ? formatDate(lead.lastAppointmentAt, { timeZone }) : muted}</Detail>
                    {lead.lifetimeValueCents !== null ? (
                      <Detail label="Total dépensé">
                        <span className="tabular">{formatCurrency(lead.lifetimeValueCents, currency)}</span>
                      </Detail>
                    ) : null}
                  </>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consentement</CardTitle>
              <CardDescription>Aucun message commercial sans base légale.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {lead.optedOutAt ? (
                <p className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-destructive">
                  <ShieldOffIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                  A demandé à ne plus recevoir de messages le {formatDate(lead.optedOutAt, { timeZone })}.
                </p>
              ) : null}
              <dl className="-my-2.5 divide-y divide-border">
                <Detail label="Marketing">
                  {CONSENT_LABELS[lead.marketingConsent]}
                  {lead.marketingConsentUpdatedAt ? (
                    <span className="block text-xs text-muted-foreground">le {formatDate(lead.marketingConsentUpdatedAt, { timeZone })}</span>
                  ) : null}
                </Detail>
              </dl>
              {detail.consents.length > 0 ? (
                <ul className="grid gap-1.5 text-xs text-muted-foreground">
                  {detail.consents.slice(0, 4).map((consent) => (
                    <li key={consent.id}>
                      {CONSENT_LABELS[consent.status]} · {CONSENT_SOURCE_LABELS[consent.source] ?? consent.source} ·{" "}
                      {formatDate(consent.createdAt, { timeZone })}
                    </li>
                  ))}
                </ul>
              ) : null}
              {detail.importInfo ? (
                <p className="text-xs text-muted-foreground">
                  Importé depuis « {detail.importInfo.fileName} » le {formatDate(detail.importInfo.createdAt, { timeZone })}.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
