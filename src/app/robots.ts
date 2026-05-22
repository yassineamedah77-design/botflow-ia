import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: tout autoriser
      { userAgent: "*", allow: "/" },
      // Crawlers IA (AEO) — explicit allow
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Claude-Web", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Perplexity-User", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "GoogleOther", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
      { userAgent: "Bytespider", allow: "/" },
      { userAgent: "Amazonbot", allow: "/" },
      { userAgent: "Meta-ExternalAgent", allow: "/" },
      { userAgent: "DuckAssistBot", allow: "/" },
      { userAgent: "YouBot", allow: "/" },
      { userAgent: "cohere-ai", allow: "/" },
      { userAgent: "MistralAI-User", allow: "/" },
    ],
    sitemap: [
      "https://www.botflow-ia.fr/sitemap.xml",
    ],
    host: "https://www.botflow-ia.fr",
  };
}
