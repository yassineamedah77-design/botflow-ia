"use client";

import { useCopy } from "./lang";

export function LandingFooter() {
  const copy = useCopy();
  // Accent the last word of the CTA ("Parlons-en." / "Falemos." / "Let's talk.")
  const words = copy.footer.cta.split(" ");
  const last = words.pop();
  const head = words.join(" ");

  return (
    <footer className="relative border-t border-white/[0.06] py-16 pb-28 md:pb-16">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 md:grid-cols-3">
        <div>
          <p className="text-[clamp(30px,4vw,42px)] font-semibold tracking-tight">
            {head && <>{head} </>}
            <span className="font-serif-italic text-[var(--accent)]">{last}</span>
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--fg-muted)]">
            {copy.footer.compliance}
          </p>
        </div>
        <div className="text-[14px] leading-relaxed text-[#cfd6cd]">
          <p className="mb-1 font-semibold text-[var(--fg)]">{copy.ui.emailLabel}</p>
          <a href={`mailto:${copy.footer.email}`} className="hover:text-[var(--accent)]">
            {copy.footer.email}
          </a>
          <p className="mb-1 mt-5 font-semibold text-[var(--fg)]">{copy.ui.locationLabel}</p>
          <p>{copy.footer.location}</p>
        </div>
        <div className="text-[14px] leading-relaxed text-[#cfd6cd]">
          <p className="mb-1 font-semibold text-[var(--fg)]">{copy.ui.legalLabel}</p>
          <ul className="space-y-1">
            {copy.footer.legal.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-[var(--accent)]">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[12.5px] text-[var(--fg-muted)]">{copy.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
