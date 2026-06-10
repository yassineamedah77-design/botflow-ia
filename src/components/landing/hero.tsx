import { copy } from "@/lib/landing";
import { CalendlyButton } from "./calendly";

/**
 * Hero — answers in 5 seconds: who it's for, what it solves, what to do now.
 * Entrance: short CSS-only staggered rise (~0.9s total), never blocks paint.
 */
export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pt-24 pb-16 text-center sm:px-8"
    >
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 hero-aurora" />
        <div className="absolute inset-0 hero-grid" />
        <div className="absolute left-1/2 top-[-30%] h-[700px] w-[min(1100px,140vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(122,252,165,.14),transparent_60%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Availability badge — authentic scarcity */}
        <p className="hero-in mb-7 inline-flex items-center gap-2.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2 text-[12.5px] font-medium tracking-wide text-[#d8f5c5]">
          <span
            aria-hidden
            className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"
          />
          {copy.hero.badge}
        </p>

        <h1 className="text-balance text-[clamp(34px,8.5vw,72px)] font-semibold leading-[1.06] tracking-[-0.03em] text-[#f5fff0]">
          <span className="hero-in block" style={{ animationDelay: "80ms" }}>
            {copy.hero.h1Line1}
          </span>
          <span
            className="hero-in font-serif-italic block text-[var(--accent)] [text-shadow:0_0_40px_rgba(122,252,165,.35)]"
            style={{ animationDelay: "180ms" }}
          >
            {copy.hero.h1Accent}
          </span>
          <span className="hero-in block" style={{ animationDelay: "280ms" }}>
            {copy.hero.h1Line2}
          </span>
        </h1>

        <p
          className="hero-in mx-auto mt-6 max-w-2xl text-pretty text-[16px] leading-relaxed text-[#cfd6cd] sm:text-[18px]"
          style={{ animationDelay: "400ms" }}
        >
          {copy.hero.sub}
        </p>

        <div
          className="hero-in mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row"
          style={{ animationDelay: "520ms" }}
        >
          <CalendlyButton
            utm="utm_source=landing&utm_medium=hero"
            className="group w-full cursor-pointer rounded-2xl bg-[var(--accent)] px-8 py-4 text-[16px] font-bold text-[#062013] shadow-[0_0_50px_-10px_var(--accent)] transition hover:shadow-[0_0_70px_-8px_var(--accent)] hover:brightness-105 active:scale-[.98] sm:w-auto"
          >
            {copy.hero.ctaPrimary}{" "}
            <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">
              →
            </span>
          </CalendlyButton>
          <a
            href="#solution"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4 text-[15px] font-medium text-[var(--fg)] transition hover:border-white/20 hover:bg-white/[0.07] sm:w-auto"
          >
            {copy.hero.ctaSecondary} <span aria-hidden>↓</span>
          </a>
        </div>

        <p
          className="hero-in mt-6 text-[12.5px] tracking-wide text-[var(--fg-muted)]"
          style={{ animationDelay: "640ms" }}
        >
          {copy.hero.compliance}
        </p>
      </div>
    </section>
  );
}
