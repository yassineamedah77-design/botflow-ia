import "server-only";

import { and, count, desc, eq, inArray, isNull, ne } from "drizzle-orm";

import type { Transaction } from "@/server/db/context";
import { memberships, notifications, type notificationType } from "@/server/db/schema";

/**
 * Team notifications (specification §25). Written in the caller's transaction
 * so a notification exists if and only if the event it reports was committed.
 * The in-app channel is live; the `emailed_at` column prepares the email
 * channel, which plugs in here without changing the callers.
 */

export type NotificationType = (typeof notificationType.enumValues)[number];

export interface NotificationInput {
  organizationId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
  entityType?: string;
  entityId?: string;
  /** Who receives it: the whole team, owners and admins, or specific members. */
  recipients: "team" | "managers" | string[];
  /** Usually the person who triggered the event: no need to notify them. */
  excludeUserId?: string;
}

export async function notify(tx: Transaction, input: NotificationInput): Promise<number> {
  const conditions = [eq(memberships.organizationId, input.organizationId)];
  if (input.recipients === "managers") conditions.push(inArray(memberships.role, ["OWNER", "ADMIN"]));
  if (Array.isArray(input.recipients)) {
    if (input.recipients.length === 0) return 0;
    conditions.push(inArray(memberships.userId, input.recipients));
  }
  if (input.excludeUserId) conditions.push(ne(memberships.userId, input.excludeUserId));
  // Only current members of this establishment, whatever ids the caller passed.
  const members = await tx.select({ userId: memberships.userId }).from(memberships).where(and(...conditions));
  if (members.length === 0) return 0;

  await tx.insert(notifications).values(
    members.map((member) => ({
      organizationId: input.organizationId,
      userId: member.userId,
      type: input.type,
      title: input.title.slice(0, 200),
      body: input.body?.slice(0, 500),
      linkUrl: input.linkUrl,
      entityType: input.entityType,
      entityId: input.entityId,
    })),
  );
  return members.length;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export async function listNotifications(tx: Transaction, organizationId: string, userId: string, limit = 20): Promise<NotificationItem[]> {
  return tx
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      linkUrl: notifications.linkUrl,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(and(eq(notifications.organizationId, organizationId), eq(notifications.userId, userId)))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(tx: Transaction, organizationId: string, userId: string) {
  const [row] = await tx
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.organizationId, organizationId), eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.value ?? 0;
}

/** Marks the user's own notifications as read: all of them, or the given ids. */
export async function markNotificationsRead(tx: Transaction, organizationId: string, userId: string, ids?: string[]) {
  const conditions = [eq(notifications.organizationId, organizationId), eq(notifications.userId, userId), isNull(notifications.readAt)];
  if (ids) {
    if (ids.length === 0) return 0;
    conditions.push(inArray(notifications.id, ids));
  }
  const updated = await tx
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(...conditions))
    .returning({ id: notifications.id });
  return updated.length;
}
