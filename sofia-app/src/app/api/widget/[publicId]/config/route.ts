import { after, type NextRequest } from "next/server";

import { isOriginAllowed } from "@/lib/widget";
import { appOrigin } from "@/server/widget/http";
import { isWidgetOpen, loadPublicWidgetCached } from "@/server/widget/public";
import { recordWidgetSeen } from "@/server/widget/visitor";

/**
 * Read by widget.js on every page of the establishment's website: whether to
 * show the launcher on this site, and how. Public data only. The answer
 * depends on the requesting site, so only the visitor's browser caches it:
 * a shared cache could serve one site's answer to another.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/widget/[publicId]/config">) {
  const { publicId } = await ctx.params;
  const origin = request.headers.get("origin");
  const headers = {
    "Access-Control-Allow-Origin": "*",
    Vary: "Origin",
    "Cache-Control": "private, max-age=120",
  };
  const widget = await loadPublicWidgetCached(publicId);
  if (!widget) return Response.json({ enabled: false }, { status: 404, headers });

  // SOFIA's own pages (the preview): browsers send no Origin on a same-origin GET.
  const fromSofia = origin === appOrigin() || (!origin && request.headers.get("sec-fetch-site") === "same-origin");
  const allowed = fromSofia || isOriginAllowed(origin, widget.settings.allowedDomains);
  if (allowed) after(() => recordWidgetSeen(widget, origin));
  return Response.json(
    {
      enabled: isWidgetOpen(widget) && allowed,
      accentColor: widget.settings.accentColor,
      position: widget.settings.position,
      languages: widget.allowedLanguages,
      defaultLanguage: widget.defaultLanguage,
    },
    { headers },
  );
}
