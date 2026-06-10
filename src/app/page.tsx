import type { Metadata } from "next";
import { copy, SITE_URL } from "@/lib/landing";
import { LandingNav, StickyCta } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { TrustBar, Problem, Solution, Offers, Process } from "@/components/landing/sections";
import { Results } from "@/components/landing/results";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";

export const metadata: Metadata = {
  title:
    "BotFlow IA — IA & automatisation pour cliniques esthétiques et instituts de beauté · FR / PT",
  description:
    "BotFlow IA installe Sofia, l'assistante virtuelle IA qui répond 24/7 sur WhatsApp et Instagram, qualifie vos clientes et remplit votre agenda Planity/Treatwell. Audit gratuit de 30 min. Conforme RGPD.",
  alternates: { canonical: "/" },
};

const jsonLd = {
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
      inLanguage: "fr-FR",
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
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: copy.faq.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE_URL}/` },
      ],
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
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
    </>
  );
}
