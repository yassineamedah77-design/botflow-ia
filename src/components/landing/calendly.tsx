"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CALENDLY_URL } from "@/lib/landing";

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (opts: { url: string }) => void;
      initInlineWidget: (opts: { url: string; parentElement: HTMLElement }) => void;
    };
  }
}

const WIDGET_JS = "https://assets.calendly.com/assets/external/widget.js";
const WIDGET_CSS = "https://assets.calendly.com/assets/external/widget.css";

// Brand-matched embed colors (no leading #, Calendly query format)
const THEME = "hide_gdpr_banner=1&background_color=0b0d0a&text_color=f5f5f0&primary_color=7afca5";

export function calendlyUrl(params = "") {
  return `${CALENDLY_URL}?${THEME}${params ? `&${params}` : ""}`;
}

let loader: Promise<void> | null = null;

function loadCalendly(): Promise<void> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    if (window.Calendly) return resolve();
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = WIDGET_CSS;
    document.head.appendChild(css);

    const js = document.createElement("script");
    js.src = WIDGET_JS;
    js.async = true;
    js.onload = () => resolve();
    js.onerror = () => {
      loader = null;
      reject(new Error("calendly load failed"));
    };
    document.body.appendChild(js);
  });
  return loader;
}

/**
 * Warm up the widget on the FIRST user interaction (scroll, touch, key,
 * pointer) so the first CTA click is near-instant — while keeping the
 * initial page load free of third-party requests/cookies.
 */
let warmed = false;
function prefetchOnFirstInteraction() {
  if (warmed) return;
  warmed = true;
  const warm = () => {
    loadCalendly().catch(() => {});
    events.forEach((e) => window.removeEventListener(e, warm));
  };
  const events = ["scroll", "pointerdown", "touchstart", "keydown", "mousemove"] as const;
  events.forEach((e) => window.addEventListener(e, warm, { once: true, passive: true }));
}

/**
 * Primary CTA — opens Calendly as a popup overlay (user stays on page).
 * Falls back to opening Calendly in a new tab if the script fails.
 */
export function CalendlyButton({
  children,
  className,
  utm,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  utm?: string;
  ariaLabel?: string;
}) {
  useEffect(() => {
    prefetchOnFirstInteraction();
  }, []);

  const open = useCallback(async () => {
    const url = calendlyUrl(utm);
    try {
      await loadCalendly();
      window.Calendly!.initPopupWidget({ url });
    } catch {
      window.open(url, "_blank", "noopener");
    }
  }, [utm]);

  return (
    <button type="button" onClick={open} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

/**
 * Inline embed for the final CTA section.
 * Lazy: only initializes when the section approaches the viewport.
 */
export function CalendlyInline({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let initialized = false;

    const init = () => {
      if (initialized) return;
      initialized = true;
      loadCalendly()
        .then(() => {
          window.Calendly!.initInlineWidget({
            url: calendlyUrl("utm_source=landing&utm_medium=inline"),
            parentElement: el,
          });
        })
        .catch(() => setFailed(true));
    };

    if (!("IntersectionObserver" in window)) {
      init();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          init();
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (failed) {
    return (
      <div className={className}>
        <a
          href={calendlyUrl()}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-6 py-4 font-medium text-[var(--accent)]"
        >
          Ouvrir le calendrier de réservation ↗
        </a>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight: 680 }}
      role="region"
      aria-label="Calendrier de réservation de l'audit gratuit de 30 minutes"
    />
  );
}
