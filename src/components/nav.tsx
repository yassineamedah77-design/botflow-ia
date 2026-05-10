"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const links = [
  { href: "#process", label: "Procédé" },
  { href: "#stack", label: "Stack" },
  { href: "#work", label: "Projets" },
  { href: "#proof", label: "Témoignages" },
];

export function Nav() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="glass rounded-full px-2 py-2 flex items-center gap-1">
        <Link
          href="/"
          className="px-4 py-2 text-sm font-medium tracking-tight"
        >
          BotFlow<span className="text-[var(--accent)]">.IA</span>
        </Link>
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-4 py-2 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors rounded-full"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <Link
          href="#contact"
          className="ml-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--accent)]/40 text-sm text-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors"
        >
          Contact
          <ArrowUpRight size={14} strokeWidth={1.6} />
        </Link>
      </div>
    </motion.nav>
  );
}
