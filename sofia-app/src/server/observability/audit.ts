import "server-only";

import type { Transaction } from "@/server/db/context";
import { auditLogs, eventLogs, type actorType, type eventType, type logLevel } from "@/server/db/schema";
import { withSystem } from "@/server/db/context";

import { logger, redact } from "./logger";

type ActorType = (typeof actorType.enumValues)[number];
type EventType = (typeof eventType.enumValues)[number];
type LogLevel = (typeof logLevel.enumValues)[number];

export interface AuditEntry {
  organizationId?: string | null;
  actorType: ActorType;
  actorUserId?: string | null;
  /** Dotted action name: `auth.login`, `member.invited`, `lead.exported`… */
  action: string;
  entityType?: string;
  entityId?: string;
  /** Context for investigations. Never secrets, passwords or message contents. */
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Writes an audit entry inside the caller's transaction, so the trace exists
 * if and only if the action was committed.
 */
export async function recordAudit(tx: Transaction, entry: AuditEntry) {
  const metadata = (redact(entry.metadata ?? {}) ?? {}) as Record<string, unknown>;
  await tx.insert(auditLogs).values({
    organizationId: entry.organizationId ?? null,
    actorType: entry.actorType,
    actorUserId: entry.actorUserId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata,
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent?.slice(0, 512) ?? null,
  });
  logger.info("audit", {
    action: entry.action,
    organizationId: entry.organizationId ?? undefined,
    actorUserId: entry.actorUserId ?? undefined,
    entityType: entry.entityType,
    entityId: entry.entityId,
  });
}

export interface EventEntry {
  organizationId?: string | null;
  type: EventType;
  level?: LogLevel;
  message: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
  durationMs?: number;
  details?: Record<string, unknown>;
}

function toEventRow(entry: EventEntry) {
  return {
    organizationId: entry.organizationId ?? null,
    type: entry.type,
    level: entry.level ?? "INFO",
    message: entry.message,
    entityType: entry.entityType,
    entityId: entry.entityId,
    correlationId: entry.correlationId,
    durationMs: entry.durationMs,
    details: (redact(entry.details ?? {}) ?? {}) as Record<string, unknown>,
  };
}

/** Records an operational event inside the caller's transaction. */
export async function recordEvent(tx: Transaction, entry: EventEntry) {
  await tx.insert(eventLogs).values(toEventRow(entry));
}

/**
 * Records an operational event in its own transaction. Used when the event
 * must survive a failed business transaction (an email that could not be
 * sent, an integration error). Never throws: a logging failure is itself
 * logged to stdout instead of breaking the caller.
 */
export async function recordEventDetached(entry: EventEntry) {
  const write = entry.level === "ERROR" ? logger.error : entry.level === "WARN" ? logger.warn : logger.info;
  write(entry.message, { eventType: entry.type, organizationId: entry.organizationId ?? undefined, ...entry.details });
  try {
    await withSystem((tx) => tx.insert(eventLogs).values(toEventRow(entry)));
  } catch (error) {
    logger.error("Failed to persist event log", { err: error, eventType: entry.type });
  }
}
