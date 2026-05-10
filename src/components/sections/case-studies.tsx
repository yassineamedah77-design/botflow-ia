"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { caseStudies } from "@/lib/case-studies";

export function CaseStudies() {
  return (
    <section id="work" className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16"
        >
          <div>
            <p className="text-xs tracking-widest uppercase text-[var(--accent)] mb-4">
              Projets
            </p>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight max-w-2xl">
              Études de cas{" "}
              <span className="font-serif-italic text-[var(--fg-muted)]">
                récentes
              </span>
              .
            </h2>
          </div>
          <p className="text-[var(--fg-muted)] max-w-md">
            Des projets concrets, des résultats mesurés. Chaque mission est
            documentée du problème à l'impact business.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {caseStudies.map((cs, i) => (
            <motion.div
              key={cs.slug}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: (i % 2) * 0.1 }}
            >
              <Link
                href={`/work/${cs.slug}`}
                className="group block relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-8 md:p-10 transition-all hover:border-[var(--accent)]/40"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute -inset-1/2 bg-gradient-to-br from-[var(--accent)]/10 via-transparent to-transparent blur-3xl" />
                </div>

                <div className="relative flex flex-col gap-6 min-h-[320px]">
                  <div className="flex items-center justify-between text-xs tracking-widest uppercase text-[var(--fg-muted)]">
                    <span>{cs.industry}</span>
                    <span>{cs.duration}</span>
                  </div>

                  <div className="flex-1">
                    <div className="text-2xl font-serif-italic text-[var(--accent)] mb-3">
                      {cs.client}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-medium tracking-tight leading-tight mb-4 group-hover:text-[var(--accent)] transition-colors">
                      {cs.title}
                    </h3>
                    <p className="text-[var(--fg-muted)] leading-relaxed">
                      {cs.excerpt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-[var(--border)]">
                    <div className="flex flex-wrap gap-2">
                      {cs.results.slice(0, 2).map((r) => (
                        <span
                          key={r.label}
                          className="text-sm font-medium text-[var(--accent)]"
                        >
                          {r.metric}
                        </span>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] group-hover:text-[var(--accent)] transition-colors">
                      Lire <ArrowUpRight size={14} strokeWidth={1.6} />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
