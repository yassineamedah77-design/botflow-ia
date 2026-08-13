import type { Metadata } from "next";
import { Shell, Hero, Section, CTA, JsonLd, ORG_LD, breadcrumb, service } from "@/components/site/Shell";

const URL = "https://www.botflow-ia.fr/services/support-client-ia";

export const metadata: Metadata = {
  title: "Support client IA — Agent Claude 24/7 | Botflow",
  description:
    "Déployez un agent IA support client 24/7 propulsé par Claude. Résout 60-80% des tickets N1 en autonomie. Intégrations Zendesk, Intercom, Crisp. ROI 3 mois.",
  alternates: { canonical: URL },
  openGraph: { title: "Support client IA — Agent Claude 24/7", description: "Agent IA pour support N1, 60-80% des tickets résolus.", url: URL },
};

export default function Page() {
  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd data={service("Support client IA", "Déploiement d'agents IA Claude pour support client niveau 1, disponibles 24/7.")} />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://www.botflow-ia.fr/" },
          { name: "Support client IA", url: URL },
        ])}
      />

      <Hero
        eyebrow="Service · Support"
        h1={<>Support client IA <em style={{ fontFamily: "var(--font-instrument-serif)", fontStyle: "italic" }}>24/7</em>, sans dégrader la qualité.</>}
        lead="Botflow déploie des agents IA Claude formés sur votre base de connaissance produit. Réponse en 2,4 secondes, traitement de 60 à 80% des demandes niveau 1 en autonomie, escalade humaine intelligente pour les cas complexes."
      />

      <Section eyebrow="Pourquoi" title="Le support N1 est le cas d'usage IA #1 pour les SaaS et PME">
        <p>
          La majorité des demandes support sont répétitives : réinitialisation de mot de passe, statut de commande, questions tarifaires, FAQ produit. Les traiter en autonomie libère vos agents humains pour les vrais problèmes — ceux qui justifient leur expertise et fidélisent vos clients.
        </p>
      </Section>

      <Section eyebrow="Architecture" title="Comment fonctionne un agent support Botflow">
        <ol style={{ paddingLeft: 20 }}>
          <li><strong>Indexation</strong> — votre base de connaissance (Notion, Confluence, Help Center) vectorisée dans pgvector ou Pinecone.</li>
          <li><strong>RAG</strong> — l&apos;agent récupère les passages pertinents avant de répondre. Réponses sourcées, citations vérifiables.</li>
          <li><strong>Garde-fous</strong> — l&apos;agent ne répond que sur des sujets autorisés, escalade les cas sensibles (remboursement, plainte juridique).</li>
          <li><strong>Intégration ticketing</strong> — Zendesk, Intercom, Crisp, HelpScout, Front. Tickets créés / mis à jour automatiquement.</li>
          <li><strong>Handoff humain</strong> — passe la main avec contexte complet en cas de doute, frustration utilisateur, ou demande hors scope.</li>
        </ol>
      </Section>

      <Section eyebrow="Résultats" title="Performance type Botflow">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>−68%</strong> de tickets escaladés vers les agents humains</li>
          <li><strong>2,4 secondes</strong> de temps de réponse moyen</li>
          <li><strong>×3</strong> capacité support sans renforcer l&apos;équipe</li>
          <li><strong>CSAT maintenu ou amélioré</strong> (vs perception agents humains pressés)</li>
        </ul>
      </Section>

      <Section eyebrow="Sécurité" title="Conformité RGPD et secrets clients">
        <p>
          Hébergement européen, chiffrement, logs d&apos;audit complets. Les données clients ne sont jamais utilisées pour entraîner les modèles. Possibilité de redaction automatique des PII avant envoi au LLM pour les secteurs sensibles.
        </p>
        <CTA label="Déployer mon agent support →" />
      </Section>
    </Shell>
  );
}
