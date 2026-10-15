"use client";

import { useEffect } from "react";

/**
 * Loads the real widget.js on this page, as an establishment's website would,
 * and removes it on the way out so it does not follow the user around the app.
 */
export function WidgetPreview({ publicId }: { publicId: string }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/widget.js";
    script.async = true;
    script.dataset.sofia = publicId;
    document.body.appendChild(script);
    return () => {
      script.remove();
      document.querySelectorAll("[data-sofia-widget]").forEach((element) => element.remove());
      const scope = window as unknown as Record<string, unknown>;
      delete scope[`__sofia_${publicId}`];
      delete scope.SofiaWidget;
    };
  }, [publicId]);
  return null;
}
