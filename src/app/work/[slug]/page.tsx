import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { caseStudies } from "@/lib/case-studies";
import { Nav } from "@/components/nav";

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cs = caseStudies.find((c) => c.slug === slug);
  if (!cs) notFound();

  return (
    <main className="relative min-h-screen">
      <Nav />
      <div className="absolute inset-0 radial-aurora opacity-40 pointer-events-none" />

      <article className="relative max-w-4xl mx-auto px-6 pt-40 pb-32">
        <Link
          href="/#work"
          className="inline-flex items-center gap-2 text-sm text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors mb-12"
        >
          <ArrowLeft size={14} /> Tous les projets
        </Link>

        <div className="flex items-center gap-3 text-xs tracking-widest uppercase text-[var(--fg-muted)] mb-6">
          <span>{cs.industry}</span>
          <span>·</span>
          <span>{cs.duration}</span>
        </div>

        <div className="text-3xl font-serif-italic text-[var(--accent)] mb-4">
          {cs.client}
        </div>
        <h1 className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.05] mb-8">
          {cs.title}
        </h1>
        <p className="text-xl text-[var(--fg-muted)] leading-relaxed mb-16">
          {cs.excerpt}
        </p>

        <div className="grid grid-cols-3 gap-px bg-[var(--border)] rounded-3xl overflow-hidden mb-20">
          {cs.results.map((r) => (
            <div
              key={r.label}
              className="bg-[var(--bg)] p-6 md:p-8 flex flex-col gap-2"
            >
              <div className="text-3xl md:text-4xl font-medium tracking-tight text-[var(--accent)]">
                {r.metric}
              </div>
              <div className="text-xs md:text-sm text-[var(--fg-muted)] leading-snug">
                {r.label}
              </div>
            </div>
          ))}
        </div>

        <section className="mb-16">
          <h2 className="text-xs tracking-widest uppercase text-[var(--accent)] mb-4">
            Problème
          </h2>
          <p className="text-lg text-[var(--fg)] leading-relaxed">
            {cs.problem}
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-xs tracking-widest uppercase text-[var(--accent)] mb-6">
            Solution IA
          </h2>
          <ul className="flex flex-col gap-4">
            {cs.solution.map((s, i) => (
              <li
                key={s}
                className="flex gap-4 p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]"
              >
                <span className="text-[var(--accent)] font-medium tabular-nums">
                  0{i + 1}
                </span>
                <span className="text-[var(--fg)] leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-20">
          <h2 className="text-xs tracking-widest uppercase text-[var(--accent)] mb-6">
            Stack technique
          </h2>
          <div className="flex flex-wrap gap-2">
            {cs.stack.map((s) => (
              <span
                key={s}
                className="inline-flex px-3.5 py-1.5 rounded-full text-sm border border-[var(--border)] bg-[var(--bg-elevated)]"
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        <div className="pt-12 border-t border-[var(--border)]">
          <Link
            href="/#contact"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors"
          >
            Discuter d'un projet similaire
            <ArrowUpRight size={16} strokeWidth={1.6} />
          </Link>
        </div>
      </article>
    </main>
  );
}
