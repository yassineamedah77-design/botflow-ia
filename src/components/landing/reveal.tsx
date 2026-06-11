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
  effect = "rise",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** "rise" = translateY fade · "rise3d" = perspective rotateX entrance */
  effect?: "rise" | "rise3d";
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

    const hidden =
      effect === "rise3d"
        ? "perspective(900px) rotateX(13deg) translateY(36px) scale(.98)"
        : "translateY(24px)";
    const shown =
      effect === "rise3d"
        ? "perspective(900px) rotateX(0deg) translateY(0) scale(1)"
        : "translateY(0)";

    el.style.opacity = "0";
    el.style.transform = hidden;
    if (effect === "rise3d") el.style.transformOrigin = "50% 100%";
    el.style.transition = `opacity .8s cubic-bezier(.22,.9,.28,1) ${delay}ms, transform .8s cubic-bezier(.22,.9,.28,1) ${delay}ms`;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.style.opacity = "1";
          el.style.transform = shown;
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, effect]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
