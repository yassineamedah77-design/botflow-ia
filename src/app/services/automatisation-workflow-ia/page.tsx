import type { Metadata } from "next";
import { Shell, Hero, Section, CTA, JsonLd, ORG_LD, breadcrumb, service } from "@/components/site/Shell";

const URL = "https://www.botflow-ia.fr/services/automatisation-workflow-ia";

export const metadata: Metadata = {
  title: "Automatisation workflow IA — n8n + Claude | Botflow",
  description:
    "Agence spécialisée workflows IA n8n, Make, Zapier connectés à Claude et GPT-4. Automatisez devis, leads, support, reporting. PME et startups françaises. Audit gratuit.",
  alternates: { canonical: URL },
  openGraph: { title: "Automatisation workflow IA — n8n + Claude", description: "Workflows IA sur-mesure pour PME françaises.", url: URL },
};

export default function Page() {
  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd data={service("Automatisation workflow IA", "Conception et déploiement de workflows IA n8n + Claude pour PME françaises.")} />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://www.botflow-ia.fr/" },
          { name: "Services", url: "https://www.botflow-ia.fr/services/automatisation-workflow-ia" },
          { name: "Workflow IA", url: URL },
        ])}
      />

      <Hero
        eyebrow="Service · Workflow IA"
        h1={<>Automatisation de workflow IA pour <em style={{ fontFamily: "var(--font-instrument-serif)", fontStyle: "italic" }}>PME &amp; startups</em>.</>}
        lead="Botflow conçoit et déploie des workflows d'automatisation IA n8n, Make ou Zapier connectés à Claude, GPT-4 ou Mistral. Vos tâches répétitives s'exécutent toutes seules — saisie devis, tri tickets, reporting, scoring leads."
      />

      <Section eyebrow="Pourquoi automatiser" title={<>Workflows IA = <span style={{ color: "#7afca5" }}>74% de temps économisé</span> en moyenne.</>}>
        <p>
          La plupart des PME françaises perdent 15 à 30 heures par semaine sur des tâches répétitives : saisie de devis, qualification leads, tri d&apos;emails, reporting hebdo, onboarding clients. Un workflow d&apos;automatisation IA bien conçu prend en charge ces tâches 24/7, sans erreur, et libère vos équipes pour les missions à forte valeur.
        </p>
        <p>
          Notre approche : un <strong>audit de 3 jours</strong> pour cartographier les processus, identifier les workflows à fort ROI, puis un déploiement progressif en 4 à 8 semaines selon la complexité.
        </p>
      </Section>

      <Section eyebrow="Stack technique" title="Outils que nous orchestrons">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Orchestration :</strong> n8n (auto-hébergé Scaleway/OVH), Make, Zapier — selon votre maturité technique.</li>
          <li><strong>Modèles IA :</strong> Claude (Anthropic), GPT-4 / GPT-4o (OpenAI), Mistral, Gemini — choix selon le cas d&apos;usage et la sensibilité des données.</li>
          <li><strong>Stockage :</strong> Airtable, Supabase, Notion, PostgreSQL.</li>
          <li><strong>Intégrations :</strong> HubSpot, Salesforce, Zendesk, Slack, Google Workspace, Microsoft 365.</li>
        </ul>
        <p>
          Nous restons agnostiques : si vous utilisez déjà un outil spécifique, nous nous adaptons. La compatibilité est validée dès l&apos;audit.
        </p>
      </Section>

      <Section eyebrow="Cas d'usage" title="Workflows IA déployés chez nos clients">
        <ul style={{ paddingLeft: 20 }}>
          <li><a style={{ color: "#d8f5c5" }} href="/cas-usage/automatiser-devis-ia">Automatisation devis</a> : extraction email → génération devis Claude → envoi validé en 4 minutes.</li>
          <li><a style={{ color: "#d8f5c5" }} href="/cas-usage/onboarding-rh-ia">Onboarding RH</a> : contrat + comptes SI + planification formations + suivi 30/60/90 jours.</li>
          <li>Scoring leads : enrichissement Clay + scoring Claude + push CRM en temps réel.</li>
          <li>Génération contenu marketing : brief Notion → posts LinkedIn + newsletters + scripts vidéo.</li>
          <li>Support client niveau 1 : agent IA Claude qui résout 78% des tickets en autonomie.</li>
        </ul>
      </Section>

      <Section eyebrow="Méthode" title="De l'audit au déploiement">
        <ol style={{ paddingLeft: 20 }}>
          <li><strong>Audit (3 jours)</strong> — cartographie processus, identification workflows à fort ROI, devis fixe.</li>
          <li><strong>Conception (1 sem)</strong> — design des workflows, validation prompts, architecture sécurisée.</li>
          <li><strong>Développement (2 à 6 sem)</strong> — implémentation n8n, intégration outils, tests bout-en-bout.</li>
          <li><strong>Déploiement &amp; formation</strong> — mise en production, transfert compétences, documentation.</li>
          <li><strong>3 mois monitoring inclus</strong> — surveillance, corrections, optimisations.</li>
        </ol>
      </Section>

      <Section eyebrow="Engagement" title="Devis fixe après audit gratuit">
        <p>
          Chaque projet démarre par un <strong>audit de cadrage gratuit</strong> (3 jours) qui détermine périmètre, livrables, planning. Vous recevez ensuite un <strong>devis fixe et détaillé</strong> — pas de facturation au temps passé, pas de surprise.
        </p>
        <p>
          Premier échange sans engagement. <strong>3 mois de monitoring inclus</strong> dans tous nos projets.
        </p>
        <CTA label="Auditer mes processus →" />
      </Section>
    </Shell>
  );
}
