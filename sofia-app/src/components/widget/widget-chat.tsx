"use client";

import { cn } from "cn";
import { ArrowUpIcon, CheckIcon, CircleAlertIcon, Loader2Icon, PhoneIcon, SparklesIcon, XIcon } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { WhatsAppIcon } from "@/components/brand/channel-icons";
import { fillText, readableTextColor, VISITOR_MESSAGE_MAX_LENGTH, WIDGET_TEXTS, type WidgetLanguage } from "@/lib/widget";

/*
 * The visitor's chat window (inside the iframe opened by widget.js). It keeps
 * the visitor's key in its own storage, polls for answers (fast while SOFIA
 * writes, slowly otherwise) and talks to the host page only through
 * postMessage: open, close, unread count, "a conversation exists".
 */

interface VisitorMessage {
  id: string;
  author: "visitor" | "assistant" | "team";
  body: string;
  createdAt: string;
}

interface VisitorState {
  sofiaActive: boolean;
  humanActive: boolean;
  awaitingReply: boolean;
  needsContact: boolean;
  contactKnown: boolean;
  reference: string;
}

interface LocalMessage extends VisitorMessage {
  delivery: "sending" | "failed";
  error?: string;
}

type ErrorCode = "not_found" | "closed" | "session" | "invalid" | "rate_limited" | "still_answering" | "unavailable";

class ChatError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly fields?: Record<string, string[]>,
  ) {
    super(code);
  }
}

export interface WidgetChatProps {
  publicId: string;
  language: WidgetLanguage;
  organizationName: string;
  assistantName: string;
  accentColor: string;
  greeting: string;
  sofiaActive: boolean;
  /** wa.me digits when the "Continue on WhatsApp" button is on. */
  whatsapp: string | null;
  privacyUrl: string | null;
  pageUrl: string | null;
}

const byDate = (a: VisitorMessage, b: VisitorMessage) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

function merge(current: VisitorMessage[], incoming: VisitorMessage[]) {
  const map = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) map.set(message.id, message);
  return [...map.values()].sort(byDate);
}

const noSubscription = () => () => undefined;

function postToHost(type: string, extra: Record<string, unknown> = {}) {
  if (window.parent === window) return;
  window.parent.postMessage({ sofia: true, type, ...extra }, "*");
}

export function WidgetChat(props: WidgetChatProps) {
  const { publicId, language, accentColor } = props;
  const texts = WIDGET_TEXTS[language];
  const values = { org: props.organizationName, assistant: props.assistantName };
  const onAccent = readableTextColor(accentColor);
  const storageKey = `sofia-widget:${publicId}`;

  // Inside widget.js's iframe, or opened directly (preview): known in the browser only.
  const embedded = useSyncExternalStore(
    noSubscription,
    () => window.parent !== window,
    () => false,
  );
  // An embedded window starts closed until the host page opens it.
  const [openState, setOpenState] = useState<boolean | null>(null);
  const isOpen = openState ?? !embedded;
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<VisitorMessage[]>([]);
  const [local, setLocal] = useState<LocalMessage[]>([]);
  const [state, setState] = useState<VisitorState | null>(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactDone, setContactDone] = useState(false);
  const [contactDismissed, setContactDismissed] = useState(false);
  const [tick, setTick] = useState(0);

  const tokenRef = useRef<string | null>(null);
  const lastSeenRef = useRef<string | null>(null);
  const openRef = useRef(true);
  const unreadRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const api = useCallback(
    async (path: string, init: { method?: "GET" | "POST"; body?: unknown; token?: string | null } = {}) => {
      const response = await fetch(`/api/widget/${encodeURIComponent(publicId)}/${path}`, {
        method: init.method ?? "GET",
        headers: {
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) throw new ChatError((data.error as ErrorCode) ?? "unavailable", data.fields as Record<string, string[]> | undefined);
      return data;
    },
    [publicId],
  );

  const forgetToken = useCallback(() => {
    tokenRef.current = null;
    setToken(null);
    setMessages([]);
    setState(null);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Storage blocked: nothing was kept.
    }
  }, [storageKey]);

  const refresh = useCallback(
    async (full = false) => {
      const current = tokenRef.current;
      if (!current) return;
      setToken(current);
      const since = full ? null : lastSeenRef.current;
      try {
        const data = await api(`messages${since ? `?since=${encodeURIComponent(since)}` : ""}`, { token: current });
        const incoming = data.messages as VisitorMessage[];
        setMessages((previous) => {
          const known = new Set(previous.map((message) => message.id));
          const fresh = incoming.filter((message) => !known.has(message.id) && message.author !== "visitor");
          if (!openRef.current && fresh.length > 0 && previous.length > 0) {
            unreadRef.current += fresh.length;
            postToHost("unread", { count: unreadRef.current });
          }
          return merge(full ? [] : previous, incoming);
        });
        setState(data.state as VisitorState);
      } catch (error) {
        if (error instanceof ChatError && error.code === "session") forgetToken();
      } finally {
        setTick((value) => value + 1);
      }
    },
    [api, forgetToken],
  );

  // Start: resume the visitor's conversation, if any, and tell the host page we are ready.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(storageKey);
    } catch {
      // Storage blocked (private mode): every visit starts a new conversation.
    }
    if (saved) {
      tokenRef.current = saved;
      void refresh(true);
    }
    if (window.parent !== window) {
      openRef.current = false;
      postToHost("ready");
    }
    function onMessage(event: MessageEvent) {
      if (event.source !== window.parent || !event.data || event.data.sofia !== true) return;
      if (event.data.type === "open") {
        openRef.current = true;
        setOpenState(true);
        unreadRef.current = 0;
        setTimeout(() => inputRef.current?.focus(), 80);
      } else if (event.data.type === "close") {
        openRef.current = false;
        setOpenState(false);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // Runs once: the key and the host page do not change during a visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    lastSeenRef.current = messages.at(-1)?.createdAt ?? null;
  }, [messages]);

  // Polling: quick while SOFIA writes, calmer when the window is closed or hidden.
  useEffect(() => {
    if (!token) return;
    const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
    const delay = state?.awaitingReply ? 1500 : hidden ? 30_000 : isOpen ? 4000 : 15_000;
    const timer = setTimeout(() => void refresh(), delay);
    return () => clearTimeout(timer);
  }, [token, state?.awaitingReply, isOpen, tick, refresh]);

  // Keep the newest message in view.
  const visibleCount = messages.length + local.length;
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [visibleCount, state?.awaitingReply, contactOpen]);

  const errorText = useCallback(
    (code: ErrorCode) =>
      ({
        rate_limited: texts.rateLimited,
        invalid: texts.tooLong,
        still_answering: fillText(texts.stillAnswering, values),
        closed: texts.unavailable,
        not_found: texts.unavailable,
        session: texts.failed,
        unavailable: texts.failed,
      })[code],
    // texts and values are derived from props that do not change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language],
  );

  const send = useCallback(
    async (text: string, retryOf?: string) => {
      const body = text.trim();
      if (!body) return;
      const temp: LocalMessage = { id: retryOf ?? `local-${Date.now()}`, author: "visitor", body, createdAt: new Date().toISOString(), delivery: "sending" };
      setLocal((previous) => [...previous.filter((message) => message.id !== temp.id), temp]);
      setNotice(null);
      const payload = { body, language, pageUrl: props.pageUrl ?? undefined };
      try {
        let data: Record<string, unknown>;
        try {
          data = await api("messages", { method: "POST", body: payload, token: tokenRef.current });
        } catch (error) {
          // The conversation was removed on SOFIA's side: start a new one.
          if (!(error instanceof ChatError) || error.code !== "session" || !tokenRef.current) throw error;
          forgetToken();
          data = await api("messages", { method: "POST", body: payload, token: null });
        }
        const isNew = tokenRef.current !== data.token;
        tokenRef.current = data.token as string;
        setToken(data.token as string);
        if (isNew) {
          try {
            window.localStorage.setItem(storageKey, data.token as string);
          } catch {
            // Storage blocked: the conversation lasts as long as the page.
          }
          postToHost("session");
        }
        setLocal((previous) => previous.filter((message) => message.id !== temp.id));
        setMessages((previous) => merge(previous, [data.message as VisitorMessage]));
        setState((previous) => (previous ? { ...previous, awaitingReply: Boolean(data.awaitingReply) } : previous));
        if (isNew) await refresh(true);
        else setTick((value) => value + 1);
      } catch (error) {
        const code = error instanceof ChatError ? error.code : "unavailable";
        setLocal((previous) => previous.map((message) => (message.id === temp.id ? { ...message, delivery: "failed", error: errorText(code) } : message)));
      }
    },
    [api, errorText, forgetToken, language, props.pageUrl, refresh, storageKey],
  );

  const awaiting = Boolean(state?.awaitingReply) || local.some((message) => message.delivery === "sending");
  const canSend = draft.trim().length > 0 && !awaiting;

  function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!canSend) {
      if (state?.awaitingReply) setNotice(fillText(texts.stillAnswering, values));
      return;
    }
    const text = draft;
    setDraft("");
    void send(text);
  }

  const reference = state?.reference ?? null;
  const whatsappHref = useMemo(() => {
    if (!props.whatsapp) return null;
    const text = reference ? fillText(texts.whatsappPrefill, { ref: reference }) : texts.whatsappPrefill.replace(/\s*\([^)]*\{ref\}\)/, "");
    return `https://wa.me/${props.whatsapp}?text=${encodeURIComponent(text)}`;
  }, [props.whatsapp, reference, texts.whatsappPrefill]);

  const showContact = Boolean(token) && !contactDone && (contactOpen || (Boolean(state?.needsContact) && !contactDismissed));
  const showContactChip = Boolean(token) && !contactDone && !state?.contactKnown && !showContact;
  const humanActive = Boolean(state?.humanActive);
  const aiAnswering = props.sofiaActive && !humanActive;
  const title = aiAnswering ? props.assistantName : props.organizationName;
  const initial = (title.trim()[0] ?? "S").toUpperCase();
  const time = useMemo(() => new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit" }), [language]);

  const shown: Array<VisitorMessage | LocalMessage> = token ? [...messages, ...local] : [
    { id: "greeting", author: props.sofiaActive ? "assistant" : "team", body: props.greeting, createdAt: "" },
    ...local,
  ];

  return (
    <div
      lang={language}
      className="flex h-dvh flex-col bg-[#faf8f5] text-[#161514]"
      onKeyDown={(event) => {
        if (event.key === "Escape" && embedded) postToHost("close");
      }}
    >
      <header className="flex items-center gap-3 border-b border-black/[0.06] bg-white/90 px-4 py-3 backdrop-blur">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full font-heading text-base font-semibold shadow-sm"
          style={{ background: accentColor, color: onAccent }}
          aria-hidden
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold leading-tight">{title}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-[#6b6660]">
            <span className={cn("size-1.5 shrink-0 rounded-full", aiAnswering ? "bg-emerald-500" : "bg-amber-500")} aria-hidden />
            {aiAnswering ? `${texts.statusAi.split(" · ")[0]} · ${props.organizationName}` : humanActive ? fillText(texts.team, values) : texts.statusTeam}
          </p>
        </div>
        {embedded ? (
          <button
            type="button"
            onClick={() => postToHost("close")}
            className="flex size-9 items-center justify-center rounded-full text-[#6b6660] transition hover:bg-black/[0.05] hover:text-[#161514] focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: accentColor }}
            aria-label={texts.close}
          >
            <XIcon className="size-5" aria-hidden />
          </button>
        ) : null}
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" role="log" aria-live="polite" aria-relevant="additions">
        {props.sofiaActive ? (
          <p className="mx-auto mb-4 flex max-w-[19rem] items-start gap-1.5 text-center text-[0.6875rem] leading-relaxed text-[#8a847d]">
            <SparklesIcon className="mt-0.5 size-3 shrink-0" aria-hidden />
            <span>{fillText(texts.aiNotice, values)}</span>
          </p>
        ) : null}

        <ul className="space-y-2.5">
          {shown.map((message, index) => {
            const mine = message.author === "visitor";
            const previous = shown[index - 1];
            const showAuthor = !mine && message.author === "team" && previous?.author !== "team";
            const failed = "delivery" in message && message.delivery === "failed";
            const sending = "delivery" in message && message.delivery === "sending";
            return (
              <li key={message.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")} data-author={message.author}>
                {showAuthor ? <span className="mb-1 px-1 text-[0.6875rem] font-medium text-[#8a847d]">{fillText(texts.team, values)}</span> : null}
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[0.9375rem] leading-relaxed shadow-[0_1px_2px_rgba(22,21,20,0.06)]",
                    mine ? "rounded-br-md" : "rounded-bl-md border border-black/[0.06] bg-white",
                    sending && "opacity-70",
                  )}
                  style={mine ? { background: accentColor, color: onAccent } : undefined}
                  data-testid={mine ? undefined : "widget-reply"}
                >
                  {message.body}
                </div>
                {failed ? (
                  <button
                    type="button"
                    onClick={() => void send(message.body, message.id)}
                    className="mt-1 flex items-center gap-1 px-1 text-[0.6875rem] font-medium text-red-600 hover:underline"
                  >
                    <CircleAlertIcon className="size-3" aria-hidden />
                    {"error" in message && message.error ? `${message.error} ` : ""}
                    {texts.retry}
                  </button>
                ) : message.createdAt ? (
                  <span className="mt-1 px-1 text-[0.625rem] text-[#a39d96]">{time.format(new Date(message.createdAt))}</span>
                ) : null}
              </li>
            );
          })}
        </ul>

        {state?.awaitingReply ? (
          <div className="mt-2.5 flex items-center gap-2" aria-label={fillText(texts.typing, values)}>
            <span className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-black/[0.06] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(22,21,20,0.06)]">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="size-1.5 animate-bounce rounded-full bg-[#a39d96] motion-reduce:animate-none"
                  style={{ animationDelay: `${dot * 140}ms` }}
                />
              ))}
            </span>
            <span className="text-[0.6875rem] text-[#8a847d]">{fillText(texts.typing, values)}</span>
          </div>
        ) : null}

        {showContact ? (
          <ContactCard
            texts={texts}
            values={values}
            accentColor={accentColor}
            onAccent={onAccent}
            onCancel={() => {
              setContactOpen(false);
              setContactDismissed(true);
            }}
            onSubmit={async (contact) => {
              await api("contact", { method: "POST", body: { contact, language }, token: tokenRef.current });
              setContactDone(true);
              setContactOpen(false);
              void refresh();
            }}
          />
        ) : null}
        {contactDone ? (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-700">
            <CheckIcon className="size-3.5" aria-hidden />
            {texts.contactSaved}
          </p>
        ) : null}
      </div>

      <div className="border-t border-black/[0.06] bg-white px-3 pb-2 pt-2.5">
        {showContactChip || whatsappHref ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {showContactChip ? (
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="flex h-8 items-center gap-1.5 rounded-full border border-black/[0.1] bg-white px-3 text-xs font-medium text-[#3d3935] transition hover:bg-black/[0.03]"
              >
                <PhoneIcon className="size-3.5" aria-hidden />
                {texts.leaveContact}
              </button>
            ) : null}
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (tokenRef.current) void api("whatsapp", { method: "POST", body: {}, token: tokenRef.current }).catch(() => undefined);
                }}
                className="flex h-8 items-center gap-1.5 rounded-full border border-black/[0.1] bg-white px-3 text-xs font-medium text-[#3d3935] transition hover:bg-black/[0.03]"
              >
                <WhatsAppIcon className="size-3.5 text-[#25d366]" />
                {texts.whatsapp}
              </a>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={submit} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, VISITOR_MESSAGE_MAX_LENGTH))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) submit(event);
            }}
            rows={1}
            placeholder={texts.placeholder}
            aria-label={texts.placeholder}
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-black/[0.1] bg-[#faf8f5] px-3.5 py-2.5 text-[0.9375rem] leading-snug outline-none transition placeholder:text-[#a39d96] focus:border-transparent focus:bg-white focus:ring-2 [field-sizing:content]"
            style={{ "--tw-ring-color": accentColor } as React.CSSProperties}
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label={texts.send}
            className="flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm transition disabled:opacity-40"
            style={{ background: accentColor, color: onAccent }}
          >
            {awaiting ? <Loader2Icon className="size-5 animate-spin" aria-hidden /> : <ArrowUpIcon className="size-5" aria-hidden />}
          </button>
        </form>
        {notice ? (
          <p className="mt-1.5 px-1 text-[0.6875rem] text-[#8a847d]" role="status">
            {notice}
          </p>
        ) : null}
        <p className="mt-2 px-1 text-center text-[0.625rem] leading-relaxed text-[#a39d96]">
          {fillText(texts.privacyNotice, values)}
          {props.privacyUrl ? (
            <>
              {" "}
              <a href={props.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#6b6660]">
                {texts.privacyLink}
              </a>
            </>
          ) : null}
          {" · "}
          {texts.poweredBy}
        </p>
      </div>
    </div>
  );
}

interface ContactValues {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  marketingConsent: boolean;
  website: string;
}

function ContactCard(props: {
  texts: (typeof WIDGET_TEXTS)[WidgetLanguage];
  values: { org: string; assistant: string };
  accentColor: string;
  onAccent: string;
  onCancel: () => void;
  onSubmit: (contact: ContactValues) => Promise<void>;
}) {
  const { texts } = props;
  const [form, setForm] = useState<ContactValues>({ firstName: "", lastName: "", phone: "", email: "", marketingConsent: false, website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const field = (name: keyof ContactValues) => ({
    value: form[name] as string,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [name]: event.target.value })),
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = texts.firstName;
    if (!form.phone.trim() && !form.email.trim()) next.phone = texts.phoneOrEmail;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setPending(true);
    try {
      await props.onSubmit(form);
    } catch (error) {
      const fields = error instanceof ChatError ? error.fields : undefined;
      setErrors(
        fields
          ? Object.fromEntries(Object.keys(fields).map((key) => [key, key === "email" ? `${texts.email} ?` : key === "phone" ? `${texts.phone} ?` : texts.failed]))
          : { form: error instanceof ChatError && error.code === "rate_limited" ? texts.rateLimited : texts.failed },
      );
    } finally {
      setPending(false);
    }
  }

  const input =
    "h-10 w-full rounded-xl border border-black/[0.1] bg-white px-3 text-sm outline-none transition placeholder:text-[#a39d96] focus:border-transparent focus:ring-2";
  const ring = { "--tw-ring-color": props.accentColor } as React.CSSProperties;

  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_2px_8px_rgba(22,21,20,0.06)]" aria-label={texts.contactTitle} noValidate>
      <p className="text-sm font-semibold">{texts.contactTitle}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#6b6660]">{texts.contactIntro}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="sr-only" htmlFor="widget-first-name">
          {texts.firstName}
        </label>
        <input id="widget-first-name" autoComplete="given-name" placeholder={texts.firstName} className={input} style={ring} aria-invalid={Boolean(errors.firstName)} {...field("firstName")} />
        <label className="sr-only" htmlFor="widget-last-name">
          {texts.lastName}
        </label>
        <input id="widget-last-name" autoComplete="family-name" placeholder={texts.lastName} className={input} style={ring} {...field("lastName")} />
        <label className="sr-only" htmlFor="widget-phone">
          {texts.phone}
        </label>
        <input id="widget-phone" type="tel" autoComplete="tel" placeholder={texts.phone} className={cn(input, "col-span-2")} style={ring} aria-invalid={Boolean(errors.phone)} {...field("phone")} />
        <label className="sr-only" htmlFor="widget-email">
          {texts.email}
        </label>
        <input id="widget-email" type="email" autoComplete="email" placeholder={texts.email} className={cn(input, "col-span-2")} style={ring} aria-invalid={Boolean(errors.email)} {...field("email")} />
        {/* Honeypot: invisible to people, filled by bots. */}
        <input tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" {...field("website")} />
      </div>
      <label className="mt-3 flex items-start gap-2 text-[0.6875rem] leading-relaxed text-[#6b6660]">
        <input
          type="checkbox"
          checked={form.marketingConsent}
          onChange={(event) => setForm((current) => ({ ...current, marketingConsent: event.target.checked }))}
          className="mt-0.5 size-3.5 shrink-0"
          style={{ accentColor: props.accentColor }}
        />
        {fillText(texts.marketingConsent, props.values)}
      </label>
      {Object.values(errors).length > 0 ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {Object.values(errors).join(" · ")}
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button type="button" onClick={props.onCancel} className="h-9 rounded-full px-3 text-xs font-medium text-[#6b6660] hover:bg-black/[0.04]">
          {texts.cancel}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold shadow-sm disabled:opacity-60"
          style={{ background: props.accentColor, color: props.onAccent }}
        >
          {pending ? <Loader2Icon className="size-3.5 animate-spin" aria-hidden /> : null}
          {texts.contactSubmit}
        </button>
      </div>
    </form>
  );
}
