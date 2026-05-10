import type { Metadata } from "next";
import { Shell, Hero, Section, CTA, JsonLd, ORG_LD, breadcrumb, service } from "@/components/site/Shell";

const URL = "https://botflow-ia.fr/services/formation-ia-entreprise";

export const metadata: Metadata = {
  title: "Formation IA entreprise — Claude, ChatGPT, n8n | Botflow",
  description:
    "Formez vos équipes à l'IA générative : prompt engineering, ChatGPT, Claude, automatisation n8n. Programmes 1 à 5 jours, présentiel ou distanciel. PME, startups, dirigeants.",
  alternates: { canonical: URL },
  openGraph: { title: "Formation IA entreprise", description: "Programmes Claude, ChatGPT, n8n adaptés PME.", url: URL },
};

export default function Page() {
  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd data={service("Formation IA pour entreprise", "Programmes prompt engineering, Claude, ChatGPT, n8n pour PME et startups françaises.")} />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://botflow-ia.fr/" },
          { name: "Formation IA", url: URL },
        ])}
      />

      <Hero
        eyebrow="Service · Formation"
        h1={<>Formation IA pour <em style={{ fontFamily: "var(--font-instrument-serif)", fontStyle: "italic" }}>entreprises</em> en France.</>}
        lead="Programmes pratiques pour faire monter en compétence vos équipes : prompt engineering, ChatGPT, Claude, automatisation no-code n8n. 3 niveaux, 1 à 5 jours, présentiel ou distanciel."
      />

      <Section eyebrow="3 niveaux" title="Programmes adaptés à votre maturité">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Initiation IA (1 jour)</strong> — fondamentaux, cas d&apos;usage métier, prise en main ChatGPT et Claude. Public : tous collaborateurs.</li>
          <li><strong>Intermédiaire (2-3 jours)</strong> — prompt engineering avancé, agents IA, automatisation no-code (n8n, Make, Zapier). Public : équipes ops, marketing, support.</li>
          <li><strong>Expert (5 jours)</strong> — RAG, fine-tuning, déploiement workflows production, intégration API. Public : équipes techniques, CTO, lead dev.</li>
        </ul>
      </Section>

      <Section eyebrow="Sur-mesure" title="Modules ajustés à votre métier">
        <p>
          Chaque session est <strong>adaptée à votre secteur</strong> : retail, industrie, SaaS, services, santé, finance. Les exemples, exercices et workflows traités utilisent vos vraies données et vos outils (Notion, HubSpot, Slack, Salesforce, etc.).
        </p>
        <p>
          <strong>Coaching individuel</strong> pour dirigeants disponible. <strong>Ateliers d&apos;équipes</strong> (4-12 pers) recommandés pour ancrer les acquis.
        </p>
      </Section>

      <Section eyebrow="Contenu" title="Ce que vos équipes maîtrisent à la fin">
        <ul style={{ paddingLeft: 20 }}>
          <li>Choisir le bon modèle (Claude vs GPT-4 vs Mistral) selon le cas d&apos;usage.</li>
          <li>Rédiger des prompts efficaces (chain-of-thought, few-shot, system prompts).</li>
          <li>Créer ses premiers workflows automatisés sur n8n / Make.</li>
          <li>Détecter et éviter les hallucinations IA.</li>
          <li>Comprendre les limites RGPD et les bonnes pratiques de confidentialité.</li>
          <li>Identifier 5 à 10 cas d&apos;usage IA prioritaires dans leur quotidien.</li>
        </ul>
      </Section>

      <Section eyebrow="Engagement" title="Programmes sur-mesure">
        <p>
          Tarif déterminé selon le format (initiation, intermédiaire, expert), la durée (1 à 5 jours), le nombre de participants et le niveau de personnalisation (modules adaptés à votre métier). Devis envoyé sous 48 h après échange.
        </p>
        <p>
          <strong>Q&amp;A continu inclus</strong> 30 jours après formation. Éligible financement <strong>OPCO</strong> (numéro de déclaration en cours).
        </p>
        <CTA label="Réserver une formation →" />
      </Section>
    </Shell>
  );
}
