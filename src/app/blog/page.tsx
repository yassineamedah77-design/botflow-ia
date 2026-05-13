import type { Metadata } from "next";
import Link from "next/link";
import { Shell, Hero, Section, JsonLd, ORG_LD, breadcrumb } from "@/components/site/Shell";
import { posts } from "@/lib/blog-posts";

const URL = "https://botflow-ia.fr/blog";

export const metadata: Metadata = {
  title: "Blog — Automatisation IA, n8n, Claude | Botflow",
  description:
    "Guides, retours d'expérience et études de cas sur l'automatisation IA pour PME et startups françaises : workflows n8n, agents Claude, ROI, sécurité RGPD.",
  alternates: { canonical: URL },
  openGraph: { title: "Blog Botflow", description: "Automatisation IA pour PME françaises.", url: URL },
};

const sorted = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));

export default function Page() {
  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://botflow-ia.fr/" },
          { name: "Blog", url: URL },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Blog Botflow",
          url: URL,
          publisher: { "@type": "Organization", name: "Botflow", url: "https://botflow-ia.fr" },
        }}
      />

      <Hero
        eyebrow="Ressources"
        h1={<>Le <em style={{ fontFamily: "var(--font-instrument-serif)", fontStyle: "italic" }}>blog</em> Botflow.</>}
        lead="Guides détaillés, retours d'expérience et études de cas concrets sur l'automatisation IA pour PME et startups françaises. Sans bullshit, sans hype, avec des chiffres."
      />

      <Section>
        <div style={{ display: "grid", gap: 20 }}>
          {sorted.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              style={{
                padding: 24,
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 18,
                background: "rgba(255,255,255,.03)",
                textDecoration: "none",
                color: "inherit",
                display: "block",
              }}
            >
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#8a948a", marginBottom: 12 }}>
                <span style={{ color: "#d8f5c5", textTransform: "uppercase", letterSpacing: ".15em" }}>{p.cluster}</span>
                <span>·</span>
                <span>{new Date(p.date).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}</span>
                <span>·</span>
                <span>{p.readingMin} min de lecture</span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 8px" }}>{p.title}</h2>
              <p style={{ color: "#cfd6cd", fontSize: 15, lineHeight: 1.55, margin: 0 }}>{p.description}</p>
            </Link>
          ))}
        </div>
      </Section>
    </Shell>
  );
}
