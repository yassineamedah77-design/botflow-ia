import path from "node:path";
import type { NextConfig } from "next";

// sofia-app lives inside the botflow-ia repository next to the marketing
// site, which has its own lockfile. Pin the project root so Turbopack and
// output tracing never walk up to the parent project.
const projectRoot = path.resolve(__dirname);

// Static security headers. The Content-Security-Policy is not here: it needs a
// fresh nonce per request and is set in src/proxy.ts.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Docker images use the self-contained server (see Dockerfile);
  // `next start` and Vercel use the regular output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  // Native argon2 bindings must be required at runtime, never bundled.
  serverExternalPackages: ["@node-rs/argon2"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
