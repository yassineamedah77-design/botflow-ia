// Shared, framework-agnostic locale routing table.
//
// Kept in a plain module (NOT the "use client" lang.tsx) so server components can
// read the real values. Exports of a client module become client references on the
// server, which silently resolve to undefined in metadata.

export type Lang = "fr" | "pt" | "en";

export const LANGS: Lang[] = ["fr", "pt", "en"];

/** Each language is its own crawlable, server-rendered URL. */
export const LANG_PATHS: Record<Lang, string> = { fr: "/", pt: "/pt", en: "/en" };

/** `<html lang>` / schema.org inLanguage value. */
export const HTML_LANG: Record<Lang, string> = { fr: "fr-FR", pt: "pt-PT", en: "en" };

/** Open Graph locale value. */
export const OG_LOCALE: Record<Lang, string> = { fr: "fr_FR", pt: "pt_PT", en: "en_US" };
