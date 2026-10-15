import { after, type NextRequest } from "next/server";

import { logger } from "@/server/observability/logger";
import { assertChatWindowRead, assertChatWindowWrite, readJsonBody, visitorMeta, visitorToken, widgetErrorResponse, widgetJson } from "@/server/widget/http";
import { loadPublicWidget } from "@/server/widget/public";
import { answerVisitorMessage, listVisitorMessages, postVisitorMessage, WidgetError } from "@/server/widget/visitor";

// SOFIA answers after the response is sent, within this function's lifetime.
export const maxDuration = 60;

/** The visitor's conversation: messages since a date, and what the window should show. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/widget/[publicId]/messages">) {
  try {
    assertChatWindowRead(request);
    const widget = await loadPublicWidget((await ctx.params).publicId);
    if (!widget) throw new WidgetError("not_found");
    const result = await listVisitorMessages(widget, { token: visitorToken(request), since: request.nextUrl.searchParams.get("since") });
    return widgetJson(result);
  } catch (error) {
    return widgetErrorResponse(error);
  }
}

/** A visitor's message. The first one opens the conversation and returns the visitor's key. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/widget/[publicId]/messages">) {
  try {
    assertChatWindowWrite(request);
    const widget = await loadPublicWidget((await ctx.params).publicId);
    if (!widget) throw new WidgetError("not_found");
    const body = await readJsonBody(request);
    const posted = await postVisitorMessage(widget, { token: visitorToken(request), body: body.body, language: body.language, pageUrl: body.pageUrl }, visitorMeta(request));
    if (posted.answer) {
      after(async () => {
        try {
          await answerVisitorMessage(widget, posted.conversationId);
        } catch (error) {
          logger.error("Widget answer failed", { err: error, organizationId: widget.organizationId, conversationId: posted.conversationId });
        }
      });
    }
    return widgetJson({ token: posted.token, message: posted.message, awaitingReply: posted.answer }, { status: 201 });
  } catch (error) {
    return widgetErrorResponse(error);
  }
}
