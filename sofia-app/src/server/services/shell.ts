import "server-only";

import type { Transaction } from "@/server/db/context";

import { getInboxCounters } from "./inbox";
import { countUnreadNotifications, listNotifications, type NotificationItem } from "./notifications";

/**
 * Live counters of the application frame: the notification bell and the
 * Inbox badge. Rendered by the app layout, then refreshed by the shell
 * through GET /api/notifications (layouts do not re-render on navigation).
 */

export const NOTIFICATION_FEED_SIZE = 12;

export interface ShellFeed {
  /** Unread notifications of the signed-in member. */
  unread: number;
  items: NotificationItem[];
  /** Conversations with unread messages. */
  inboxUnread: number;
}

export async function getShellFeed(tx: Transaction, organizationId: string, userId: string): Promise<ShellFeed> {
  const items = await listNotifications(tx, organizationId, userId, NOTIFICATION_FEED_SIZE);
  const unread = await countUnreadNotifications(tx, organizationId, userId);
  const inbox = await getInboxCounters(tx, organizationId);
  return { unread, items, inboxUnread: inbox.unread };
}
