import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/", destination: "/autoflow.html" }];
  },
  async redirects() {
    return [
      // Force non-www canonical to match <link rel="canonical"> declared in pages.
      // Without this, www.botflow-ia.fr resolves 200 alongside botflow-ia.fr,
      // and Google Search Console raises "Alternate page with proper canonical".
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.botflow-ia.fr" }],
        destination: "https://botflow-ia.fr/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
