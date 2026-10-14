"use client";

import { cn } from "cn";
import {
  BellIcon,
  CalendarCheckIcon,
  CalendarXIcon,
  CheckCheckIcon,
  FileCheck2Icon,
  FlameIcon,
  HandIcon,
  InfoIcon,
  SendIcon,
  TriangleAlertIcon,
  UserCheckIcon,
  UserPlusIcon,
  UserXIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatRelativeTime } from "@/lib/format";
import type { NotificationItem, NotificationType } from "@/server/services/notifications";
import type { ShellFeed } from "@/server/services/shell";

const TYPE_META: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  NEW_LEAD: { icon: UserPlusIcon, tone: "bg-info-soft text-info" },
  HOT_LEAD: { icon: FlameIcon, tone: "bg-sofia-soft text-sofia-strong" },
  HUMAN_REQUESTED: { icon: HandIcon, tone: "bg-warning-soft text-warning" },
  NEW_APPOINTMENT: { icon: CalendarCheckIcon, tone: "bg-success-soft text-success" },
  APPOINTMENT_CANCELLED: { icon: CalendarXIcon, tone: "bg-danger-soft text-destructive" },
  NO_SHOW: { icon: UserXIcon, tone: "bg-danger-soft text-destructive" },
  INTEGRATION_ERROR: { icon: TriangleAlertIcon, tone: "bg-danger-soft text-destructive" },
  CAMPAIGN_COMPLETED: { icon: SendIcon, tone: "bg-sofia-soft text-sofia-strong" },
  LEAD_ASSIGNED: { icon: UserCheckIcon, tone: "bg-info-soft text-info" },
  IMPORT_COMPLETED: { icon: FileCheck2Icon, tone: "bg-success-soft text-success" },
  SYSTEM: { icon: InfoIcon, tone: "bg-muted text-muted-foreground" },
};

const POLL_INTERVAL_MS = 60_000;

/** Only links inside the application: a notification never sends anyone elsewhere. */
function internalLink(url: string | null) {
  return url && url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\") ? url : null;
}

function parseFeed(value: unknown): ShellFeed | null {
  if (!value || typeof value !== "object") return null;
  const feed = value as Record<string, unknown>;
  if (typeof feed.unread !== "number" || typeof feed.inboxUnread !== "number" || !Array.isArray(feed.items)) return null;
  const items = (feed.items as Array<Record<string, unknown>>).map((item) => ({
    ...(item as unknown as NotificationItem),
    readAt: typeof item.readAt === "string" ? new Date(item.readAt) : null,
    createdAt: new Date(String(item.createdAt)),
  }));
  return { unread: feed.unread, inboxUnread: feed.inboxUnread, items };
}

/**
 * The shell's live counters. Starts from the layout's server render, then
 * polls every minute while the tab is visible (layouts do not re-render on
 * navigation). Reading is applied locally at once and saved in the background.
 */
export function useShellFeed(initial: ShellFeed, markRead: (ids?: string[]) => Promise<void>) {
  const [feed, setFeed] = useState(initial);
  const [source, setSource] = useState(initial);
  if (source !== initial) {
    // The layout rendered again (refresh, revalidation): its data is the freshest.
    setSource(initial);
    setFeed(initial);
  }

  // A poll started before a local change would bring back what was just marked as read.
  const version = useRef(0);

  const refresh = useCallback(async () => {
    const started = version.current;
    try {
      const response = await fetch("/api/notifications", { cache: "no-store", headers: { accept: "application/json" } });
      if (!response.ok) return;
      const next = parseFeed(await response.json());
      if (next && version.current === started) setFeed(next);
    } catch {
      // Offline or server unavailable: keep the last known counters.
    }
  }, []);

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [refresh]);

  const read = useCallback(
    (ids?: string[]) => {
      version.current += 1;
      const readAt = new Date();
      const targets = ids ? new Set(ids) : null;
      setFeed((current) => {
        let cleared = 0;
        const items = current.items.map((item) => {
          if (item.readAt || (targets && !targets.has(item.id))) return item;
          cleared += 1;
          return { ...item, readAt };
        });
        return { ...current, items, unread: targets ? Math.max(0, current.unread - cleared) : 0 };
      });
      void markRead(ids);
    },
    [markRead],
  );

  return { feed, refresh, read };
}

export function NotificationBell({
  feed,
  onOpen,
  onRead,
  align = "start",
  className,
}: {
  feed: ShellFeed;
  onOpen: () => void;
  onRead: (ids?: string[]) => void;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<Date | null>(null);
  const label = feed.unread > 0 ? `Notifications : ${feed.unread} non lue${feed.unread > 1 ? "s" : ""}` : "Notifications";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setOpenedAt(new Date());
          onOpen();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)} aria-label={label}>
          <BellIcon className="size-[1.125rem]" aria-hidden />
          {feed.unread > 0 ? (
            <span
              aria-hidden
              className="absolute top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-sofia px-1 text-[0.625rem] leading-none font-semibold text-sofia-foreground tabular-nums ring-2 ring-background"
            >
              {feed.unread > 9 ? "9+" : feed.unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} collisionPadding={12} className="w-[min(23rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {feed.unread > 0 ? `${feed.unread} non lue${feed.unread > 1 ? "s" : ""}` : "Vous êtes à jour"}
            </p>
          </div>
          {feed.unread > 0 ? (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onRead()}>
              <CheckCheckIcon aria-hidden />
              Tout marquer comme lu
            </Button>
          ) : null}
        </div>
        {feed.items.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <BellIcon className="size-5" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">Aucune notification</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Les leads chauds, les demandes d&apos;intervention humaine, les leads qui vous sont assignés et les imports terminés apparaîtront ici.
            </p>
          </div>
        ) : (
          <ul className="max-h-[min(28rem,70dvh)] divide-y divide-border overflow-y-auto">
            {feed.items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                now={openedAt ?? item.createdAt}
                onSelect={() => {
                  if (!item.readAt) onRead([item.id]);
                  setOpen(false);
                }}
              />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({ item, now, onSelect }: { item: NotificationItem; now: Date; onSelect: () => void }) {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  const href = internalLink(item.linkUrl);
  const unread = !item.readAt;
  const className = cn(
    "flex w-full gap-3 px-4 py-3 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60",
    unread && "bg-sofia-soft/35",
  );
  const content = (
    <>
      <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", meta.tone)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className={cn("flex-1 text-[0.8125rem] leading-snug text-foreground", unread ? "font-semibold" : "font-medium")}>{item.title}</span>
          {unread ? (
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-sofia">
              <span className="sr-only">Non lue</span>
            </span>
          ) : null}
        </span>
        {item.body ? <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">{item.body}</span> : null}
        <span className="mt-1 block text-[0.6875rem] text-muted-foreground">{formatRelativeTime(item.createdAt, now)}</span>
      </span>
    </>
  );

  return (
    <li>
      {href ? (
        <Link href={href} className={className} onClick={onSelect}>
          {content}
        </Link>
      ) : (
        <button type="button" className={className} onClick={onSelect}>
          {content}
        </button>
      )}
    </li>
  );
}
