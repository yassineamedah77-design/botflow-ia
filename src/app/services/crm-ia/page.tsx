import type { Metadata } from "next";
import { Shell, Hero, Section, CTA, JsonLd, ORG_LD, breadcrumb, service } from "@/components/site/Shell";

const URL = "https://www.botflow-ia.fr/services/crm-ia";

export const metadata: Metadata = {
  title: "CRM IA — Enrichissement, scoring & automatisation | Botflow",
  description:
    "Boostez votre CRM HubSpot, Salesforce ou Pipedrive avec l'IA : enrichissement auto, scoring leads Claude, résumé de calls, prévision pipeline. PME et startups.",
  alternates: { canonical: URL },
  openGraph: { title: "CRM IA — Enrichissement & scoring", description: "HubSpot, Salesforce, Pipedrive supercharged par Claude.", url: URL },
};

export default function Page() {
  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd data={service("CRM IA", "Enrichissement, scoring de leads et automatisation IA pour HubSpot, Salesforce, Pipedrive.")} />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://www.botflow-ia.fr/" },
          { name: "CRM IA", url: URL },
        ])}
      />

      <Hero
        eyebrow="Service · Sales Ops"
        h1={<>Votre CRM, augmenté par l&apos;<em style={{ fontFamily: "var(--font-instrument-serif)", fontStyle: "italic" }}>IA</em>.</>}
        lead="Botflow connecte Claude et GPT-4 à votre CRM (HubSpot, Salesforce, Pipedrive, Attio) pour enrichir les contacts, scorer les leads, résumer les calls Gong / Fireflies, et prédire les opportunités à risque. Vos commerciaux passent moins de temps dans le CRM, plus en rendez-vous."
      />

      <Section eyebrow="Cas d'usage" title="Ce que l'IA apporte concrètement à votre CRM">
        <ol style={{ paddingLeft: 20 }}>
          <li><strong>Enrichissement automatique</strong> — chaque nouveau lead enrichi via Clay / Apollo / LinkedIn : taille société, stack tech, signaux d&apos;intent.</li>
          <li><strong>Scoring IA</strong> — Claude évalue fit ICP, qualité du signal, probabilité de conversion. Score visible directement dans le CRM.</li>
          <li><strong>Résumé de calls</strong> — Gong / Fireflies / Modjo + Claude : résumé exécutif, actions, objections, prochaine étape, push automatique dans le CRM.</li>
          <li><strong>Email IA</strong> — drafts personnalisés générés en 1 clic depuis le contact CRM.</li>
          <li><strong>Forecast pipeline</strong> — détection des deals à risque, recommandations de relance, prévision réaliste vs optimiste.</li>
          <li><strong>Nettoyage data</strong> — dédoublonnage, standardisation, complétion des champs manquants.</li>
        </ol>
      </Section>

      <Section eyebrow="Intégrations" title="CRM compatibles">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>HubSpot</strong> — toutes éditions (Free → Enterprise).</li>
          <li><strong>Salesforce</strong> — Sales Cloud, Service Cloud.</li>
          <li><strong>Pipedrive</strong> — workflow automation native.</li>
          <li><strong>Attio</strong> — meilleure DX moderne pour startups.</li>
          <li><strong>Folk</strong> — pour TPE et freelances.</li>
        </ul>
      </Section>

      <Section eyebrow="Résultats" title="Impact mesuré chez nos clients">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>−60% de temps</strong> passé par les commerciaux à saisir / mettre à jour le CRM</li>
          <li><strong>+22% de taux de conversion</strong> sur les leads bien scorés</li>
          <li><strong>Forecast à 92% de précision</strong> grâce à la détection des deals à risque</li>
        </ul>
        <CTA label="Augmenter mon CRM →" />
      </Section>
    </Shell>
  );
}
