import type { Metadata } from "next";
import { Shell, Hero, Section, CTA, JsonLd, ORG_LD, breadcrumb, service } from "@/components/site/Shell";

const URL = "https://www.botflow-ia.fr/services/agent-ia-chatbot";

export const metadata: Metadata = {
  title: "Agent IA & chatbot sur-mesure pour entreprise | Botflow",
  description:
    "Création d'agents IA conversationnels et chatbots Claude / GPT-4 formés sur vos données. Support client, onboarding, FAQ commerciale, RH. PME et startups françaises.",
  alternates: { canonical: URL },
  openGraph: { title: "Agent IA & chatbot sur-mesure", description: "Agents Claude formés sur vos données.", url: URL },
};

export default function Page() {
  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd data={service("Agent IA & Chatbot sur-mesure", "Création d'agents IA conversationnels Claude/GPT-4 pour PME françaises.")} />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://www.botflow-ia.fr/" },
          { name: "Agent IA", url: URL },
        ])}
      />

      <Hero
        eyebrow="Service · Agent IA"
        h1={<>Agents IA &amp; chatbots <em style={{ fontFamily: "var(--font-instrument-serif)", fontStyle: "italic" }}>sur-mesure</em>.</>}
        lead="Botflow développe des agents conversationnels IA propulsés par Claude ou GPT-4, formés sur vos données internes : support client, onboarding, FAQ commerciale, RH. Déployables en 2 à 4 semaines."
      />

      <Section eyebrow="Pourquoi un agent IA" title="Diviser le support N1 par 3, sans dégrader la qualité">
        <p>
          Un agent IA bien conçu résout en autonomie 60 à 80% des demandes de niveau 1 : questions produit, réinitialisations, statuts de commande, FAQ. Vos agents humains se concentrent sur les cas complexes — ceux qui justifient leur expertise.
        </p>
        <p>
          Nos déploiements obtiennent en moyenne <strong>−68% de tickets escaladés</strong> et un <strong>temps de réponse de 2,4 secondes</strong>.
        </p>
      </Section>

      <Section eyebrow="Cas d'usage" title="Où déployer un agent IA ?">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Support client N1</strong> — Zendesk, Intercom, Crisp, formulaire web.</li>
          <li><strong>Onboarding produit</strong> — guide utilisateur conversationnel pour SaaS.</li>
          <li><strong>FAQ commerciale</strong> — pré-qualification leads avant rendez-vous SDR.</li>
          <li><strong>Helpdesk RH interne</strong> — congés, paie, mutuelle, télétravail, politiques.</li>
          <li><strong>Voice agent</strong> — agent vocal téléphonique pour standard / qualification.</li>
        </ul>
      </Section>

      <Section eyebrow="Technologie" title="Architecture RAG + Claude / GPT-4">
        <p>
          Nous construisons des agents en <strong>RAG (Retrieval Augmented Generation)</strong> : votre base de connaissance (Notion, Confluence, docs PDF, base SQL) est indexée dans une base vectorielle (pgvector, Pinecone, Weaviate). L&apos;agent récupère les passages pertinents avant de répondre, garantissant des réponses sourcées et factuelles.
        </p>
        <p>
          Choix du modèle selon le cas : <strong>Claude Opus / Sonnet</strong> (raisonnement, sécurité), <strong>GPT-4o</strong> (rapidité, multimodal), <strong>Mistral</strong> (souveraineté FR, données sensibles).
        </p>
      </Section>

      <Section eyebrow="Sécurité" title="Vos données restent vos données">
        <p>
          Hébergement européen (Scaleway, OVH, ou votre infra). Conformité <strong>RGPD</strong>, DPA fourni. Aucune donnée n&apos;est utilisée pour entraîner les modèles. Logs et audit trail accessibles. Possibilité d&apos;exécution on-premise pour secteurs réglementés (banque, santé, défense).
        </p>
      </Section>

      <Section eyebrow="Engagement" title="Devis sur-mesure, audit gratuit">
        <p>
          Chaque agent IA est conçu sur-mesure selon votre base de connaissance, vos intégrations (CRM, ticketing, ERP) et vos contraintes sécurité. Le périmètre exact se définit pendant <strong>l&apos;audit de cadrage gratuit</strong>, puis nous fournissons un devis fixe et détaillé.
        </p>
        <p>
          <strong>3 mois de monitoring inclus</strong>. Maintenance optionnelle. Premier échange sans engagement.
        </p>
        <CTA label="Concevoir mon agent IA →" />
      </Section>
    </Shell>
  );
}
