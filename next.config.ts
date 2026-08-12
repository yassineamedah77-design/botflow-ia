import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "/" is served by src/app/page.tsx (the conversion landing).
  // Host-level redirect (non-www → www) lives in vercel.json and runs at the edge.
  // www is the canonical host (Vercel primary domain). All page canonicals
  // and structured data point to https://www.botflow-ia.fr/*.
  //
  // Content redirects below consolidate the legacy "generic AI agency" URLs into
  // the aesthetic-clinic niche. They preserve link equity from anything Google or
  // an AI crawler already indexed, and remove topical dilution (the site used to
  // rank for "automatisation PME" signals that competed with the clinic niche).
  async redirects() {
    return [
      // Legacy generic service pages → landing offers section
      { source: "/services", destination: "/#offres", permanent: true },
      { source: "/services/:slug*", destination: "/#offres", permanent: true },

      // Legacy generic use-case pages → landing process section
      { source: "/cas-usage", destination: "/#procede", permanent: true },
      { source: "/cas-usage/:slug*", destination: "/#procede", permanent: true },

      // Legacy portfolio pages (fictional B2B case studies) → landing results
      { source: "/work", destination: "/#resultats", permanent: true },
      { source: "/work/:slug*", destination: "/#resultats", permanent: true },

      // Legacy local landing page (generic Paris AI agency)
      { source: "/agence-automatisation-ia-paris", destination: "/", permanent: true },

      // Superseded offer page (old "NoShow Killer" naming) → closest niche content
      {
        source: "/solutions/no-show-killer",
        destination: "/blog/reduire-no-show-clinique-esthetique",
        permanent: true,
      },
      { source: "/solutions/:slug*", destination: "/#offres", permanent: true },

      // Legacy client-side language switcher used "?lang=" on "/". Those URLs are
      // now real, server-rendered routes, so send any old link/bookmark there.
      {
        source: "/",
        has: [{ type: "query", key: "lang", value: "pt" }],
        destination: "/pt",
        permanent: true,
      },
      {
        source: "/",
        has: [{ type: "query", key: "lang", value: "en" }],
        destination: "/en",
        permanent: true,
      },

      // Retired off-niche blog posts → closest niche article, else blog index
      {
        source: "/blog/agent-ia-support-client",
        destination: "/blog/whatsapp-business-clinique-esthetique-rgpd",
        permanent: true,
      },
      { source: "/blog/automatiser-pme-avec-ia", destination: "/blog", permanent: true },
      { source: "/blog/n8n-vs-make-vs-zapier", destination: "/blog", permanent: true },
    ];
  },
};

export default nextConfig;
