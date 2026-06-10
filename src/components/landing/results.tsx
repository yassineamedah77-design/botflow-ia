import { copy } from "@/lib/landing";
import { Counter } from "./counter";
import { Reveal } from "./reveal";

export function Results() {
  return (
    <section id="resultats" aria-labelledby="results-title" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="mb-4 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            <span aria-hidden className="h-px w-8 bg-[var(--accent)]/50" />
            {copy.results.eyebrow}
          </p>
          <h2
            id="results-title"
            className="text-balance text-[clamp(28px,5vw,46px)] font-semibold leading-[1.12] tracking-[-0.02em]"
          >
            {copy.results.title}{" "}
            <span className="font-serif-italic text-[var(--accent)]">{copy.results.titleAccent}</span>
          </h2>
        </Reveal>

        {/* Stats */}
        <Reveal delay={100}>
          <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.06] md:grid-cols-4">
            {copy.results.stats.map((s) => (
              <div key={s.label} className="bg-[#0b0d0a] p-7 text-center sm:p-9">
                <dd className="order-first text-[clamp(30px,4.5vw,46px)] font-semibold tracking-tight text-[var(--accent)]">
                  <Counter value={s.value} prefix={s.prefix} suffix={s.suffix} />
                </dd>
                <dt className="mt-1.5 text-[13px] leading-snug text-[var(--fg-muted)]">{s.label}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-center text-[12px] italic text-[var(--fg-muted)]">
            {copy.results.disclaimer}
          </p>
        </Reveal>

        {/* Case studies — honest "representative" label */}
        <Reveal delay={120}>
          <p className="mt-16 mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] text-[var(--fg-muted)]">
            <span aria-hidden>ⓘ</span> {copy.results.casesLabel}
          </p>
        </Reveal>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          {copy.results.cases.map((c, i) => (
            <Reveal key={c.title} delay={(i % 2) * 110}>
              <article className="group h-full rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-transparent p-7 transition hover:border-[var(--accent)]/25 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                  <span className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-1 font-medium text-[#d8f5c5]">
                    {c.tag}
                  </span>
                  <span className="text-[var(--fg-muted)]">{c.place}</span>
                </div>
                <h3 className="mt-5 text-[18px] font-semibold leading-snug">{c.title}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-[#aab3a9]">{c.body}</p>
                <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-5">
                  {c.kpis.map((k) => (
                    <div key={k.l}>
                      <dd className="order-first text-[19px] font-semibold text-[var(--accent)]">{k.v}</dd>
                      <dt className="mt-0.5 text-[11.5px] leading-tight text-[var(--fg-muted)]">{k.l}</dt>
                    </div>
                  ))}
                </dl>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
