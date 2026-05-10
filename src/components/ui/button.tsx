"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type Variant = "primary" | "outline" | "ghost";

type Props = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  arrow?: boolean;
  external?: boolean;
};

const styles: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 border border-[var(--accent)]",
  outline:
    "bg-transparent text-[var(--accent)] border border-[var(--accent)]/40 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5",
  ghost:
    "bg-transparent text-[var(--fg)] border border-[var(--border)] hover:border-[var(--border-strong)]",
};

export function Button({
  children,
  href,
  onClick,
  variant = "outline",
  className,
  arrow = true,
  external,
}: Props) {
  const inner = (
    <motion.span
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium tracking-tight transition-colors",
        styles[variant],
        className,
      )}
    >
      {children}
      {arrow && <ArrowUpRight size={16} strokeWidth={1.6} />}
    </motion.span>
  );

  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    ) : (
      <Link href={href}>{inner}</Link>
    );
  }
  return <button onClick={onClick}>{inner}</button>;
}
