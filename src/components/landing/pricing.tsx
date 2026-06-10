import { copy } from "@/lib/landing";
import { CalendlyButton } from "./calendly";
import { Reveal } from "./reveal";

export function Pricing() {
  return (
    <section id="tarifs" aria-labelledby="pricing-title" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="mb-4 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            <span aria-hidden className="h-px w-8 bg-[var(--accent)]/50" />
            {copy.pricing.eyebrow}
          </p>
          <h2
            id="pricing-title"
            className="text-balance text-[clamp(28px,5vw,46px)] font-semibold leading-[1.12] tracking-[-0.02em]"
          >
            {copy.pricing.title}{" "}
            <span className="font-serif-italic text-[var(--accent)]">{copy.pricing.titleAccent}</span>
          </h2>
          <p className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/[0.07] px-4 py-2 text-[12.5px] font-medium text-[#d8f5c5]">
            <span aria-hidden>🛡</span> {copy.pricing.guarantee}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3 md:items-stretch">
          {copy.pricing.packs.map((p, i) => (
            <Reveal key={p.name} delay={i * 110} className="h-full">
              <article
                className={`relative flex h-full flex-col rounded-3xl border p-7 sm:p-8 ${
                  p.featured
                    ? "border-[var(--accent)]/45 bg-gradient-to-b from-[var(--accent)]/[0.10] to-transparent shadow-[0_0_60px_-20px_var(--accent)]"
                    : "border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent"
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-[#062013]">
                    Le plus choisi
                  </span>
                )}
                <h3 className="text-[20px] font-semibold">{p.name}</h3>
                <p className="mt-1.5 min-h-[40px] text-[13px] leading-snug text-[var(--fg-muted)]">
                  {p.tagline}
                </p>
                <p className="mt-6">
                  <span className="text-[clamp(32px,3.5vw,40px)] font-semibold tracking-tight">
                    {p.setup}
                  </span>
                  <span className="text-[13px] text-[var(--fg-muted)]"> HT setup</span>
                </p>
                <p className="text-[14px] text-[#cfd6cd]">
                  + {p.monthly} <span className="text-[var(--fg-muted)]">HT / mois</span>
                </p>
                <p className="mt-2 text-[12px] font-medium uppercase tracking-wider text-[var(--accent)]">
                  {p.deploy}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 border-t border-white/[0.07] pt-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[13.5px] leading-snug text-[#cfd6cd]">
                      <span aria-hidden className="mt-0.5 text-[var(--accent)]">
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <CalendlyButton
                  utm={`utm_source=landing&utm_medium=pricing&utm_content=${p.name.toLowerCase()}`}
                  className={`mt-8 w-full cursor-pointer rounded-xl px-5 py-3.5 text-[14px] font-semibold transition active:scale-[.98] ${
                    p.featured
                      ? "bg-[var(--accent)] text-[#062013] shadow-[0_0_36px_-10px_var(--accent)] hover:brightness-105"
                      : "border border-white/12 bg-white/[0.04] text-[var(--fg)] hover:border-[var(--accent)]/40"
                  }`}
                >
                  Réserver mon audit gratuit (30 min)
                </CalendlyButton>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={140}>
          <p className="mx-auto mt-10 max-w-xl text-center text-[14px] leading-relaxed text-[var(--fg-muted)]">
            {copy.pricing.note}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
