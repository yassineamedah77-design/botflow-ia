import { copy } from "@/lib/landing";
import { CalendlyButton } from "./calendly";
import { Reveal } from "./reveal";

/** FAQ — native <details>/<summary>: zero JS, keyboard accessible. */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1fr_1.6fr] md:gap-14">
          <Reveal>
            <div className="md:sticky md:top-28">
              <p className="mb-4 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                <span aria-hidden className="h-px w-8 bg-[var(--accent)]/50" />
                {copy.faq.eyebrow}
              </p>
              <h2
                id="faq-title"
                className="text-balance text-[clamp(28px,5vw,46px)] font-semibold leading-[1.12] tracking-[-0.02em]"
              >
                {copy.faq.title}{" "}
                <span className="font-serif-italic text-[var(--accent)]">{copy.faq.titleAccent}</span>
              </h2>
              <p className="mt-5 text-[14.5px] leading-relaxed text-[#aab3a9]">{copy.faq.sideText}</p>
              <CalendlyButton
                utm="utm_source=landing&utm_medium=faq"
                className="mt-7 cursor-pointer rounded-xl border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-6 py-3.5 text-[14px] font-semibold text-[#d8f5c5] transition hover:bg-[var(--accent)]/20"
              >
                {copy.faq.sideCta} <span aria-hidden>→</span>
              </CalendlyButton>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="divide-y divide-white/[0.07] rounded-3xl border border-white/[0.07] bg-white/[0.02]">
              {copy.faq.items.map((item, i) => (
                <details key={item.q} className="faq-item group" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[15px] font-medium transition hover:text-[var(--accent)] sm:px-7 [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span
                      aria-hidden
                      className="shrink-0 text-[var(--accent)] transition-transform duration-300 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="px-6 pb-6 text-[14px] leading-relaxed text-[#aab3a9] sm:px-7">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
