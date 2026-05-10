import type { Metadata } from "next";
import { Shell, Hero, Section, CTA, JsonLd, ORG_LD, breadcrumb } from "@/components/site/Shell";

const URL = "https://botflow-ia.fr/cas-usage/automatiser-devis-ia";

export const metadata: Metadata = {
  title: "Automatiser ses devis avec l'IA — Cas d'usage | Botflow",
  description:
    "Comment automatiser la génération de devis avec n8n + Claude : extraction email, devis personnalisé, envoi en moins de 5 minutes. ROI réel chez Lumio Retail (+42% conversion).",
  alternates: { canonical: URL },
  openGraph: { title: "Automatiser ses devis avec l'IA", description: "Pipeline n8n + Claude pour générer des devis en 4 minutes.", url: URL },
};

export default function Page() {
  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://botflow-ia.fr/" },
          { name: "Cas d'usage", url: "https://botflow-ia.fr/cas-usage/automatiser-devis-ia" },
          { name: "Automatiser devis IA", url: URL },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Automatiser ses devis avec l'IA — Pipeline n8n + Claude",
          author: { "@type": "Organization", name: "Botflow" },
          publisher: { "@type": "Organization", name: "Botflow", logo: { "@type": "ImageObject", url: "https://botflow-ia.fr/logo.png" } },
          datePublished: "2026-05-10",
          mainEntityOfPage: URL,
        }}
      />

      <Hero
        eyebrow="Cas d'usage · Devis"
        h1={<>Automatiser ses devis avec l&apos;<em style={{ fontFamily: "var(--font-instrument-serif)", fontStyle: "italic" }}>IA</em> : 4 minutes au lieu de 2 jours.</>}
        lead="La génération de devis est l'un des cas d'usage IA au plus fort ROI pour les PME. Voici comment Botflow conçoit un pipeline n8n + Claude qui extrait la demande, génère le devis personnalisé, et l'envoie validé au client en moins de 5 minutes."
      />

      <Section eyebrow="Le problème" title="Pourquoi les devis manuels coûtent cher">
        <p>
          Dans la majorité des PME, la chaîne de devis est un goulot d&apos;étranglement. Un commercial reçoit une demande par mail, copie-colle dans un template Word ou Excel, calcule les remises, valide auprès du chef de projet, puis renvoie. <strong>Délai moyen : 24 à 48 heures.</strong> Pendant ce temps, le client compare 2 ou 3 concurrents et la conversion chute.
        </p>
        <p>
          Conséquences mesurées : 15 à 30 heures par semaine consommées par la rédaction de devis, taux de conversion 25-35%, prospects perdus par lenteur.
        </p>
      </Section>

      <Section eyebrow="La solution" title="Pipeline n8n + Claude étape par étape">
        <ol style={{ paddingLeft: 20 }}>
          <li><strong>Trigger email</strong> — n8n écoute la boîte commerciale (Gmail, Outlook, IMAP).</li>
          <li><strong>Extraction Claude</strong> — Claude lit la demande, extrait : produit, quantité, contraintes, deadline, contexte client.</li>
          <li><strong>Enrichissement CRM</strong> — n8n requête HubSpot / Salesforce : historique client, remise négociée, statut compte.</li>
          <li><strong>Génération devis</strong> — Claude rédige le devis personnalisé (ton, conditions, options) à partir d&apos;un template validé.</li>
          <li><strong>Validation humaine</strong> — Slack envoie le draft au commercial qui valide en 1 clic (ou amende).</li>
          <li><strong>Envoi PDF + suivi</strong> — DocSend ou PDFKit + tracking ouverture, relance auto à J+3 si pas de réponse.</li>
        </ol>
      </Section>

      <Section eyebrow="Résultats client" title="Lumio Retail — étude de cas">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Délai devis</strong> : 24-48 h → <strong>4 minutes</strong>.</li>
          <li><strong>Taux de conversion</strong> : <strong>+42%</strong> (vitesse de réponse = #1 facteur dans le retail B2B).</li>
          <li><strong>Heures libérées</strong> : <strong>120 h/mois</strong> sur l&apos;équipe commerciale.</li>
          <li><strong>ROI</strong> : payé en 2,5 mois, projet livré en 5 semaines.</li>
        </ul>
      </Section>

      <Section eyebrow="Stack" title="Outils utilisés">
        <p>
          n8n auto-hébergé (Scaleway Paris), Claude Sonnet pour rédaction, Airtable pour catalogue produits, HubSpot pour CRM, Slack pour validation, PDFKit pour génération PDF, Resend pour envoi tracké. Coût mensuel d&apos;exploitation : ~80 € (incluant tokens IA). Conformité RGPD, données restent en Europe.
        </p>
      </Section>

      <Section eyebrow="Adapter à votre PME" title="Déploiement type">
        <p>
          Un workflow devis IA standard se déploie en <strong>4 à 6 semaines</strong>, selon la complexité du catalogue produits et les intégrations CRM. Le ROI est généralement atteint en 2 à 4 mois.
        </p>
        <p>
          Voir aussi : <a style={{ color: "#d8f5c5" }} href="/services/automatisation-workflow-ia">Service workflows IA</a>.
        </p>
        <CTA label="Auditer mon process devis →" />
      </Section>
    </Shell>
  );
}
