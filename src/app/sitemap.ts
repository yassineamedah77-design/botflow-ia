import type { MetadataRoute } from "next";
import { staticRoutes } from "@/lib/seo-routes";
import { posts } from "@/lib/blog-posts";

const BASE = "https://www.botflow-ia.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticEntries = staticRoutes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
  const blogEntries = posts.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  return [...staticEntries, ...blogEntries];
}
