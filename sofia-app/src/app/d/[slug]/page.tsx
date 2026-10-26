import { and, asc, eq } from "drizzle-orm";
import { ClockIcon, MapPinIcon, PhoneIcon, SparklesIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WidgetPreview } from "@/components/channels/widget-preview";
import { formatCurrency, formatDuration } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { formatClockTime } from "@/lib/pricing";
import { withTenant } from "@/server/db/context";
import { businessHours, businessProfiles, organizations, services } from "@/server/db/schema";
import { findPreparedDemo } from "@/server/demo/prepared";

/*
 * The public page of a prepared prospect clinic (demo deployment): what its
 * manager opens on her phone during the call, with the real widget, in her
 * language. Everything shown comes from what was entered for the clinic.
 */

const TEXTS = {
  pt: {
    banner: (name: string, assistant: string) => `Demonstração · ${assistant} é a assistente virtual da ${name}. Escreva-lhe no canto inferior direito.`,
    kicker: (city: string) => `Clínica de estética · ${city}`,
    title: "Cuidamos da sua pele, ao seu ritmo.",
    intro: (assistant: string) => `Uma pergunta, uma marcação? A ${assistant} responde a qualquer hora, com as informações da clínica.`,
    tryTitle: "Experimente perguntar:",
    prompts: ["Quanto custa a limpeza de pele? Têm vaga esta semana?", "Qual é o vosso horário ao sábado?", "Fiz um peeling e tenho vermelhidão, é normal?", "É um robô?"],
    services: "Tratamentos",
    onConsultation: "Preço indicado em consulta",
    hours: "Horário",
    closed: "Encerrado",
    contact: "Contactos",
    days: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"],
    footer: "Página de demonstração criada pela BotFlow IA · Assistente SOFIA",
    locale: "pt-PT",
  },
  fr: {
    banner: (name: string, assistant: string) => `Démonstration · ${assistant} est l'assistante virtuelle de ${name}. Écrivez-lui en bas à droite.`,
    kicker: (city: string) => `Institut et clinique esthétique · ${city}`,
    title: "Prenez soin de votre peau, à votre rythme.",
    intro: (assistant: string) => `Une question, un rendez-vous ? ${assistant} vous répond à toute heure, avec les informations de l'établissement.`,
    tryTitle: "Essayez par exemple :",
    prompts: ["Combien coûte un nettoyage de peau ? Vous avez de la place cette semaine ?", "Vous êtes ouverts le samedi ?", "J'ai des rougeurs depuis mon peeling, c'est normal ?", "Vous êtes un robot ?"],
    services: "Nos soins",
    onConsultation: "Prix indiqué en consultation",
    hours: "Horaires",
    closed: "Fermé",
    contact: "Contact",
    days: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
    footer: "Page de démonstration créée par BotFlow IA · Assistante SOFIA",
    locale: "fr-FR",
  },
} as const;

async function load(slug: string) {
  const demo = await findPreparedDemo(slug);
  if (!demo) return null;
  const organizationId = demo.organizationId;
  return withTenant(organizationId, async (tx) => ({
    demo,
    organization: (await tx.select().from(organizations).where(eq(organizations.id, organizationId)))[0]!,
    profile: (await tx.select().from(businessProfiles).where(eq(businessProfiles.organizationId, organizationId)).limit(1))[0],
    catalog: await tx
      .select()
      .from(services)
      .where(and(eq(services.organizationId, organizationId), eq(services.isActive, true)))
      .orderBy(asc(services.sortOrder)),
    hours: await tx
      .select()
      .from(businessHours)
      .where(eq(businessHours.organizationId, organizationId))
      .orderBy(asc(businessHours.dayOfWeek), asc(businessHours.opensAt)),
  }));
}

export async function generateMetadata({ params }: PageProps<"/d/[slug]">): Promise<Metadata> {
  const demo = await findPreparedDemo((await params).slug);
  return { title: demo ? demo.name : "Démonstration", robots: { index: false } };
}

export default async function PreparedClinicPage({ params }: PageProps<"/d/[slug]">) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { organization, profile, catalog, hours } = data;
  const t = organization.defaultLanguage === "fr" ? TEXTS.fr : TEXTS.pt;
  const assistant = profile?.assistantName ?? "Sofia";
  const city = profile?.city ?? "";
  const address = [profile?.addressLine, [profile?.postalCode, profile?.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <div lang={organization.defaultLanguage} className="min-h-dvh bg-[#faf7f2] text-[#2b2522]">
      <div className="sticky top-0 z-10 border-b border-sofia/25 bg-sofia-soft/95 backdrop-blur">
        <p className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2.5 text-sm text-sofia-strong sm:items-center sm:px-8">
          <SparklesIcon className="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden />
          {t.banner(organization.name, assistant)}
        </p>
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-8">
        <p className="font-heading text-xl font-semibold tracking-tight">{organization.name}</p>
        {profile?.phone ? <p className="hidden text-sm text-[#6b5f58] sm:block">{formatPhone(profile.phone)}</p> : null}
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-6 pb-14 sm:px-8 lg:pt-12">
          <p className="text-xs font-semibold tracking-[0.2em] text-sofia-strong uppercase">{t.kicker(city)}</p>
          <h1 className="mt-4 max-w-3xl font-heading text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">{t.title}</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#6b5f58]">{t.intro(assistant)}</p>
          <div className="mt-8 max-w-2xl rounded-2xl border border-[#eadfd6] bg-white/70 p-5">
            <p className="text-sm font-semibold">{t.tryTitle}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {t.prompts.map((prompt) => (
                <li key={prompt} className="rounded-full border border-[#eadfd6] bg-white px-3 py-1.5 text-sm text-[#4a403b]">
                  « {prompt} »
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-[#eadfd6] bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
            <h2 className="font-heading text-3xl font-semibold tracking-tight">{t.services}</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.map((service) => (
                <li key={service.id} className="flex flex-col rounded-2xl border border-[#eadfd6] bg-white p-5">
                  <p className="font-semibold">{service.name}</p>
                  <p className="mt-3 text-sm font-semibold text-sofia-strong">
                    {service.priceCents !== null && service.priceType !== "ON_CONSULTATION"
                      ? formatCurrency(service.priceCents, organization.currency, t.locale)
                      : t.onConsultation}
                    {service.durationMinutes ? <span className="font-normal text-[#9a8a80]"> · {formatDuration(service.durationMinutes)}</span> : null}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
              <ClockIcon className="size-5 text-sofia-strong" aria-hidden />
              {t.hours}
            </h2>
            <dl className="mt-5 grid gap-2 text-sm">
              {t.days.map((day, index) => {
                const ranges = hours.filter((range) => range.dayOfWeek === index + 1);
                return (
                  <div key={day} className="flex justify-between gap-4 border-b border-[#eadfd6] pb-2">
                    <dt>{day}</dt>
                    <dd className="text-[#6b5f58]">
                      {ranges.length ? ranges.map((range) => `${formatClockTime(range.opensAt)} – ${formatClockTime(range.closesAt)}`).join(", ") : t.closed}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight">{t.contact}</h2>
            <ul className="mt-5 grid gap-3 text-sm text-[#4a403b]">
              {address ? (
                <li className="flex gap-2">
                  <MapPinIcon className="size-4 shrink-0 text-sofia-strong" aria-hidden />
                  {address}
                </li>
              ) : null}
              {profile?.phone ? (
                <li className="flex gap-2">
                  <PhoneIcon className="size-4 shrink-0 text-sofia-strong" aria-hidden />
                  {formatPhone(profile.phone)}
                </li>
              ) : null}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#eadfd6] px-4 py-8 pb-28 text-center text-xs text-[#9a8a80]">{t.footer}</footer>

      <WidgetPreview publicId={organization.widgetPublicId} />
    </div>
  );
}
