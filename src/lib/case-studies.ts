export type CaseStudy = {
  slug: string;
  client: string;
  industry: string;
  title: string;
  excerpt: string;
  problem: string;
  solution: string[];
  results: { metric: string; label: string }[];
  stack: string[];
  duration: string;
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "acme-sales-ops",
    client: "Acme SaaS",
    industry: "B2B SaaS",
    title: "Pipeline commercial autonome avec agents IA",
    excerpt:
      "Qualification leads, enrichissement, follow-up: 80h/semaine récupérées par l'équipe sales.",
    problem:
      "Équipe de 6 SDR submergée par la qualification manuelle. Lead time 4 jours, taux de conversion stagnant à 8%.",
    solution: [
      "Agent qualification temps réel (signal scraping + ICP fit)",
      "Enrichissement automatique HubSpot via Clay + LinkedIn",
      "Sequence email personnalisée par GPT-4 + RAG profil",
      "Routing intelligent vers AE selon score et disponibilité",
    ],
    results: [
      { metric: "+62%", label: "taux de conversion MQL→SQL" },
      { metric: "−74%", label: "temps de qualification" },
      { metric: "3.2x", label: "meetings bookés/SDR" },
    ],
    stack: ["n8n", "OpenAI", "Clay", "HubSpot", "Apollo"],
    duration: "6 semaines",
  },
  {
    slug: "lumio-support-deflection",
    client: "Lumio",
    industry: "E-commerce",
    title: "Support client 24/7 — déflection 70%",
    excerpt:
      "Agent support multi-canal avec mémoire contextuelle et escalade humaine intelligente.",
    problem:
      "12 000 tickets/mois, NPS support à 32, coût CSM élevé. SLA non tenu en pic saisonnier.",
    solution: [
      "Agent conversationnel branché Zendesk + Shopify",
      "RAG sur base de connaissances produits + retours clients",
      "Détection émotion + escalade auto vers humain",
      "Boucle de feedback qualité avec annotations CSM",
    ],
    results: [
      { metric: "70%", label: "tickets résolus sans humain" },
      { metric: "+41", label: "points NPS support" },
      { metric: "−58%", label: "coût par ticket" },
    ],
    stack: ["Claude", "Zendesk", "Shopify", "Pinecone"],
    duration: "8 semaines",
  },
  {
    slug: "vertex-content-engine",
    client: "Vertex Studio",
    industry: "Agence créative",
    title: "Moteur de contenu programmatique",
    excerpt:
      "Production de 200 articles SEO/mois avec validation éditoriale humaine.",
    problem:
      "Stratégie content limitée à 8 articles/mois. Mots-clés longue traîne inexploités. Coûts rédaction prohibitifs.",
    solution: [
      "Pipeline keyword research + clustering automatique",
      "Génération brief + draft via agents spécialisés",
      "Validation humaine en interface dédiée (1 clic)",
      "Publication WordPress + schema markup auto",
    ],
    results: [
      { metric: "25x", label: "volume de production" },
      { metric: "+340%", label: "trafic organique en 4 mois" },
      { metric: "−82%", label: "coût par article" },
    ],
    stack: ["GPT-4", "Ahrefs API", "WordPress", "Make"],
    duration: "5 semaines",
  },
  {
    slug: "aurora-finance-ops",
    client: "Aurora Finance",
    industry: "Fintech",
    title: "Automatisation back-office comptable",
    excerpt:
      "Rapprochement bancaire, factures fournisseurs, reporting: équipe finance ×3 capacité.",
    problem:
      "8 jours/mois de saisie comptable manuelle. Erreurs de rapprochement coûteuses. Reporting CEO en retard.",
    solution: [
      "OCR factures + extraction données via vision LLM",
      "Rapprochement bancaire avec règles + ML drift detection",
      "Dashboard temps réel CEO/CFO via Hex",
      "Alertes anomalies push Slack",
    ],
    results: [
      { metric: "94%", label: "factures traitées sans intervention" },
      { metric: "−7j", label: "clôture mensuelle accélérée" },
      { metric: "0", label: "erreurs de rapprochement Q4" },
    ],
    stack: ["Claude Vision", "Stripe", "Hex", "Slack"],
    duration: "10 semaines",
  },
];
