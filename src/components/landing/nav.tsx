"use client";

import { useEffect, useState } from "react";
import { copy } from "@/lib/landing";
import { CalendlyButton } from "./calendly";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-[#070806]/80 backdrop-blur-xl border-b border-white/[0.06]" : ""
      }`}
    >
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8"
      >
        <a href="#" className="flex items-center gap-2.5 font-semibold tracking-wide text-[15px]">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_14px_var(--accent)]"
          />
          {copy.nav.brand}
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {copy.nav.links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-4 py-2 text-[13.5px] text-[var(--fg-muted)] transition hover:bg-white/5 hover:text-[var(--fg)]"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <CalendlyButton
          utm="utm_source=landing&utm_medium=nav"
          ariaLabel="Réserver mon audit gratuit de 30 minutes"
          className="cursor-pointer rounded-full border border-[var(--accent)]/30 bg-gradient-to-b from-[var(--accent)]/20 to-[var(--accent)]/5 px-5 py-2.5 text-[13.5px] font-semibold text-[var(--fg)] transition hover:border-[var(--accent)]/60 hover:shadow-[0_0_24px_-6px_var(--accent)]"
        >
          {copy.nav.cta} <span aria-hidden>↗</span>
        </CalendlyButton>
      </nav>
    </header>
  );
}

/**
 * Mobile-only sticky bottom CTA. Appears after the hero, hides while the
 * final inline-Calendly section is on screen (no double CTA).
 */
export function StickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    const finalCta = document.getElementById("audit");
    let pastHero = false;
    let onFinal = false;
    const update = () => setVisible(pastHero && !onFinal);

    const ioHero = new IntersectionObserver(
      ([e]) => {
        pastHero = !e.isIntersecting;
        update();
      },
      { threshold: 0.1 },
    );
    const ioFinal = new IntersectionObserver(
      ([e]) => {
        onFinal = e.isIntersecting;
        update();
      },
      { threshold: 0.05 },
    );
    if (hero) ioHero.observe(hero);
    if (finalCta) ioFinal.observe(finalCta);
    return () => {
      ioHero.disconnect();
      ioFinal.disconnect();
    };
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pt-8 md:hidden bg-gradient-to-t from-[#070806] via-[#070806]/85 to-transparent transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <CalendlyButton
        utm="utm_source=landing&utm_medium=sticky"
        className="w-full cursor-pointer rounded-2xl bg-[var(--accent)] px-6 py-4 text-[15px] font-bold text-[#062013] shadow-[0_0_40px_-8px_var(--accent)] active:scale-[.98] transition"
      >
        Réserver mon audit gratuit (30 min)
      </CalendlyButton>
    </div>
  );
}
