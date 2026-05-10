"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "+40%", label: "productivité moyenne client" },
  { value: "2 800h", label: "automatisées en 2025" },
  { value: "12", label: "agents IA déployés" },
  { value: "98%", label: "satisfaction clients" },
];

const logos = ["Acme", "Lumio", "Vertex", "Aurora", "Helix", "Nova"];

const testimonials = [
  {
    quote:
      "BotFlow.IA a transformé notre opération commerciale. On a récupéré 80h/semaine sans perdre en qualité.",
    author: "Sarah M.",
    role: "Head of Sales, Acme",
  },
  {
    quote:
      "Une équipe technique top, mais surtout un vrai sens du produit. Le ROI a été visible en 6 semaines.",
    author: "Thomas L.",
    role: "CEO, Lumio",
  },
  {
    quote:
      "On cherchait une agence qui comprenait à la fois l'IA et nos enjeux business. On l'a trouvée.",
    author: "Camille D.",
    role: "COO, Aurora",
  },
];

export function Proof() {
  return (
    <section id="proof" className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <p className="text-xs tracking-widest uppercase text-[var(--accent)] mb-4">
            Résultats
          </p>
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
            Des chiffres,{" "}
            <span className="font-serif-italic text-[var(--fg-muted)]">
              pas des promesses
            </span>
            .
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border)] rounded-3xl overflow-hidden mb-24">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-[var(--bg)] p-8 md:p-10 flex flex-col gap-3"
            >
              <div className="text-4xl md:text-5xl font-medium tracking-tight text-[var(--accent)]">
                {s.value}
              </div>
              <div className="text-sm text-[var(--fg-muted)] leading-snug">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 mb-24 opacity-50"
        >
          {logos.map((l) => (
            <div
              key={l}
              className="text-2xl font-serif-italic text-[var(--fg-muted)]"
            >
              {l}
            </div>
          ))}
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={t.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="glass rounded-3xl p-8 flex flex-col gap-6"
            >
              <p className="text-[var(--fg)] leading-relaxed">"{t.quote}"</p>
              <footer className="text-sm">
                <div className="text-[var(--fg)]">{t.author}</div>
                <div className="text-[var(--fg-muted)]">{t.role}</div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
