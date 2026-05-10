"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const NeuralOrb = dynamic(
  () => import("@/components/three/neural-orb").then((m) => m.NeuralOrb),
  { ssr: false, loading: () => <div className="absolute inset-0" /> },
);

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden stars">
      <div className="absolute inset-0 radial-aurora" />
      <div className="absolute inset-0 bg-grain opacity-40" />

      <div className="absolute inset-0 pointer-events-none opacity-90">
        <NeuralOrb />
      </div>

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-[var(--fg-muted)] mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          Agence d'automatisation IA · 2026
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight leading-[0.95]"
        >
          L'IA au service
          <br />
          de <span className="font-serif-italic text-[var(--accent)]">l'humain</span>,
          <br />
          pas l'inverse.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="mt-8 text-lg md:text-xl text-[var(--fg-muted)] max-w-2xl mx-auto leading-relaxed"
        >
          BotFlow.IA conçoit et déploie des agents et workflows
          d'automatisation pour les entreprises ambitieuses. Audit,
          implémentation, scaling.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7 }}
          className="mt-10 flex items-center justify-center gap-3 flex-wrap"
        >
          <Button href="#contact" variant="outline">
            Démarrer un projet
          </Button>
          <Button href="#work" variant="ghost">
            Voir nos réalisations
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-[var(--fg-muted)] tracking-widest uppercase"
      >
        Scroll ↓
      </motion.div>
    </section>
  );
}
