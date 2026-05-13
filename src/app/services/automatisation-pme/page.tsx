import type { Metadata } from "next";
import { Shell, Hero, Section, CTA, JsonLd, ORG_LD, breadcrumb, service } from "@/components/site/Shell";

const URL = "https://botflow-ia.fr/services/automatisation-pme";

export const metadata: Metadata = {
  title: "Automatisation IA pour PME — Botflow",
  description:
    "Spécialiste de l'automatisation IA pour PME françaises (10-250 salariés). Workflows n8n + Claude, agents support, formation équipes. Audit gratuit. ROI dès 3 mois.",
  alternates: { canonical: URL },
  openGraph: { title: "Automatisation IA pour PME", description: "Workflows IA et agents Claude pour PME françaises.", url: URL },
};

export default function Page() {
  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd data={service("Automatisation IA pour PME", "Conception et déploiement de workflows IA adaptés aux PME françaises de 10 à 250 salariés.")} />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://botflow-ia.fr/" },
          { name: "PME", url: URL },
        ])}
      />

      <Hero
        eyebrow="Service · PME"
        h1={<>Automatisation IA pour <em style={{ fontFamily: "var(--font-instrument-serif)", fontStyle: "italic" }}>PME françaises</em>.</>}
        lead="Botflow accompagne les PME de 10 à 250 salariés dans le déploiement de workflows IA concrets : automatiser les devis, qualifier les leads, traiter le support N1, libérer 15 à 30 heures par semaine. Sans CTO interne, sans verrouillage propriétaire."
      />

      <Section eyebrow="Diagnostic" title="Les 5 process à automatiser en priorité dans une PME">
        <ol style={{ paddingLeft: 20 }}>
          <li><strong>Saisie de devis</strong> — mail entrant → devis personnalisé en 4 minutes (vs 24-48 h en manuel).</li>
          <li><strong>Qualification de leads</strong> — enrichissement automatique + scoring IA + push CRM.</li>
          <li><strong>Support client N1</strong> — agent IA Claude qui résout 60-80% des tickets.</li>
          <li><strong>Reporting hebdo</strong> — agrégation multi-sources + résumé IA + Slack auto.</li>
          <li><strong>Onboarding clients ou collaborateurs</strong> — orchestration contrats / comptes / formations.</li>
        </ol>
      </Section>

      <Section eyebrow="Méthode" title="Notre approche dédiée PME">
        <p>
          Les grandes ESN proposent des projets à 6 chiffres et 12 mois de delivery. Botflow vise l&apos;inverse : <strong>POC en 2-3 semaines</strong>, mise en production progressive, transfert de compétences pour vos équipes. Vous ne dépendez pas de nous à long terme.
        </p>
        <ul style={{ paddingLeft: 20 }}>
          <li>Audit gratuit (3 jours) — cartographie des process et identification quick wins.</li>
          <li>POC piloté sur 1 process — preuve de valeur avant extension.</li>
          <li>Documentation et formation équipe à chaque étape.</li>
          <li>3 mois de monitoring inclus.</li>
        </ul>
      </Section>

      <Section eyebrow="Sécurité" title="Souveraineté des données pour PME françaises">
        <p>
          Hébergement européen par défaut (Scaleway Paris, OVH Roubaix), conformité RGPD, DPA fourni. Aucune donnée utilisée pour entraîner les modèles. Pour les secteurs réglementés (santé, finance, droit), exécution on-premise possible.
        </p>
      </Section>

      <Section eyebrow="Cas concrets" title="Exemples de déploiements PME">
        <ul style={{ paddingLeft: 20 }}>
          <li><a style={{ color: "#d8f5c5" }} href="/cas-usage/automatiser-devis-ia">Lumio Retail</a> — devis IA, +42% conversion, 120 h/mois libérées.</li>
          <li><a style={{ color: "#d8f5c5" }} href="/cas-usage/onboarding-rh-ia">Vertex Industries</a> — onboarding RH automatisé, −85% de tâches manuelles.</li>
          <li>SaaS B2B — agent support Claude, −68% de tickets escaladés.</li>
        </ul>
        <CTA label="Auditer ma PME →" />
      </Section>
    </Shell>
  );
}
