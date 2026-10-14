"use client";

import { BotIcon, HandIcon, Loader2Icon, PanelRightIcon, SendHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type * as React from "react";

import {
  markConversationReadAction,
  releaseConversationAction,
  sendReplyAction,
  takeOverConversationAction,
} from "@/app/(app)/inbox/actions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/forms/action-state";

function report(result: ActionState) {
  if (result.status === "success") toast.success(result.message ?? "Fait.");
  else if (result.status === "error") toast.error(result.message);
}

/** Marks the open conversation as read, once. */
export function MarkConversationRead({ conversationId, unread }: { conversationId: string; unread: number }) {
  useEffect(() => {
    if (unread > 0) void markConversationReadAction(conversationId);
  }, [conversationId, unread]);
  return null;
}

/** Keeps the latest message in view when the thread opens or grows. */
export function ThreadScroller({ children, messageCount, className }: { children: React.ReactNode; messageCount: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messageCount]);
  return (
    <div ref={ref} className={className} tabIndex={0} aria-label="Messages de la conversation">
      {children}
    </div>
  );
}

/** New messages arrive through webhooks: refresh the inbox every 30 s while it is visible. */
export function InboxAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}

export function HandoffButton({ conversationId, mode, canTakeOver }: { conversationId: string; mode: "AI_ACTIVE" | "HUMAN_ACTIVE"; canTakeOver: boolean }) {
  const [pending, startTransition] = useTransition();
  if (!canTakeOver) return null;
  return mode === "AI_ACTIVE" ? (
    <Button size="sm" disabled={pending} onClick={() => startTransition(async () => report(await takeOverConversationAction(conversationId)))}>
      {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : <HandIcon aria-hidden />}
      Prendre la conversation
    </Button>
  ) : (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(async () => report(await releaseConversationAction(conversationId)))}
    >
      {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : <BotIcon aria-hidden />}
      Rendre à SOFIA
    </Button>
  );
}

export function Composer({ conversationId, disabledReason }: { conversationId: string; disabledReason: React.ReactNode | null }) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const disabled = Boolean(disabledReason);

  const submit = () => {
    const text = body.trim();
    if (!text || disabled) return;
    startTransition(async () => {
      const result = await sendReplyAction(conversationId, text);
      if (result.status === "success") setBody("");
      report(result);
    });
  };

  return (
    <div className="border-t border-border bg-card/80 px-4 py-3 sm:px-5">
      {disabledReason ? <div className="mb-2 text-xs leading-relaxed text-muted-foreground">{disabledReason}</div> : null}
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor="reply" className="sr-only">
          Votre réponse
        </label>
        <Textarea
          id="reply"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={4000}
          disabled={disabled || pending}
          placeholder={disabled ? "Réponse indisponible" : "Écrire une réponse… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)"}
          className="max-h-40 min-h-10 resize-none bg-background"
        />
        <Button type="submit" size="icon" className="size-10 shrink-0" disabled={disabled || pending || !body.trim()} aria-label="Envoyer">
          {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : <SendHorizontalIcon aria-hidden />}
        </Button>
      </form>
    </div>
  );
}

/** The contact panel below the xl breakpoint: opened from the thread header. */
export function ContactSheet({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="xl:hidden">
          <PanelRightIcon aria-hidden />
          Fiche
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[22rem] max-w-[92vw] overflow-y-auto p-0">
        <SheetTitle className="sr-only">Fiche du contact</SheetTitle>
        <SheetDescription className="sr-only">Informations et actions sur le contact de la conversation</SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  );
}
