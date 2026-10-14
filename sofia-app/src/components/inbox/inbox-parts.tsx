import { BotIcon, CalendarPlusIcon, ExternalLinkIcon, RepeatIcon, SearchIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import type * as React from "react";

import { LeadAssigneeSelect, LeadNotes } from "@/components/leads/lead-actions";
import { ChannelIcon, LeadAvatar, LeadStatusBadge } from "@/components/leads/lead-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CHANNELS, CHANNEL_LABELS, LEAD_SOURCE_LABELS } from "@/lib/crm";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { INBOX_VIEWS, INBOX_VIEW_LABELS, inboxQuery, type InboxFilters } from "@/lib/inbox-filters";
import type { ConversationThread, InboxItem } from "@/server/services/inbox";

// ─── Conversation list ─────────────────────────────────────────────────────

export function ConversationList({
  items,
  hasMore,
  filters,
  counters,
  now,
}: {
  items: InboxItem[];
  hasMore: boolean;
  filters: InboxFilters;
  counters: { unread: number; human: number };
  now: Date;
}) {
  const badge = (view: (typeof INBOX_VIEWS)[number]) => (view === "unread" ? counters.unread : view === "human" ? counters.human : 0);
  const last = items[items.length - 1];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid gap-3 border-b border-border px-4 pt-5 pb-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold">Inbox</h1>
          {counters.unread > 0 ? <span className="text-xs text-muted-foreground tabular">{counters.unread} non lue{counters.unread > 1 ? "s" : ""}</span> : null}
        </div>
        <form action="/inbox" className="relative">
          {filters.view !== "all" ? <input type="hidden" name="view" value={filters.view} /> : null}
          {filters.channel ? <input type="hidden" name="channel" value={filters.channel} /> : null}
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" name="q" defaultValue={filters.q} placeholder="Rechercher" aria-label="Rechercher une conversation" className="h-9 pl-9" />
        </form>
        <nav aria-label="Filtres" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
          {INBOX_VIEWS.map((view) => (
            <Link
              key={view}
              href={inboxQuery({ ...filters, conversation: null, before: null }, { view })}
              aria-current={filters.view === view ? "page" : undefined}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                filters.view === view && "border-primary bg-primary text-primary-foreground hover:text-primary-foreground",
                view === "human" && badge(view) > 0 && filters.view !== view && "border-destructive/30 text-destructive",
              )}
            >
              {INBOX_VIEW_LABELS[view]}
              {badge(view) > 0 ? <span className="tabular">{badge(view)}</span> : null}
            </Link>
          ))}
        </nav>
        <nav aria-label="Canaux" className="-mx-4 flex gap-1 overflow-x-auto px-4">
          {[null, ...CHANNELS].map((channel) => (
            <Link
              key={channel ?? "all"}
              href={inboxQuery({ ...filters, conversation: null, before: null }, { channel })}
              aria-current={filters.channel === channel ? "page" : undefined}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground",
                filters.channel === channel && "bg-muted font-medium text-foreground",
              )}
            >
              {channel ? <ChannelIcon channel={channel} /> : null}
              {channel ? CHANNEL_LABELS[channel] : "Tous"}
            </Link>
          ))}
        </nav>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Conversations">
        {items.length === 0 ? (
          <li className="px-6 py-12 text-center text-sm text-muted-foreground">Aucune conversation dans ce filtre.</li>
        ) : null}
        {items.map((item) => {
          const selected = item.id === filters.conversation;
          return (
            <li key={item.id}>
              <Link
                href={inboxQuery(filters, { conversation: item.id })}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex gap-3 border-b border-border/70 px-4 py-3 transition-colors hover:bg-muted/50",
                  selected && "bg-sofia-soft/60 hover:bg-sofia-soft/60",
                )}
              >
                <span className="relative">
                  <LeadAvatar name={item.name} seed={item.leadId} />
                  <span className="absolute -right-1 -bottom-1 rounded-full bg-card p-0.5">
                    <ChannelIcon channel={item.channel} className="[&_svg]:size-3.5" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-sm", item.unreadCount > 0 ? "font-semibold" : "font-medium")}>{item.name}</span>
                    <span className="shrink-0 text-[0.6875rem] text-muted-foreground">
                      {item.lastMessageAt ? formatRelativeTime(item.lastMessageAt, now) : ""}
                    </span>
                  </span>
                  <span className={cn("mt-0.5 line-clamp-2 text-xs leading-relaxed", item.unreadCount > 0 ? "text-foreground" : "text-muted-foreground")}>
                    {item.lastAuthor === "AI" ? "SOFIA : " : item.lastAuthor === "USER" ? "Équipe : " : null}
                    {item.preview}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {item.humanRequested ? <Badge variant="destructive">Humain requis</Badge> : null}
                    {item.handlingMode === "HUMAN_ACTIVE" ? (
                      <Badge variant="outline">
                        <UserRoundIcon aria-hidden />
                        Équipe
                      </Badge>
                    ) : null}
                    {item.leadStatus === "HOT" || item.leadStatus === "BOOKING_PENDING" || item.leadStatus === "NO_SHOW" ? (
                      <LeadStatusBadge status={item.leadStatus} />
                    ) : null}
                    {item.unreadCount > 0 ? (
                      <span className="ml-auto inline-flex size-5 items-center justify-center rounded-full bg-sofia text-[0.625rem] font-semibold text-white tabular">
                        {item.unreadCount}
                        <span className="sr-only"> non lu{item.unreadCount > 1 ? "s" : ""}</span>
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {hasMore && last?.lastMessageAt ? (
          <li className="p-3">
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href={inboxQuery(filters, { before: last.lastMessageAt, conversation: null })}>Conversations plus anciennes</Link>
            </Button>
          </li>
        ) : null}
        {filters.before ? (
          <li className="p-3 pt-0">
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href={inboxQuery(filters, { before: null, conversation: null })}>Revenir aux plus récentes</Link>
            </Button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

// ─── Messages ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = { PENDING: "En attente", SENT: "Envoyé", DELIVERED: "Distribué", READ: "Lu", FAILED: "Échec de l'envoi" };

function dayLabel(date: Date, now: Date, timeZone: string) {
  const day = (value: Date) => new Intl.DateTimeFormat("fr-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
  if (day(date) === day(now)) return "Aujourd'hui";
  if (day(date) === day(new Date(now.getTime() - 86_400_000))) return "Hier";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone }).format(date);
}

export function MessageList({ thread, now, timeZone }: { thread: ConversationThread; now: Date; timeZone: string }) {
  const time = (date: Date) => new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone }).format(date);
  const days = thread.messages.map((message) => dayLabel(message.createdAt, now, timeZone));
  return (
    <ol className="mx-auto grid max-w-3xl gap-2 px-4 py-6 sm:px-6">
      {thread.messages.map((message, index) => {
        const separator = index === 0 || days[index] !== days[index - 1] ? days[index] : null;
        const outbound = message.direction === "OUTBOUND";
        return (
          <li key={message.id} className="grid gap-2">
            {separator ? (
              <div className="my-3 text-center text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase first-letter:uppercase">{separator}</div>
            ) : null}
            {message.authorType === "SYSTEM" ? (
              <p className="mx-auto max-w-md rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">{message.body}</p>
            ) : (
              <div className={cn("flex flex-col gap-1", outbound ? "items-end" : "items-start")}>
                {outbound ? (
                  <span className="flex items-center gap-1 px-1 text-[0.6875rem] text-muted-foreground">
                    {message.authorType === "AI" ? (
                      <>
                        <BotIcon className="size-3" aria-hidden />
                        SOFIA
                      </>
                    ) : (
                      (message.authorName ?? "Équipe")
                    )}
                    {message.contentType === "TEMPLATE" ? " · modèle WhatsApp" : null}
                  </span>
                ) : null}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line sm:max-w-[70%]",
                    !outbound && "rounded-bl-md border border-border bg-card",
                    outbound && message.authorType === "AI" && "rounded-br-md bg-sofia-soft text-foreground",
                    outbound && message.authorType === "USER" && "rounded-br-md bg-primary text-primary-foreground",
                    message.status === "FAILED" && "ring-1 ring-destructive",
                  )}
                >
                  {message.body}
                </div>
                <span className={cn("px-1 text-[0.6875rem] text-muted-foreground", message.status === "FAILED" && "font-medium text-destructive")}>
                  {time(message.createdAt)}
                  {outbound ? ` · ${STATUS_LABELS[message.status] ?? ""}` : null}
                  {message.status === "FAILED" && message.error ? ` : ${message.error}` : null}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Contact panel (specification §18) ─────────────────────────────────────

export function ContactPanel({
  thread,
  now,
  timeZone,
  currency,
  canWrite,
  members,
  currentUserId,
  canDeleteNotes,
}: {
  thread: ConversationThread;
  now: Date;
  timeZone: string;
  currency: string;
  canWrite: boolean;
  members: Array<{ id: string; name: string }>;
  currentUserId: string;
  canDeleteNotes: boolean;
}) {
  const { lead } = thread;
  const rows: Array<[string, React.ReactNode]> = [
    ["Prestation", thread.serviceName ?? "—"],
    ["Valeur potentielle", lead.potentialValueCents !== null ? formatCurrency(lead.potentialValueCents, currency) : "—"],
    ["Source", LEAD_SOURCE_LABELS[lead.source]],
    ["Dernier contact", lead.lastInteractionAt ? formatRelativeTime(lead.lastInteractionAt, now) : "—"],
    [
      "RDV",
      thread.nextAppointment
        ? `${thread.nextAppointment.serviceName ?? "Rendez-vous"}, ${new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone }).format(thread.nextAppointment.startsAt)}`
        : "Aucun",
    ],
  ];
  return (
    <div className="grid gap-6 p-5">
      <div className="flex items-center gap-3">
        <LeadAvatar name={lead.name} seed={lead.id} className="size-12 text-sm" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{lead.name}</p>
          <div className="mt-1">
            <LeadStatusBadge status={lead.status} />
          </div>
        </div>
      </div>

      <dl className="grid gap-2.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Actions</p>
        <div className="grid grid-cols-2 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="rounded-lg">
                <Button variant="outline" size="sm" className="w-full" disabled>
                  <CalendarPlusIcon aria-hidden />
                  Créer RDV
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>L&apos;agenda et la prise de rendez-vous arrivent en phase 7.</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="rounded-lg">
                <Button variant="outline" size="sm" className="w-full" disabled>
                  <RepeatIcon aria-hidden />
                  Relancer
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Les relances automatiques arrivent en phase 8. Vous pouvez déjà prendre la conversation et répondre.</TooltipContent>
          </Tooltip>
        </div>
        {canWrite ? <LeadAssigneeSelect leadId={lead.id} assigneeId={lead.assignedToUserId} members={members} /> : null}
        <Button variant="ghost" size="sm" asChild className="justify-start">
          <Link href={`/leads/${lead.id}`}>
            <ExternalLinkIcon aria-hidden />
            Ouvrir la fiche complète
          </Link>
        </Button>
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Notes</p>
        <LeadNotes
          leadId={lead.id}
          now={now}
          canWrite={canWrite}
          notes={thread.notes.map((note) => ({
            id: note.id,
            body: note.body,
            createdAt: note.createdAt,
            authorName: note.authorName,
            canDelete: canWrite && (note.authorUserId === currentUserId || canDeleteNotes),
          }))}
        />
      </div>
    </div>
  );
}
