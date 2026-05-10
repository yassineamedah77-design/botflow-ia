import type { Metadata } from "next";
import { Shell, Hero, Section, CTA, JsonLd, breadcrumb } from "@/components/site/Shell";

const URL = "https://botflow-ia.fr/agence-automatisation-ia-paris";

export const metadata: Metadata = {
  title: "Agence automatisation IA Paris — Botflow",
  description:
    "Agence d'automatisation IA basée à Paris. Workflows n8n + Claude, agents IA sur-mesure, formation. Accompagnement PME et startups en Île-de-France et toute la France.",
  alternates: { canonical: URL },
  openGraph: { title: "Agence automatisation IA Paris", description: "Botflow accompagne les PME parisiennes.", url: URL },
};

const localBusinessLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Botflow — Agence Automatisation IA Paris",
  url: URL,
  image: "https://botflow-ia.fr/og-cover.jpg",
  email: "contact.botflow@gmail.com",
  priceRange: "€€",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Paris",
    addressRegion: "Île-de-France",
    addressCountry: "FR",
  },
  areaServed: ["Paris", "Île-de-France", "France"],
  geo: { "@type": "GeoCoordinates", latitude: 48.8566, longitude: 2.3522 },
  serviceType: ["Automatisation IA", "Agent IA", "Formation IA", "Workflow n8n"],
};

export default function Page() {
  return (
    <Shell>
      <JsonLd data={localBusinessLd} />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://botflow-ia.fr/" },
          { name: "Agence Paris", url: URL },
        ])}
      />

      <Hero
        eyebrow="Agence · Paris"
        h1={<>Agence d&apos;automatisation <em style={{ fontFamily: "var(--font-instrument-serif)", fontStyle: "italic" }}>IA</em> à Paris.</>}
        lead="Botflow accompagne les PME et startups parisiennes dans le déploiement de workflows IA, agents Claude sur-mesure et formation des équipes. Présence physique sur Paris pour ateliers, audits et formations en présentiel."
      />

      <Section eyebrow="Local" title="Pourquoi choisir une agence IA à Paris ?">
        <p>
          Paris concentre l&apos;écosystème IA français : Station F, Hub IA, recherche académique (PSL, Polytechnique), talents experts. Travailler avec une agence locale facilite les ateliers en présentiel, l&apos;audit terrain dans vos locaux, et la formation de vos équipes face-à-face.
        </p>
        <p>
          Botflow intervient principalement sur Paris et l&apos;Île-de-France, avec extension France entière en distanciel. Premier rendez-vous gratuit dans nos bureaux ou les vôtres.
        </p>
      </Section>

      <Section eyebrow="Services" title="Notre offre pour les entreprises franciliennes">
        <ul style={{ paddingLeft: 20 }}>
          <li><a style={{ color: "#d8f5c5" }} href="/services/automatisation-workflow-ia">Workflow IA n8n + Claude</a> — automatiser devis, leads, support, reporting.</li>
          <li><a style={{ color: "#d8f5c5" }} href="/services/agent-ia-chatbot">Agent IA & chatbot sur-mesure</a> — support N1, FAQ, onboarding produit.</li>
          <li><a style={{ color: "#d8f5c5" }} href="/services/formation-ia-entreprise">Formation IA</a> — initiation, prompt engineering, n8n. En présentiel à Paris.</li>
        </ul>
      </Section>

      <Section eyebrow="Secteurs" title="Industries accompagnées en Île-de-France">
        <p>
          SaaS B2B, retail e-commerce, industrie, services professionnels (cabinets conseil, avocats, comptables), agences créatives, scale-ups en hyper-croissance. Nos workflows s&apos;adaptent à votre stack et à votre maturité technique.
        </p>
      </Section>

      <Section eyebrow="Contact" title="Travaillons ensemble">
        <p>
          Premier échange <strong>gratuit et sans engagement</strong>. Nous nous déplaçons sur Paris pour un audit terrain de 2 heures, ou organisons une visio. Devis fixe sous 5 jours après cadrage.
        </p>
        <p>
          contact.botflow@gmail.com · Paris, France
        </p>
        <CTA label="Prendre rendez-vous →" />
      </Section>
    </Shell>
  );
}
