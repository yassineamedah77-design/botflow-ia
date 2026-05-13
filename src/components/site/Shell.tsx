import Link from "next/link";
import type { ReactNode } from "react";

const ACCENT = "#7afca5";
const MINT = "#d8f5c5";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#070806", color: "#e9efe5", minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
      <Bg />
      <Brand />
      <Nav />
      <main style={{ position: "relative", zIndex: 2, paddingTop: 140, paddingBottom: 80 }}>{children}</main>
      <Foot />
    </div>
  );
}

function Bg() {
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(122,252,165,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(122,252,165,.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at 50% 0%, #000 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, #000 30%, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "-25%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 1100,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 30% 30%, rgba(122,252,165,.3), transparent 55%), radial-gradient(circle at 70% 50%, rgba(120,180,255,.12), transparent 55%)",
          filter: "blur(90px)",
        }}
      />
    </div>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      style={{
        position: "fixed",
        top: 24,
        left: 64,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontWeight: 600,
        letterSpacing: ".5px",
        color: "#e9efe5",
        textDecoration: "none",
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 14px ${ACCENT}` }} />
      Botflow
    </Link>
  );
}

function Nav() {
  const items = [
    { href: "/services/automatisation-workflow-ia", label: "Workflows IA" },
    { href: "/services/agent-ia-chatbot", label: "Agents IA" },
    { href: "/services/formation-ia-entreprise", label: "Formation" },
    { href: "/blog", label: "Blog" },
    { href: "/#contact", label: "Contact ↗", cta: true },
  ];
  return (
    <nav
      style={{
        position: "fixed",
        top: 18,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 8px",
        borderRadius: 999,
        background: "rgba(15,16,14,.6)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,.08)",
        zIndex: 50,
      }}
    >
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            fontSize: 13.5,
            color: it.cta ? "#e9efe5" : "#8a948a",
            background: it.cta ? "linear-gradient(180deg,rgba(122,252,165,.18),rgba(122,252,165,.04))" : "transparent",
            border: it.cta ? "1px solid rgba(122,252,165,.25)" : "1px solid transparent",
            textDecoration: "none",
          }}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

function Foot() {
  return (
    <footer style={{ position: "relative", zIndex: 2, borderTop: "1px solid rgba(255,255,255,.08)", padding: "60px 32px 40px", marginTop: 80 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 40, color: "#8a948a", fontSize: 14 }}>
        <div>
          <div style={{ fontSize: 28, color: "#e9efe5", fontWeight: 600 }}>
            Botflow<span style={{ color: ACCENT }}>.</span>
          </div>
          <p style={{ marginTop: 12, maxWidth: 360 }}>
            Agence d&apos;automatisation IA pour PME et startups en France. Workflows n8n, agents Claude sur-mesure, formation IA.
          </p>
        </div>
        <div>
          <strong style={{ color: "#e9efe5" }}>Services</strong>
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
            <li><Link style={l} href="/services/automatisation-workflow-ia">Workflows IA</Link></li>
            <li><Link style={l} href="/services/agent-ia-chatbot">Agents IA & chatbots</Link></li>
            <li><Link style={l} href="/services/formation-ia-entreprise">Formation IA</Link></li>
            <li><Link style={l} href="/services/automatisation-pme">Automatisation PME</Link></li>
            <li><Link style={l} href="/services/prospection-ia">Prospection IA</Link></li>
            <li><Link style={l} href="/services/support-client-ia">Support client IA</Link></li>
            <li><Link style={l} href="/services/crm-ia">CRM IA</Link></li>
            <li><Link style={l} href="/services/ia-pour-ecommerce">IA e-commerce</Link></li>
            <li><Link style={l} href="/agence-automatisation-ia-paris">Agence IA Paris</Link></li>
          </ul>
        </div>
        <div>
          <strong style={{ color: "#e9efe5" }}>Ressources</strong>
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
            <li><Link style={l} href="/blog">Blog</Link></li>
            <li><Link style={l} href="/cas-usage/automatiser-devis-ia">Cas : automatiser devis</Link></li>
            <li><Link style={l} href="/cas-usage/onboarding-rh-ia">Cas : onboarding RH</Link></li>
          </ul>
          <div style={{ marginTop: 18 }}>
            <strong style={{ color: "#e9efe5" }}>Légal</strong>
            <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
              <li><Link style={l} href="/mentions-legales">Mentions légales</Link></li>
              <li><Link style={l} href="/politique-confidentialite">Confidentialité</Link></li>
              <li><Link style={l} href="/cgv">CGV</Link></li>
            </ul>
          </div>
          <div style={{ marginTop: 18 }}>
            <strong style={{ color: "#e9efe5" }}>Contact</strong>
            <div style={{ marginTop: 6 }}>contact.botflow@gmail.com</div>
            <div>Paris, France</div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: "32px auto 0", color: "#8a948a", fontSize: 12 }}>
        © 2026 Botflow — Tous droits réservés.
      </div>
    </footer>
  );

}

const l = { color: "#8a948a", textDecoration: "none" } as const;

export const tokens = { accent: ACCENT, mint: MINT };

export function Hero({ eyebrow, h1, lead }: { eyebrow: string; h1: ReactNode; lead: string }) {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 32px 40px" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 16px",
          borderRadius: 999,
          background: "rgba(122,252,165,.08)",
          border: "1px solid rgba(122,252,165,.25)",
          color: MINT,
          fontSize: 12,
          letterSpacing: ".15em",
          textTransform: "uppercase",
          marginBottom: 24,
        }}
      >
        {eyebrow}
      </div>
      <h1
        style={{
          fontSize: "clamp(40px,6vw,76px)",
          fontWeight: 500,
          letterSpacing: "-.035em",
          lineHeight: 1.02,
          margin: 0,
          background: "linear-gradient(180deg,#fff 30%," + MINT + " 90%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {h1}
      </h1>
      <p style={{ maxWidth: 720, marginTop: 24, color: "#cfd6cd", fontSize: 18, lineHeight: 1.55 }}>{lead}</p>
    </section>
  );
}

export function Section({ children, title, eyebrow }: { children: ReactNode; title?: ReactNode; eyebrow?: string }) {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px" }}>
      {eyebrow && (
        <div style={{ color: MINT, fontSize: 13, letterSpacing: ".22em", textTransform: "uppercase", marginBottom: 14 }}>{eyebrow}</div>
      )}
      {title && (
        <h2 style={{ fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 24px" }}>{title}</h2>
      )}
      <div style={{ color: "#cfd6cd", fontSize: 16, lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}

export function CTA({ href = "/#contact", label = "Démarrer un projet →" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        marginTop: 32,
        padding: "15px 26px",
        borderRadius: 14,
        background: "linear-gradient(180deg,rgba(122,252,165,.22),rgba(122,252,165,.06))",
        border: "1px solid rgba(122,252,165,.4)",
        color: "#e9efe5",
        textDecoration: "none",
        fontWeight: 500,
      }}
    >
      {label}
    </Link>
  );
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export const ORG_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Botflow",
  url: "https://botflow-ia.fr",
  logo: "https://botflow-ia.fr/logo.png",
  email: "contact.botflow@gmail.com",
  description: "Agence d'automatisation IA pour PME et startups en France.",
  address: { "@type": "PostalAddress", addressLocality: "Paris", addressCountry: "FR" },
  areaServed: ["FR", "BE", "CH", "LU"],
};

export function breadcrumb(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function service(name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    provider: { "@type": "Organization", name: "Botflow", url: "https://botflow-ia.fr" },
    areaServed: { "@type": "Country", name: "France" },
  };
}
