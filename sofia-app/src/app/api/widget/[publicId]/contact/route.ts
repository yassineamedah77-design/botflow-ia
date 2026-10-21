import type { NextRequest } from "next/server";

import { assertChatWindowWrite, readJsonBody, visitorMeta, visitorToken, widgetErrorResponse, widgetJson } from "@/server/widget/http";
import { loadPublicWidget } from "@/server/widget/public";
import { saveVisitorContact, WidgetError } from "@/server/widget/visitor";

/** Contact details left by the visitor, so the team can answer after she leaves the site. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/widget/[publicId]/contact">) {
  try {
    assertChatWindowWrite(request);
    const widget = await loadPublicWidget((await ctx.params).publicId);
    if (!widget) throw new WidgetError("not_found");
    const body = await readJsonBody(request);
    const result = await saveVisitorContact(widget, { token: visitorToken(request), contact: body.contact, language: body.language }, visitorMeta(request));
    return widgetJson(result);
  } catch (error) {
    return widgetErrorResponse(error);
  }
}
