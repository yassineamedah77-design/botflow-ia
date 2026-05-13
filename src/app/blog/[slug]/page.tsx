import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell, Hero, Section, JsonLd, ORG_LD, breadcrumb } from "@/components/site/Shell";
import { getAllSlugs, getPost } from "@/lib/blog-posts";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getPost(slug);
  if (!p) return { title: "Article introuvable" };
  const url = `https://botflow-ia.fr/blog/${p.slug}`;
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: url },
    openGraph: { title: p.title, description: p.description, type: "article", url, publishedTime: p.date },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const p = getPost(slug);
  if (!p) notFound();
  const url = `https://botflow-ia.fr/blog/${p.slug}`;

  return (
    <Shell>
      <JsonLd data={ORG_LD} />
      <JsonLd
        data={breadcrumb([
          { name: "Accueil", url: "https://botflow-ia.fr/" },
          { name: "Blog", url: "https://botflow-ia.fr/blog" },
          { name: p.title, url },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: p.title,
          description: p.description,
          mainEntityOfPage: url,
          datePublished: p.date,
          dateModified: p.date,
          author: { "@type": "Organization", name: "Botflow", url: "https://botflow-ia.fr" },
          publisher: {
            "@type": "Organization",
            name: "Botflow",
            logo: { "@type": "ImageObject", url: "https://botflow-ia.fr/logo.png" },
          },
        }}
      />

      <Hero eyebrow={p.cluster} h1={p.title} lead={p.description} />

      <Section>
        <div style={{ color: "#8a948a", fontSize: 13, marginBottom: 32 }}>
          {new Date(p.date).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })} ·{" "}
          {p.readingMin} min de lecture
        </div>
        {p.body.map((block, i) => renderBlock(block, i))}
        <div style={{ marginTop: 48, padding: 24, border: "1px solid rgba(122,252,165,.25)", borderRadius: 16, background: "rgba(122,252,165,.04)" }}>
          <strong style={{ color: "#d8f5c5" }}>Vous aimez ce contenu ?</strong>
          <p style={{ marginTop: 8, color: "#cfd6cd" }}>
            Botflow conçoit et déploie des workflows IA pour PME et startups françaises. Premier échange gratuit et sans engagement.
          </p>
          <Link
            href="/#contact"
            style={{
              display: "inline-flex",
              marginTop: 12,
              padding: "12px 22px",
              borderRadius: 12,
              background: "linear-gradient(180deg,rgba(122,252,165,.22),rgba(122,252,165,.06))",
              border: "1px solid rgba(122,252,165,.4)",
              color: "#e9efe5",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Discuter de mon projet →
          </Link>
        </div>
      </Section>
    </Shell>
  );
}

function renderBlock(block: import("@/lib/blog-posts").BlogBlock, i: number) {
  switch (block.type) {
    case "h2":
      return (
        <h2 key={i} style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-.02em", margin: "40px 0 16px" }}>
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 key={i} style={{ fontSize: 22, fontWeight: 500, margin: "28px 0 12px" }}>
          {block.text}
        </h3>
      );
    case "p":
      return (
        <p key={i} style={{ margin: "0 0 16px", lineHeight: 1.7 }}>
          {block.text}
        </p>
      );
    case "ul":
      return (
        <ul key={i} style={{ paddingLeft: 22, margin: "0 0 18px", lineHeight: 1.7 }}>
          {block.items.map((it, j) => (
            <li key={j}>{it}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={i} style={{ paddingLeft: 22, margin: "0 0 18px", lineHeight: 1.7 }}>
          {block.items.map((it, j) => (
            <li key={j}>{it}</li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote
          key={i}
          style={{
            margin: "20px 0",
            padding: "16px 22px",
            borderLeft: "3px solid #7afca5",
            background: "rgba(122,252,165,.05)",
            color: "#cfd6cd",
            fontStyle: "italic",
          }}
        >
          {block.text}
        </blockquote>
      );
    case "cta":
      return (
        <p key={i} style={{ margin: "24px 0" }}>
          <Link href={block.href} style={{ color: "#d8f5c5", fontWeight: 500 }}>
            {block.label}
          </Link>
        </p>
      );
  }
}
