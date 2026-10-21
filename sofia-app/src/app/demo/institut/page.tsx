import { and, asc, eq } from "drizzle-orm";
import { ArrowRightIcon, ClockIcon, MapPinIcon, PhoneIcon, SparklesIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { WidgetPreview } from "@/components/channels/widget-preview";
import { buttonVariants } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { describePrice, formatClockTime, WEEKDAYS } from "@/lib/pricing";
import { getCurrentTenant } from "@/server/auth/dal";
import { withTenant } from "@/server/db/context";
import { businessHours, businessProfiles, services } from "@/server/db/schema";
import { isDemoMode } from "@/server/demo/sandbox";

export const metadata: Metadata = { title: "Maison Éclat — Institut de beauté (démo)" };

const PROMPTS = [
  "Combien coûte un Hydrafacial ?",
  "Je voudrais un rendez-vous samedi matin",
  "J'ai des rougeurs depuis mon peeling, c'est normal ?",
  "Vous êtes un robot ?",
];

/**
 * The demo establishment's own website, as its clients see it, with the real
 * widget installed. Everything shown comes from the establishment's data.
 */
export default async function DemoInstitutePage() {
  if (!isDemoMode()) redirect("/login");
  const ctx = await getCurrentTenant();
  if (!ctx?.organization.isDemo) redirect("/demo");
  const organizationId = ctx.organization.id;

  const { profile, catalog, hours } = await withTenant(organizationId, async (tx) => ({
    profile: (await tx.select().from(businessProfiles).where(eq(businessProfiles.organizationId, organizationId)).limit(1))[0],
    catalog: await tx
      .select()
      .from(services)
      .where(and(eq(services.organizationId, organizationId), eq(services.isActive, true)))
      .orderBy(asc(services.sortOrder))
      .limit(9),
    hours: await tx.select().from(businessHours).where(eq(businessHours.organizationId, organizationId)).orderBy(asc(businessHours.dayOfWeek), asc(businessHours.opensAt)),
  }));
  const assistant = profile?.assistantName ?? "SOFIA";

  return (
    <div className="min-h-dvh bg-[#faf7f2] text-[#2b2522]">
      <div className="sticky top-0 z-10 border-b border-sofia/25 bg-sofia-soft/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 text-sm text-sofia-strong sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="flex items-start gap-2 sm:items-center">
            <SparklesIcon className="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden />
            <span>
              <strong className="font-semibold">Démo SOFIA</strong> · Vous êtes une visiteuse du site de {ctx.organization.name}. Écrivez à{" "}
              {assistant} en bas à droite.
            </span>
          </p>
          <Link href="/dashboard" className={buttonVariants({ size: "sm", className: "self-start sm:self-auto" })}>
            Ouvrir le tableau de bord
            <ArrowRightIcon aria-hidden />
          </Link>
        </div>
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-8">
        <p className="font-heading text-xl font-semibold tracking-tight">{ctx.organization.name}</p>
        <nav className="hidden gap-6 text-sm text-[#6b5f58] sm:flex" aria-label="Site de l'institut">
          <a href="#soins">Soins</a>
          <a href="#horaires">Horaires</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 pb-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-14">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-sofia-strong uppercase">Institut de beauté · Paris 4e</p>
            <h1 className="mt-4 font-heading text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
              Révélez l&apos;éclat naturel de votre peau.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#6b5f58]">
              Soins du visage, épilation laser, soins du corps et médecine esthétique, au cœur du Marais. Une question, un
              rendez-vous ? Notre assistante vous répond à toute heure.
            </p>
            <div className="mt-8 rounded-2xl border border-[#eadfd6] bg-white/70 p-5">
              <p className="text-sm font-semibold">Essayez par exemple :</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {PROMPTS.map((prompt) => (
                  <li key={prompt} className="rounded-full border border-[#eadfd6] bg-white px-3 py-1.5 text-sm text-[#4a403b]">
                    « {prompt} »
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#f3d9c9] via-[#f7e9de] to-[#e8cdbb]" aria-hidden>
            <div className="absolute -right-16 -bottom-16 size-72 rounded-full bg-white/40 blur-2xl" />
            <div className="absolute top-10 left-10 size-40 rounded-full bg-sofia/20 blur-3xl" />
            <p className="absolute bottom-8 left-8 font-heading text-3xl font-semibold text-[#7a4a35]/70">Maison Éclat</p>
          </div>
        </section>

        <section id="soins" className="border-t border-[#eadfd6] bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
            <h2 className="font-heading text-3xl font-semibold tracking-tight">Nos soins</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.map((service) => (
                <li key={service.id} className="flex flex-col rounded-2xl border border-[#eadfd6] bg-white p-5">
                  <p className="text-xs font-medium tracking-wide text-[#9a8a80] uppercase">{service.category}</p>
                  <p className="mt-1.5 font-semibold">{service.name}</p>
                  {service.description ? <p className="mt-2 flex-1 text-sm leading-relaxed text-[#6b5f58]">{service.description}</p> : null}
                  <p className="mt-4 text-sm font-semibold text-sofia-strong">
                    {describePrice(service.priceType, service.priceCents).label}
                    {service.durationMinutes ? <span className="font-normal text-[#9a8a80]"> · {formatDuration(service.durationMinutes)}</span> : null}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-8 md:grid-cols-2">
          <div id="horaires">
            <h2 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
              <ClockIcon className="size-5 text-sofia-strong" aria-hidden />
              Horaires
            </h2>
            <dl className="mt-5 grid gap-2 text-sm">
              {WEEKDAYS.map((day, index) => {
                const ranges = hours.filter((range) => range.dayOfWeek === index + 1);
                return (
                  <div key={day} className="flex justify-between gap-4 border-b border-[#eadfd6] pb-2">
                    <dt>{day}</dt>
                    <dd className="text-[#6b5f58]">
                      {ranges.length ? ranges.map((range) => `${formatClockTime(range.opensAt)} – ${formatClockTime(range.closesAt)}`).join(", ") : "Fermé"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
          <div id="contact">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">Nous trouver</h2>
            <ul className="mt-5 grid gap-3 text-sm text-[#4a403b]">
              <li className="flex gap-2">
                <MapPinIcon className="size-4 shrink-0 text-sofia-strong" aria-hidden />
                {[profile?.addressLine, [profile?.postalCode, profile?.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
              </li>
              {profile?.phone ? (
                <li className="flex gap-2">
                  <PhoneIcon className="size-4 shrink-0 text-sofia-strong" aria-hidden />
                  {formatPhone(profile.phone)}
                </li>
              ) : null}
            </ul>
            {profile?.importantInfo ? <p className="mt-4 text-sm leading-relaxed text-[#6b5f58]">{profile.importantInfo}</p> : null}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#eadfd6] px-4 py-8 text-center text-xs text-[#9a8a80]">
        Site fictif de démonstration · {ctx.organization.name} n&apos;existe pas · Assistante propulsée par SOFIA
      </footer>

      <WidgetPreview publicId={ctx.organization.widgetPublicId} />
    </div>
  );
}
