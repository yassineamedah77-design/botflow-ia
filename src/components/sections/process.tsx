"use client";

import { motion } from "framer-motion";
import { Search, Cpu, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Search,
    n: "01",
    title: "Audit",
    desc: "Cartographie de vos processus, identification des goulots d'étranglement, scoring ROI par cas d'usage.",
    deliverables: ["Audit opérationnel", "Roadmap priorisée", "Estimation ROI"],
  },
  {
    icon: Cpu,
    n: "02",
    title: "Automatisation",
    desc: "Conception et déploiement d'agents et workflows. Intégration dans votre stack existant. Tests rigoureux.",
    deliverables: ["Agents IA sur mesure", "Workflows n8n / Make", "Documentation complète"],
  },
  {
    icon: TrendingUp,
    n: "03",
    title: "Scaling",
    desc: "Mesure d'impact, optimisation continue, formation des équipes, extension à de nouveaux cas d'usage.",
    deliverables: ["Dashboards monitoring", "Itérations mensuelles", "Transfert de compétences"],
  },
];

export function Process() {
  return (
    <section id="process" className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <p className="text-xs tracking-widest uppercase text-[var(--accent)] mb-4">
            Procédé
          </p>
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight max-w-3xl mx-auto">
            Trois étapes,{" "}
            <span className="font-serif-italic text-[var(--fg-muted)]">
              un seul objectif
            </span>{" "}
            : votre ROI.
          </h2>
        </motion.div>

        <div className="relative grid md:grid-cols-3 gap-6">
          <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />

          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="relative glass rounded-3xl p-8 flex flex-col gap-6"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 flex items-center justify-center text-[var(--accent)]">
                    <Icon size={20} strokeWidth={1.6} />
                  </div>
                  <span className="text-xs tracking-widest text-[var(--fg-muted)]">
                    {s.n}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-medium tracking-tight mb-3">
                    {s.title}
                  </h3>
                  <p className="text-[var(--fg-muted)] leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                <ul className="flex flex-col gap-2 pt-4 border-t border-[var(--border)]">
                  {s.deliverables.map((d) => (
                    <li
                      key={d}
                      className="text-sm text-[var(--fg-muted)] flex items-center gap-2"
                    >
                      <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
                      {d}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
