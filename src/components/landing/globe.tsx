"use client";

import { useEffect, useRef } from "react";

/**
 * Hero WebGL globe (cobe) — the brand's visual signature.
 *
 * Cost control, mobile-first:
 * - initialized on the FIRST user interaction (scroll/pointer/touch/key),
 *   so initial load & lab metrics carry zero WebGL cost;
 * - capped DPR, reduced map samples, 30fps rotation;
 * - skipped entirely on reduced motion.
 */
export function HeroGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let destroy: (() => void) | undefined;
    let cancelled = false;

    const init = () => {
      events.forEach((e) => window.removeEventListener(e, init));
      import("cobe").then(({ default: createGlobe }) => {
        if (cancelled || !canvas) return;
        let phi = 2.8; // start over Europe
        let width = canvas.offsetWidth;
        const onResize = () => {
          width = canvas.offsetWidth;
        };
        window.addEventListener("resize", onResize);

        const px = width * 1.5;
        const globe = createGlobe(canvas, {
          devicePixelRatio: 1.5,
          width: px,
          height: px,
          phi,
          theta: 0.18,
          dark: 1,
          diffuse: 1.2,
          mapSamples: 9000,
          mapBrightness: 5,
          baseColor: [0.12, 0.25, 0.17],
          markerColor: [0.48, 0.99, 0.65],
          glowColor: [0.2, 0.55, 0.32],
          markers: [
            { location: [48.8566, 2.3522], size: 0.045 }, // Paris
            { location: [38.7223, -9.1393], size: 0.045 }, // Lisboa
          ],
        });

        // ~30fps rotation: half the update cost of a 60fps loop
        let raf = 0;
        let skip = false;
        const spin = () => {
          skip = !skip;
          if (!skip) {
            phi += 0.0056;
            globe.update({ phi, width: width * 1.5, height: width * 1.5 });
          }
          raf = requestAnimationFrame(spin);
        };
        raf = requestAnimationFrame(spin);

        canvas.style.opacity = "1";
        destroy = () => {
          cancelAnimationFrame(raf);
          globe.destroy();
          window.removeEventListener("resize", onResize);
        };
      });
    };

    const events = ["scroll", "pointerdown", "touchstart", "keydown", "mousemove"] as const;
    events.forEach((e) => window.addEventListener(e, init, { once: true, passive: true }));

    return () => {
      cancelled = true;
      events.forEach((e) => window.removeEventListener(e, init));
      destroy?.();
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-[46%] -z-0 w-[min(130vw,1200px)] -translate-x-1/2 -translate-y-1/2 opacity-60 sm:top-1/2 sm:opacity-75"
      style={{ aspectRatio: "1" }}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full transition-opacity duration-1000"
        style={{ opacity: 0, contain: "layout paint size" }}
      />
      {/* radial mask so the globe melts into the background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_38%,#070806_72%)]" />
    </div>
  );
}
