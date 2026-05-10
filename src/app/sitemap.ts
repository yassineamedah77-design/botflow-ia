import type { MetadataRoute } from "next";

const BASE = "https://botflow-ia.fr";
const now = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, freq: "weekly" },
    { path: "/services/automatisation-workflow-ia", priority: 0.9, freq: "monthly" },
    { path: "/services/agent-ia-chatbot", priority: 0.9, freq: "monthly" },
    { path: "/services/formation-ia-entreprise", priority: 0.9, freq: "monthly" },
    { path: "/cas-usage/automatiser-devis-ia", priority: 0.8, freq: "monthly" },
    { path: "/cas-usage/onboarding-rh-ia", priority: 0.8, freq: "monthly" },
    { path: "/agence-automatisation-ia-paris", priority: 0.7, freq: "monthly" },
    { path: "/mentions-legales", priority: 0.3, freq: "yearly" },
    { path: "/politique-confidentialite", priority: 0.3, freq: "yearly" },
    { path: "/cgv", priority: 0.3, freq: "yearly" },
  ];
  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));
}
