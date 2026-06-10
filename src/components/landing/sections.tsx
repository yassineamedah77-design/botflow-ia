import { copy } from "@/lib/landing";
import { Reveal } from "./reveal";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
      <span aria-hidden className="h-px w-8 bg-[var(--accent)]/50" />
      {children}
    </p>
  );
}

function SectionTitle({
  text,
  accent,
}: {
  text: string;
  accent: string;
}) {
  return (
    <h2 className="text-balance text-[clamp(28px,5vw,46px)] font-semibold leading-[1.12] tracking-[-0.02em]">
      {text}{" "}
      <span className="font-serif-italic text-[var(--accent)]">{accent}</span>
    </h2>
  );
}

/* ---------------- Trust / integrations ---------------- */

export function TrustBar() {
  return (
    <section aria-label="Intégrations" className="relative py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="text-center text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--fg-muted)]">
            {copy.trust.label}
          </p>
          <h2 className="mt-4 text-center text-[clamp(22px,3.6vw,34px)] font-semibold leading-snug tracking-[-0.02em]">
            {copy.trust.headline}
            <br />
            <span className="font-serif-italic text-[var(--accent)]">{copy.trust.sub}</span>
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {copy.trust.tools.map((t) => (
              <li
                key={t}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-[13.5px] font-medium text-[#cfd6cd] transition hover:border-[var(--accent)]/30 hover:text-[var(--fg)]"
              >
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-7 text-center text-[12.5px] text-[var(--fg-muted)]">
            🇪🇺 Données hébergées en Europe — Scaleway · OVH · Hetzner — DPA signé, RGPD natif
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Problem / agitation ---------------- */

export function Problem() {
  return (
    <section aria-labelledby="problem-title" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <Eyebrow>{copy.problem.eyebrow}</Eyebrow>
          <div id="problem-title">
            <SectionTitle text={copy.problem.title} accent={copy.problem.titleAccent} />
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:gap-5 md:grid-cols-3">
          {copy.problem.items.map((item, i) => (
            <Reveal key={item.title} delay={i * 110}>
              <article className="group h-full rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent p-7 transition hover:border-[var(--accent)]/25">
                <p className="text-[clamp(34px,4vw,44px)] font-semibold tracking-tight text-[var(--accent)]">
                  {item.stat}
                </p>
                <p className="mt-1 text-[12.5px] uppercase tracking-wider text-[var(--fg-muted)]">
                  {item.statLabel}
                </p>
                <h3 className="mt-6 text-[18px] font-semibold">{item.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#aab3a9]">{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={160}>
          <p className="mx-auto mt-12 max-w-2xl text-center text-[17px] leading-relaxed text-[#cfd6cd]">
            {copy.problem.closing}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Solution flow ---------------- */

export function Solution() {
  return (
    <section id="solution" aria-labelledby="solution-title" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <Eyebrow>{copy.solution.eyebrow}</Eyebrow>
          <div id="solution-title">
            <SectionTitle text={copy.solution.title} accent={copy.solution.titleAccent} />
          </div>
        </Reveal>

        <ol className="relative mt-14 grid gap-3 md:grid-cols-5 md:gap-4">
          {/* connecting line, desktop */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent md:block"
          />
          {copy.solution.steps.map((s, i) => (
            <li key={s.title} className="relative">
              <Reveal delay={i * 120} className="h-full"><div className="flex h-full flex-col items-start gap-3 rounded-2xl border border-white/[0.07] bg-[#0b0d0a]/80 p-5 md:items-center md:text-center">
                <span
                  aria-hidden
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[20px] shadow-[0_0_24px_-10px_var(--accent)]"
                >
                  {s.icon}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--fg-muted)]">{s.body}</p>
                </div>
              </div></Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------- Offers ---------------- */

export function Offers() {
  return (
    <section id="offres" aria-labelledby="offers-title" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <Eyebrow>{copy.offers.eyebrow}</Eyebrow>
          <div id="offers-title">
            <SectionTitle text={copy.offers.title} accent={copy.offers.titleAccent} />
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:gap-5 md:grid-cols-2">
          {copy.offers.items.map((o, i) => (
            <Reveal key={o.num} delay={(i % 2) * 110}>
              <article className="group relative h-full overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent p-7 transition hover:border-[var(--accent)]/25 sm:p-9">
                <span
                  aria-hidden
                  className="absolute -right-3 -top-6 select-none text-[110px] font-bold leading-none text-white/[0.04] transition group-hover:text-[var(--accent)]/[0.07]"
                >
                  {o.num}
                </span>
                <h3 className="relative text-[19px] font-semibold sm:text-[21px]">{o.title}</h3>
                <p className="font-serif-italic relative mt-3 text-[17px] leading-snug text-[var(--accent)]">
                  {o.benefit}
                </p>
                <p className="relative mt-3.5 text-[14.5px] leading-relaxed text-[#aab3a9]">{o.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Process ---------------- */

export function Process() {
  return (
    <section id="procede" aria-labelledby="process-title" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <Reveal>
          <Eyebrow>{copy.process.eyebrow}</Eyebrow>
          <div id="process-title">
            <SectionTitle text={copy.process.title} accent={copy.process.titleAccent} />
          </div>
        </Reveal>

        <ol className="relative mt-14 space-y-0 border-l border-white/[0.08] pl-8 sm:pl-12">
          {copy.process.steps.map((s, i) => (
            <li key={s.num} className="relative pb-11 last:pb-0">
              <Reveal delay={i * 90}>
              <span
                aria-hidden
                className="absolute -left-8 top-0.5 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[#0b0d0a] text-[10.5px] font-bold text-[var(--accent)] shadow-[0_0_18px_-6px_var(--accent)] sm:-left-12"
              >
                {s.num}
              </span>
              <h3 className="text-[17px] font-semibold sm:text-[19px]">{s.title}</h3>
              <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-[#aab3a9]">{s.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
