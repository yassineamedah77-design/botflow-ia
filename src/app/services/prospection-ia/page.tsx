import type { Metadata } from "next";
import { Shell, Hero, Section, CTA, JsonLd, ORG_LD, breadcrumb, service } from "@/components/site/Shell";

const URL = "https://www.botflow-ia.fr/services/prospection-ia";

export const metadata: Metadata = {
  title: "Prospection IA — Lead generation automatisée | Botflow",
  description:
    "Automatisez votre prospection B2B avec l'IA : sourcing Clay, enrichissement, scoring Claude, personnalisation cold email à l'échelle. PME et startups françaises.",
  alternates: { canonical: URL },
  openGraph: { title: "Prospection IA — Lead gen automatisée", description: "Pipeline complet sourcing + scoring + outreach IA.", url: URL },
};

export default function Page() {
  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd data={service("Prospection IA", "Pipeline complet de prospection B2B automatisée avec IA : sourcing, enrichissement, scoring, personnalisation.")} />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://www.botflow-ia.fr/" },
          { name: "Prospection IA", url: URL },
        ])}
      />

      <Hero
        eyebrow="Service · Sales"
        h1={<>Prospection <em style={{ fontFamily: "var(--font-instrument-serif)", fontStyle: "italic" }}>B2B</em> automatisée par IA.</>}
        lead="Botflow conçoit des pipelines de prospection IA bout-en-bout : sourcing Clay, enrichissement multi-sources, scoring Claude, personnalisation des cold emails à l'échelle. Vos SDR se concentrent sur les rendez-vous qualifiés, pas sur la saisie."
      />

      <Section eyebrow="Pipeline" title="L'architecture type d'une prospection IA Botflow">
        <ol style={{ paddingLeft: 20 }}>
          <li><strong>Sourcing</strong> — Clay, Apollo, LinkedIn Sales Navigator → import quotidien selon ICP.</li>
          <li><strong>Enrichissement</strong> — données firmographiques, technographic, signaux d&apos;intent (Bombora, G2).</li>
          <li><strong>Scoring IA</strong> — Claude évalue fit ICP × signaux × timing, donne un score 0-100.</li>
          <li><strong>Personnalisation</strong> — Claude rédige first line + objet email à partir du profil LinkedIn et de l&apos;actualité de l&apos;entreprise.</li>
          <li><strong>Outreach multi-canal</strong> — Lemlist, Smartlead, La Growth Machine : email + LinkedIn + WhatsApp.</li>
          <li><strong>Routing CRM</strong> — push HubSpot / Pipedrive / Salesforce, tâches automatiques aux SDR.</li>
        </ol>
      </Section>

      <Section eyebrow="Résultats" title="Performance d'un pipeline IA bien construit">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Volume :</strong> 500 à 2 000 leads qualifiés par mois sans renforcer l&apos;équipe.</li>
          <li><strong>Taux réponse :</strong> 8 à 14% (vs 1-3% en cold email non personnalisé).</li>
          <li><strong>Coût par RDV qualifié :</strong> divisé par 3 à 5 vs prospection manuelle.</li>
          <li><strong>Délai de mise en production :</strong> 4 à 6 semaines.</li>
        </ul>
      </Section>

      <Section eyebrow="Conformité" title="RGPD et opt-in B2B">
        <p>
          Toutes nos campagnes respectent le RGPD : base légale intérêt légitime B2B, mention systématique du droit d&apos;opposition, désinscription en 1 clic, registre des traitements à jour. Bounces et complaints monitorés en temps réel pour préserver la délivrabilité.
        </p>
        <CTA label="Construire mon pipeline IA →" />
      </Section>
    </Shell>
  );
}
