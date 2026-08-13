"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { copy, type LandingCopy } from "@/lib/landing";
import { copyPt, copyEn } from "@/lib/landing-i18n";

export type Lang = "fr" | "pt" | "en";

const DICTS: Record<Lang, LandingCopy> = { fr: copy, pt: copyPt, en: copyEn };
const LANGS: Lang[] = ["fr", "pt", "en"];

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
}>({ lang: "fr", setLang: () => {} });

/** Resolve initial language: ?lang= param > localStorage > fr. */
function initialLang(): Lang {
  if (typeof window === "undefined") return "fr";
  const param = new URLSearchParams(window.location.search).get("lang");
  if (param && LANGS.includes(param as Lang)) return param as Lang;
  const stored = window.localStorage.getItem("bf-lang");
  if (stored && LANGS.includes(stored as Lang)) return stored as Lang;
  return "fr";
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  // Server renders FR; client may switch after hydration.
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const l = initialLang();
    // Defer past the effect to satisfy react-hooks/set-state-in-effect
    // while still avoiding a hydration mismatch (server always FR).
    if (l !== "fr") {
      const t = setTimeout(() => setLangState(l), 0);
      return () => clearTimeout(t);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem("bf-lang", l);
    } catch {}
    document.documentElement.lang = l;
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

/** Active dictionary for the current language. */
export function useCopy(): LandingCopy {
  return DICTS[useContext(LangContext).lang];
}

export function useLang() {
  return useContext(LangContext);
}

/** FR · PT · EN pill switcher (top-right, inside the nav). */
export function LangSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div
      role="group"
      aria-label="Choix de la langue"
      className="flex items-center gap-0.5 rounded-full border border-white/10 bg-[#0b0d0a]/70 p-1 backdrop-blur"
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`cursor-pointer rounded-full px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition ${
            lang === l
              ? "bg-[var(--accent)]/20 text-[#d8f5c5]"
              : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
