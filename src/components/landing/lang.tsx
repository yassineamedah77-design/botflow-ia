"use client";

import Link from "next/link";
import { createContext, useContext } from "react";
import { copy, type LandingCopy } from "@/lib/landing";
import { copyPt, copyEn } from "@/lib/landing-i18n";
import { LANGS, LANG_PATHS, type Lang } from "@/lib/i18n-routes";

export type { Lang };

const DICTS: Record<Lang, LandingCopy> = { fr: copy, pt: copyPt, en: copyEn };

const LangContext = createContext<Lang>("fr");

/**
 * Language is resolved on the server from the route (/, /pt, /en) so crawlers and
 * AI answer engines see the translated copy in the HTML. No client-side swapping,
 * no hydration mismatch — switching languages is a normal navigation.
 */
export function LangProvider({ lang = "fr", children }: { lang?: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** Active dictionary for the current language. */
export function useCopy(): LandingCopy {
  return DICTS[useContext(LangContext)];
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** FR · PT · EN pill switcher (top-right, inside the nav). Navigates between locales. */
export function LangSwitcher() {
  const lang = useLang();
  return (
    <div
      role="group"
      aria-label="Choix de la langue / Language"
      className="flex items-center gap-0.5 rounded-full border border-white/10 bg-[#0b0d0a]/70 p-1 backdrop-blur"
    >
      {LANGS.map((l) => (
        <Link
          key={l}
          href={LANG_PATHS[l]}
          hrefLang={l}
          aria-current={lang === l ? "true" : undefined}
          className={`cursor-pointer rounded-full px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition ${
            lang === l
              ? "bg-[var(--accent)]/20 text-[#d8f5c5]"
              : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
