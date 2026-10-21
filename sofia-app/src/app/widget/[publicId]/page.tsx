import type { Metadata } from "next";

import { WidgetChat } from "@/components/widget/widget-chat";
import { fillText, pickWidgetLanguage, WIDGET_TEXTS, whatsappDigits } from "@/lib/widget";
import { isWidgetOpen, loadPublicWidget } from "@/server/widget/public";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false, follow: false },
};

/**
 * The chat window, shown in an iframe by widget.js on the establishment's
 * website (src/proxy.ts restricts which sites may frame it). Everything the
 * visitor sees comes from here; the conversation itself is loaded and sent by
 * the client component through /api/widget.
 */
export default async function WidgetPage(props: PageProps<"/widget/[publicId]">) {
  const { publicId } = await props.params;
  const search = await props.searchParams;
  const requested = typeof search.lang === "string" ? search.lang : null;
  const widget = await loadPublicWidget(publicId);

  if (!widget || !isWidgetOpen(widget)) {
    const language = pickWidgetLanguage(requested ? [requested] : [], ["fr", "pt", "en"], "fr");
    return (
      <main lang={language} className="flex h-dvh items-center justify-center bg-[#faf8f5] p-8 text-center">
        <p className="max-w-60 text-sm leading-relaxed text-muted-foreground">{WIDGET_TEXTS[language].unavailable}</p>
      </main>
    );
  }

  const language = pickWidgetLanguage(requested ? [requested] : [], widget.allowedLanguages, widget.defaultLanguage);
  const sofiaActive = widget.sofiaStatus === "ACTIVE";
  const texts = WIDGET_TEXTS[language];
  const values = { org: widget.organizationName, assistant: widget.assistantName };

  return (
    <WidgetChat
      publicId={publicId}
      language={language}
      organizationName={widget.organizationName}
      assistantName={widget.assistantName}
      accentColor={widget.settings.accentColor}
      greeting={widget.settings.greeting ?? fillText(sofiaActive ? texts.greetingAi : texts.greetingTeam, values)}
      sofiaActive={sofiaActive}
      whatsapp={widget.settings.whatsappButton ? whatsappDigits(widget.whatsappNumber) : null}
      privacyUrl={widget.settings.privacyUrl}
      pageUrl={typeof search.page === "string" ? search.page.slice(0, 500) : null}
    />
  );
}
