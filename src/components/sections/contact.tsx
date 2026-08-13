"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function Contact() {
  return (
    <section
      id="contact"
      className="relative py-32 px-6 overflow-hidden stars"
    >
      <div className="absolute inset-0 radial-aurora opacity-60" />
      <div className="absolute inset-0 bg-grain opacity-30" />

      <div className="relative max-w-4xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-xs tracking-widest uppercase text-[var(--accent)] mb-6"
        >
          Contact
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-medium tracking-tight leading-[0.95] mb-8"
        >
          Prêt à{" "}
          <span className="font-serif-italic text-[var(--accent)]">
            automatiser
          </span>
          <br />
          ce qui freine votre croissance ?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg text-[var(--fg-muted)] max-w-xl mx-auto mb-12"
        >
          30 minutes pour identifier vos cas d'usage prioritaires et estimer
          l'impact business. Sans engagement.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          <Button
            href="mailto:contact@botflow.ia"
            variant="primary"
            external
          >
            Réserver un audit gratuit
          </Button>
          <Button href="mailto:contact@botflow.ia" variant="ghost" external>
            contact@botflow.ia
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-32 pt-12 border-t border-[var(--border)] flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-[var(--fg-muted)]"
        >
          <div>
            BotFlow<span className="text-[var(--accent)]">.IA</span> · 2026
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[var(--fg)] transition-colors">
              LinkedIn
            </a>
            <a href="#" className="hover:text-[var(--fg)] transition-colors">
              X / Twitter
            </a>
            <a href="#" className="hover:text-[var(--fg)] transition-colors">
              Mentions légales
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
