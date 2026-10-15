import { WIDGET_LOADER } from "@/server/widget/loader";

/** The widget's loader, embedded by establishments' websites. Short cache: updates reach sites within minutes. */
export function GET() {
  return new Response(WIDGET_LOADER, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
