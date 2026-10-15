import { after, type NextRequest } from "next/server";

import { isOriginAllowed } from "@/lib/widget";
import { appOrigin } from "@/server/widget/http";
import { isWidgetOpen, loadPublicWidget } from "@/server/widget/public";
import { recordWidgetSeen } from "@/server/widget/visitor";

/**
 * Read by widget.js on every page of the establishment's website: whether to
 * show the launcher on this site, and how. Public data only, cached briefly
 * per requesting origin.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/widget/[publicId]/config">) {
  const { publicId } = await ctx.params;
  const origin = request.headers.get("origin");
  const headers = {
    "Access-Control-Allow-Origin": "*",
    Vary: "Origin",
    "Cache-Control": "public, max-age=60, s-maxage=60",
  };
  const widget = await loadPublicWidget(publicId);
  if (!widget) return Response.json({ enabled: false }, { status: 404, headers });

  const allowed = origin === appOrigin() || isOriginAllowed(origin, widget.settings.allowedDomains);
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
