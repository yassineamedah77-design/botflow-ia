import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/", destination: "/autoflow.html" }];
  },
  // No redirects() — Vercel domain config handles root → www at edge (307).
  // www is the canonical host (Vercel primary domain). All page canonicals
  // and structured data point to https://www.botflow-ia.fr/*.
};

export default nextConfig;
