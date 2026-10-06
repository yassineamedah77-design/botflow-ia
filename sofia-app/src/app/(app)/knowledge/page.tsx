import { BookOpenCheckIcon, CircleAlertIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type * as React from "react";

import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDuration } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { describePrice, formatClockTime, WEEKDAYS } from "@/lib/pricing";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from "@/lib/validation/organization";
import { requireTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { getKnowledgeOverview } from "@/server/services/knowledge";

export const metadata: Metadata = { title: "Knowledge Base" };

function EditLink({ href, label }: { href: string; label: string }) {
  return (
    <CardAction>
      <Link href={href} className={buttonVariants({ variant: "ghost", size: "sm" })} aria-label={label}>
        <PencilIcon aria-hidden />
        Modifier
      </Link>
    </CardAction>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? <span className="text-muted-foreground/70">Non renseigné</span>}</dd>
    </div>
  );
}

export default async function KnowledgePage() {
  const ctx = await requireTenant();
  const knowledge = await withTenant(ctx.organization.id, (tx) => getKnowledgeOverview(tx, ctx.organization.id));
  const { profile } = knowledge;
  const canEdit = ctx.can("knowledge:write");

  const hoursByDay = WEEKDAYS.map((label, index) => ({
    label,
    ranges: knowledge.hours.filter((range) => range.dayOfWeek === index + 1),
  }));
  const unpricedServices = knowledge.services.filter((service) => !describePrice(service.priceType, service.priceCents).configured);
  const languages = ctx.organization.allowedLanguages
    .filter((language): language is (typeof SUPPORTED_LANGUAGES)[number] => (SUPPORTED_LANGUAGES as readonly string[]).includes(language))
    .map((language) => LANGUAGE_LABELS[language]);

  return (
    <>
      <PageHeader
        title="Knowledge Base"
        description="Tout ce que SOFIA a le droit de dire sur votre établissement. Ce qui n'est pas ici, elle ne l'invente pas : elle vérifie ou passe la main à votre équipe."
        actions={<Badge variant="muted">FAQ et documents en phase 3</Badge>}
      />

      <Alert variant="info" className="mb-8">
        <BookOpenCheckIcon aria-hidden />
        <AlertTitle>Exactement ce que SOFIA saura</AlertTitle>
        <AlertDescription className="text-info/85">
          L&apos;établissement, les prestations et les horaires se modifient depuis la mise en route. La FAQ et les documents arrivent avec
          l&apos;AI Orchestrator en phase 3.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Établissement</CardTitle>
            <CardDescription>Présentation, coordonnées et règles communiquées aux clientes.</CardDescription>
            {canEdit ? <EditLink href="/onboarding/establishment" label="Modifier l'établissement" /> : null}
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4">
              <Field label="Nom de l'assistante" value={profile?.assistantName} />
              <Field label="Présentation" value={profile?.description} />
              <Field label="Ton" value={profile?.tone} />
              <Field
                label="Adresse"
                value={
                  profile?.addressLine
                    ? `${profile.addressLine}, ${[profile.postalCode, profile.city].filter(Boolean).join(" ")}`
                    : null
                }
              />
              <Field label="Téléphone" value={profile?.phone ? formatPhone(profile.phone) : null} />
              <Field label="Email" value={profile?.email} />
              <Field label="Site web" value={profile?.websiteUrl} />
              <Field label="Instagram" value={profile?.instagramHandle ? `@${profile.instagramHandle}` : null} />
              <Field label="Langues de SOFIA" value={languages.join(", ")} />
              <Field label="Annulation" value={profile?.cancellationPolicy} />
              <Field label="Réservation" value={profile?.bookingPolicy} />
              <Field label="Informations importantes" value={profile?.importantInfo} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horaires</CardTitle>
            <CardDescription>Fuseau : {ctx.organization.timezone}</CardDescription>
            {canEdit ? <EditLink href="/onboarding/hours" label="Modifier les horaires" /> : null}
          </CardHeader>
          <CardContent>
            {knowledge.hours.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun horaire renseigné : SOFIA ne pourra proposer aucun créneau.
              </p>
            ) : (
              <dl className="grid gap-2.5">
                {hoursByDay.map((day) => (
                  <div key={day.label} className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-muted-foreground">{day.label}</dt>
                    <dd className={day.ranges.length === 0 ? "text-muted-foreground/70" : "font-medium tabular"}>
                      {day.ranges.length === 0
                        ? "Fermé"
                        : day.ranges.map((range) => `${formatClockTime(range.opensAt)} – ${formatClockTime(range.closesAt)}`).join(", ")}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {knowledge.closures.length > 0 ? (
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Fermetures</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {knowledge.closures.map((closure) => (
                    <li key={`${closure.startsOn}-${closure.endsOn}`}>
                      {formatDate(new Date(closure.startsOn))} → {formatDate(new Date(closure.endsOn))}
                      {closure.reason ? ` · ${closure.reason}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Prestations</CardTitle>
          <CardDescription>
            {knowledge.services.length} prestation{knowledge.services.length > 1 ? "s" : ""} active
            {knowledge.services.length > 1 ? "s" : ""}. SOFIA ne communique que les prix et durées renseignés ici.
          </CardDescription>
          {canEdit ? <EditLink href="/onboarding/services" label="Modifier les prestations" /> : null}
        </CardHeader>
        <CardContent>
          {unpricedServices.length > 0 ? (
            <Alert variant="warning" className="mb-4">
              <CircleAlertIcon aria-hidden />
              <AlertDescription className="text-warning">
                {unpricedServices.length} prestation{unpricedServices.length > 1 ? "s n'ont" : " n'a"} pas de prix : SOFIA
                répondra qu&apos;elle vérifie auprès de l&apos;équipe.
              </AlertDescription>
            </Alert>
          ) : null}
          {knowledge.services.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune prestation renseignée. Sans prestations, SOFIA ne pourra donner aucun tarif ni proposer de rendez-vous.
            </p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prestation</TableHead>
                    <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead className="text-right">Prix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {knowledge.services.map((service) => {
                    const price = describePrice(service.priceType, service.priceCents);
                    return (
                      <TableRow key={service.id}>
                        <TableCell className="max-w-[22rem] whitespace-normal">
                          <p className="font-medium">{service.name}</p>
                          {service.description ? (
                            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">{service.description}</p>
                          ) : null}
                          {service.requiresConsultation ? (
                            <Badge variant="info" className="mt-1.5">
                              Consultation préalable
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">{service.category ?? "—"}</TableCell>
                        <TableCell className="tabular">
                          {service.durationMinutes ? formatDuration(service.durationMinutes) : <span className="text-muted-foreground/70">—</span>}
                        </TableCell>
                        <TableCell className={price.configured ? "text-right font-medium tabular" : "text-right text-warning"}>
                          {price.label}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Praticiens</CardTitle>
          </CardHeader>
          <CardContent>
            {knowledge.practitioners.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun praticien renseigné.</p>
            ) : (
              <ul className="divide-y divide-border">
                {knowledge.practitioners.map((practitioner) => (
                  <li key={practitioner.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium">{practitioner.name}</p>
                    {practitioner.title ? <p className="text-[0.8125rem] text-muted-foreground">{practitioner.title}</p> : null}
                    {practitioner.services.length > 0 ? (
                      <p className="mt-1 text-[0.8125rem] text-muted-foreground">{practitioner.services.join(" · ")}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>FAQ et promotions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {knowledge.faqs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune question fréquente renseignée.</p>
            ) : (
              <dl className="space-y-3.5">
                {knowledge.faqs.map((faq) => (
                  <div key={faq.id}>
                    <dt className="text-sm font-medium">{faq.question}</dt>
                    <dd className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">{faq.answer}</dd>
                  </div>
                ))}
              </dl>
            )}
            {knowledge.promotions.length > 0 ? (
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Promotions en cours</p>
                <ul className="mt-2 space-y-2">
                  {knowledge.promotions.map((promotion) => (
                    <li key={promotion.id} className="text-sm">
                      <span className="font-medium">{promotion.title}</span>
                      {promotion.endsAt ? (
                        <span className="text-muted-foreground"> · jusqu&apos;au {formatDate(promotion.endsAt, { timeZone: ctx.organization.timezone })}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
