"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll reveal wrapper — IntersectionObserver + direct style mutation.
 * Children are visible by default (no-JS / reduced-motion / SEO safe);
 * the hidden state is only applied when JS confirms the element is
 * below the viewport at mount.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return; // stays visible
    }
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      return; // already in view — no hide/flash
    }

    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = `opacity .7s cubic-bezier(.22,.9,.28,1) ${delay}ms, transform .7s cubic-bezier(.22,.9,.28,1) ${delay}ms`;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
