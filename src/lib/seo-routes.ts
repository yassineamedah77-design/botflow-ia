// Source of truth for all indexable routes.
// Used by sitemap.ts and any internal-linking helper.

export type RouteEntry = {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly" | "always" | "hourly" | "never";
};

export const staticRoutes: RouteEntry[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  // Services
  { path: "/services/automatisation-workflow-ia", priority: 0.9, changeFrequency: "monthly" },
  { path: "/services/agent-ia-chatbot", priority: 0.9, changeFrequency: "monthly" },
  { path: "/services/formation-ia-entreprise", priority: 0.9, changeFrequency: "monthly" },
  { path: "/services/automatisation-pme", priority: 0.9, changeFrequency: "monthly" },
  { path: "/services/ia-pour-ecommerce", priority: 0.85, changeFrequency: "monthly" },
  { path: "/services/prospection-ia", priority: 0.9, changeFrequency: "monthly" },
  { path: "/services/support-client-ia", priority: 0.9, changeFrequency: "monthly" },
  { path: "/services/crm-ia", priority: 0.85, changeFrequency: "monthly" },
  // Cas d'usage
  { path: "/cas-usage/automatiser-devis-ia", priority: 0.8, changeFrequency: "monthly" },
  { path: "/cas-usage/onboarding-rh-ia", priority: 0.8, changeFrequency: "monthly" },
  // Local
  { path: "/agence-automatisation-ia-paris", priority: 0.7, changeFrequency: "monthly" },
  // Blog index
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  // Legal
  { path: "/mentions-legales", priority: 0.3, changeFrequency: "yearly" },
  { path: "/politique-confidentialite", priority: 0.3, changeFrequency: "yearly" },
  { path: "/cgv", priority: 0.3, changeFrequency: "yearly" },
];
