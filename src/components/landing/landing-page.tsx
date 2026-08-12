import type { Metadata } from "next";
import { SITE_URL, copy } from "@/lib/landing";
import { copyPt, copyEn } from "@/lib/landing-i18n";
import { LANG_PATHS, HTML_LANG, OG_LOCALE, type Lang } from "@/lib/i18n-routes";
import { LangProvider } from "./lang";
import { LandingNav, StickyCta } from "./nav";
import { Hero } from "./hero";
import { TrustBar, Problem, Solution, Offers, Process } from "./sections";
import { Results } from "./results";
import { Pricing } from "./pricing";
import { Faq } from "./faq";
import { FinalCta } from "./final-cta";
import { LandingFooter } from "./footer";

const DICTS = { fr: copy, pt: copyPt, en: copyEn } as const;

const META: Record<Lang, { title: string; description: string }> = {
  fr: {
    title:
      "BotFlow IA — IA & automatisation pour cliniques esthétiques et instituts de beauté · FR / PT",
    description:
      "BotFlow IA installe Sofia, l'assistante virtuelle IA qui répond 24/7 sur WhatsApp et Instagram, qualifie vos clientes et remplit votre agenda Planity/Treatwell. Audit gratuit de 30 min. Conforme RGPD.",
  },
  pt: {
    title:
      "BotFlow IA — IA e automação para clínicas estéticas e institutos de beleza · PT / FR",
    description:
      "A BotFlow IA instala a Sofia, a assistente virtual de IA que responde 24/7 no WhatsApp e Instagram, qualifica as suas clientes e enche a sua agenda Treatwell/Zolmi. Auditoria gratuita de 30 min. Conforme RGPD.",
  },
  en: {
    title:
      "BotFlow IA — AI automation for aesthetic clinics and beauty salons · France & Portugal",
    description:
      "BotFlow IA deploys Sofia, the AI assistant that answers 24/7 on WhatsApp and Instagram, qualifies your clients and fills your Planity/Treatwell calendar. Free 30-min audit. GDPR compliant.",
  },
};

/** Reciprocal hreflang set — every locale points at every other locale plus x-default. */
const LANGUAGE_ALTERNATES: Record<string, string> = {
  "fr-FR": `${SITE_URL}/`,
  "fr-BE": `${SITE_URL}/`,
  "fr-CH": `${SITE_URL}/`,
  "pt-PT": `${SITE_URL}/pt`,
  en: `${SITE_URL}/en`,
  "x-default": `${SITE_URL}/`,
};

export function landingMetadata(lang: Lang): Metadata {
  const { title, description } = META[lang];
  const url = `${SITE_URL}${LANG_PATHS[lang]}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: LANG_PATHS[lang], languages: LANGUAGE_ALTERNATES },
    openGraph: {
      title,
      description,
      url,
      siteName: "BotFlow IA",
      locale: OG_LOCALE[lang],
      alternateLocale: (["fr", "pt", "en"] as Lang[])
        .filter((l) => l !== lang)
        .map((l) => OG_LOCALE[l]),
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

function buildJsonLd(lang: Lang) {
  const dict = DICTS[lang];
  const url = `${SITE_URL}${LANG_PATHS[lang]}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "BotFlow IA",
        alternateName: ["BotFlow.IA", "Botflow"],
        url: `${SITE_URL}/`,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
        },
        email: "contact.botflow@gmail.com",
        areaServed: ["FR", "PT"],
        knowsLanguage: ["fr", "pt", "en"],
        description:
          "Agence d'intelligence artificielle spécialisée dans les cliniques esthétiques, instituts de beauté, spas et cabinets de médecine esthétique, en France et au Portugal.",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: "BotFlow IA",
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: ["fr-FR", "pt-PT", "en"],
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: META[lang].title,
        description: META[lang].description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#sofia` },
        inLanguage: HTML_LANG[lang],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#sofia`,
        name: "Sofia",
        description:
          "Sofia est l'assistante virtuelle IA trilingue (FR/PT/EN) de BotFlow IA. Intégrée à WhatsApp Business et Instagram DM, elle répond 24/7 aux clientes des cliniques esthétiques et instituts de beauté, qualifie les demandes, envoie le lien de réservation Planity/Treatwell, relance les no-show et réactive les anciennes clientes.",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "AI Virtual Assistant",
        operatingSystem: "Web · WhatsApp · Instagram",
        offers: { "@type": "Offer", price: "1990", priceCurrency: "EUR" },
        creator: { "@id": `${SITE_URL}/#organization` },
        inLanguage: ["fr", "pt", "en"],
        featureList: [
          "Réponse 24/7 sur WhatsApp Business",
          "Réponse 24/7 sur Instagram DM",
          "Qualification automatique des leads",
          "Envoi du lien de réservation Planity ou Treatwell",
          "Détection et relance des no-show sous 30 minutes",
          "Réactivation automatique des anciennes clientes",
          "Demande automatisée d'avis Google",
          "Multilingue français, portugais, anglais",
          "Conforme RGPD et déontologie médicale",
          "Hébergement Europe",
        ],
      },
      {
        // Localised FAQ so answer engines can quote the right language.
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        inLanguage: HTML_LANG[lang],
        mainEntity: dict.faq.items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [{ "@type": "ListItem", position: 1, name: "Accueil", item: url }],
      },
    ],
  };
}

/** The full landing page, server-rendered in the requested language. */
export function LandingPage({ lang }: { lang: Lang }) {
  return (
    <>
      {/*
        The root layout owns <html lang="fr">. Search engines derive language from
        content + hreflang (not this attribute), but screen readers do use it, so
        non-FR routes correct it before paint.
      */}
      {lang !== "fr" && (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.lang=${JSON.stringify(HTML_LANG[lang])}`,
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(lang)).replace(/</g, "\\u003c"),
        }}
      />
      <LangProvider lang={lang}>
        <LandingNav />
        <main>
          <Hero />
          <TrustBar />
          <Problem />
          <Solution />
          <Offers />
          <Process />
          <Results />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <LandingFooter />
        <StickyCta />
      </LangProvider>
    </>
  );
}
