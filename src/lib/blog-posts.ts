// Lightweight blog source. Add new posts here — automatically appears in sitemap + /blog index + /blog/[slug].
// Body uses limited inline JSX-safe markdown-ish structure rendered by the page component.

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  readingMin: number;
  cluster: string;
  body: BlogBlock[];
};

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "cta"; href: string; label: string };

export const posts: BlogPost[] = [
  {
    slug: "automatiser-pme-avec-ia",
    title: "Comment automatiser sa PME avec l'IA en 2026 : guide complet",
    description:
      "Méthode pas-à-pas pour automatiser les processus d'une PME française avec l'IA : audit, choix outils n8n / Claude, ROI, sécurité RGPD. Exemples concrets.",
    date: "2026-04-12",
    readingMin: 9,
    cluster: "Automatisation PME",
    body: [
      { type: "p", text: "L'automatisation IA n'est plus réservée aux grandes entreprises. En 2026, une PME peut déployer un workflow IA complet en 4 à 6 semaines, pour un budget maîtrisé et un ROI atteint dès le 3e mois. Ce guide détaille la méthode." },
      { type: "h2", text: "Étape 1 — Identifier les tâches automatisables" },
      { type: "p", text: "Toutes les tâches ne se valent pas. Priorisez celles qui sont répétitives, structurées, avec un fort volume." },
      { type: "ul", items: [
        "Saisie de devis et de commandes",
        "Tri et qualification de leads entrants",
        "Réponses support de niveau 1",
        "Reporting hebdomadaire (ventes, RH, finance)",
        "Onboarding clients ou collaborateurs",
        "Génération de contenu marketing",
      ]},
      { type: "h2", text: "Étape 2 — Choisir la stack" },
      { type: "p", text: "Pour 90% des PME, la stack idéale est n8n (orchestration) + Claude ou GPT-4 (raisonnement) + Airtable ou Notion (données). Cette combinaison couvre la majorité des cas d'usage, sans verrouillage propriétaire." },
      { type: "h2", text: "Étape 3 — Cadrer un POC" },
      { type: "p", text: "Plutôt que de viser une refonte complète, commencez par un Proof of Concept sur un seul process. Délai cible : 2 à 3 semaines. Objectif : prouver le ROI avant d'étendre." },
      { type: "h2", text: "Étape 4 — Sécuriser les données" },
      { type: "p", text: "Hébergement européen (Scaleway, OVH), conformité RGPD, chiffrement bout-en-bout, aucune donnée envoyée pour entraînement. Ces points sont non-négociables pour les PME françaises." },
      { type: "h2", text: "Étape 5 — Mesurer le ROI" },
      { type: "p", text: "Calcul simple : (heures économisées par semaine × coût horaire chargé) × 52 semaines. Comparez au coût total du projet sur 12 mois. La plupart des workflows IA atteignent un ROI supérieur à 300% la première année." },
      { type: "cta", href: "/cas-usage/automatiser-devis-ia", label: "Voir un exemple concret : automatiser ses devis →" },
    ],
  },
  {
    slug: "n8n-vs-make-vs-zapier",
    title: "n8n vs Make vs Zapier : quel outil d'automatisation choisir en 2026 ?",
    description:
      "Comparatif détaillé n8n, Make et Zapier pour l'automatisation d'entreprise : prix, intégrations, courbe d'apprentissage, IA, hébergement. Pour PME et startups françaises.",
    date: "2026-03-20",
    readingMin: 7,
    cluster: "Workflow IA",
    body: [
      { type: "p", text: "Trois outils dominent l'automatisation no-code : n8n, Make et Zapier. Lequel choisir selon votre maturité technique, votre budget et vos contraintes de souveraineté ?" },
      { type: "h2", text: "n8n — Le choix souverain" },
      { type: "p", text: "Open-source, auto-hébergeable (Scaleway, OVH), tarif gratuit en self-host. Idéal pour les entreprises soucieuses de la maîtrise de leurs données. Communauté FR active. Courbe d'apprentissage moyenne mais récompensée par une flexibilité totale." },
      { type: "h2", text: "Make (ex-Integromat) — Le compromis visuel" },
      { type: "p", text: "Interface très visuelle (scénarios graphiques), tarification à l'opération. Excellent pour les profils marketing / ops sans bagage technique. Hébergé en UE." },
      { type: "h2", text: "Zapier — La référence grand public" },
      { type: "p", text: "Le plus connu, plus de 7000 intégrations. Tarification rapidement élevée à l'usage. Hébergement US (point d'attention RGPD pour données sensibles). Idéal pour automatisations légères." },
      { type: "h2", text: "Recommandation Botflow" },
      { type: "ul", items: [
        "Startups tech / dev internes : n8n auto-hébergé",
        "PME marketing / ops : Make",
        "Tests rapides et workflows légers : Zapier",
        "Données sensibles (santé, finance, RH) : n8n on-premise obligatoire",
      ]},
      { type: "cta", href: "/services/automatisation-workflow-ia", label: "Déployer un workflow IA sur-mesure →" },
    ],
  },
  {
    slug: "agent-ia-support-client",
    title: "Agent IA pour le support client : guide d'implémentation 2026",
    description:
      "Comment déployer un agent IA Claude / GPT-4 sur votre support client : architecture RAG, intégrations Zendesk / Intercom, ROI, sécurité. PME et SaaS français.",
    date: "2026-02-15",
    readingMin: 8,
    cluster: "Agent IA",
    body: [
      { type: "p", text: "Un agent IA bien conçu absorbe 60 à 80% des tickets niveau 1 en autonomie. Voici comment l'implémenter sans dégrader la qualité de service." },
      { type: "h2", text: "Architecture RAG : pourquoi c'est essentiel" },
      { type: "p", text: "Plutôt qu'un LLM brut qui invente, un agent RAG (Retrieval Augmented Generation) cherche d'abord dans votre base de connaissance (Notion, Confluence, docs), puis génère sa réponse sourcée. Conséquence : zéro hallucination, traçabilité totale." },
      { type: "h2", text: "Stack recommandée" },
      { type: "ul", items: [
        "Modèle : Claude Sonnet ou GPT-4o (équilibre rapidité / qualité)",
        "Base vectorielle : pgvector ou Pinecone",
        "Frontal chat : widget custom React ou intégration Zendesk / Intercom",
        "Logs et audit : Langfuse ou Phoenix",
      ]},
      { type: "h2", text: "Délai et budget" },
      { type: "p", text: "Comptez 3 à 5 semaines pour un agent avec intégrations CRM / ticketing. Le ROI typique : un poste support junior libéré dès 200 tickets / mois traités." },
      { type: "h2", text: "Pièges à éviter" },
      { type: "ol", items: [
        "Ne pas tester sur des questions réelles avant mise en production",
        "Oublier le fallback humain (toujours prévoir l'escalade)",
        "Sous-estimer le travail de curation de la base de connaissance",
        "Négliger les logs d'interaction (essentiels pour itérer)",
      ]},
      { type: "cta", href: "/services/agent-ia-chatbot", label: "Concevoir mon agent IA →" },
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return posts.map((p) => p.slug);
}
