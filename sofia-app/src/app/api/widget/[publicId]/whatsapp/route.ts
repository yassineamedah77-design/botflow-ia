import type { NextRequest } from "next/server";

import { assertChatWindowWrite, visitorToken, widgetErrorResponse, widgetJson } from "@/server/widget/http";
import { loadPublicWidget } from "@/server/widget/public";
import { recordWhatsappHandoff, WidgetError } from "@/server/widget/visitor";

/** The visitor opened WhatsApp from the widget: the team learns which reference to expect there. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/widget/[publicId]/whatsapp">) {
  try {
    assertChatWindowWrite(request);
    const widget = await loadPublicWidget((await ctx.params).publicId);
    if (!widget) throw new WidgetError("not_found");
    await recordWhatsappHandoff(widget, { token: visitorToken(request) });
    return widgetJson({ ok: true });
  } catch (error) {
    return widgetErrorResponse(error);
  }
}
