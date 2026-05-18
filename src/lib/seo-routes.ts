// Source of truth for all indexable routes.
// Used by sitemap.ts and any internal-linking helper.

export type RouteEntry = {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly" | "always" | "hourly" | "never";
};

// IMPORTANT: only list routes that ACTUALLY exist or are intended to exist within 7 days.
// Listing 404 routes in sitemap HURTS SEO.
export const staticRoutes: RouteEntry[] = [
  // Core
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  // Blog (hub)
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  // Legal
  { path: "/mentions-legales", priority: 0.2, changeFrequency: "yearly" },
  { path: "/politique-confidentialite", priority: 0.2, changeFrequency: "yearly" },
  { path: "/cgv", priority: 0.2, changeFrequency: "yearly" },
];
