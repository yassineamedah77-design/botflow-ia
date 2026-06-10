import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "/" is served by src/app/page.tsx (the conversion landing).
  // No redirects() — Vercel domain config handles root → www at edge.
  // www is the canonical host (Vercel primary domain). All page canonicals
  // and structured data point to https://www.botflow-ia.fr/*.
};

export default nextConfig;
