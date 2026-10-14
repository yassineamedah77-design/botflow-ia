import "server-only";

import { sql } from "drizzle-orm";

import { getDb, type Database } from "./client";

/**
 * The only two ways application code reaches tenant data.
 *
 * `withTenant` runs `fn` in a transaction where PostgreSQL Row-Level Security
 * restricts every table to one establishment. Queries issued outside these
 * helpers see no tenant rows at all, so a forgotten filter fails closed.
 *
 * `withSystem` lifts the restriction for cross-tenant work that has no
 * establishment yet or spans several: authentication, routing an incoming
 * webhook to its establishment, scheduled jobs, platform admin. Keep its
 * callers few and explicit.
 *
 * Both settings are transaction-local (`set_config(..., true)`), so they
 * never leak to another request through the connection pool.
 */

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function withTenant<T>(
  organizationId: string,
  fn: (tx: Transaction) => Promise<T>,
  db: Database = getDb(),
): Promise<T> {
  if (!UUID_PATTERN.test(organizationId)) {
    throw new Error("withTenant requires a valid organization id");
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org_id', ${organizationId}, true)`);
    return fn(tx);
  });
}

export async function withSystem<T>(fn: (tx: Transaction) => Promise<T>, db: Database = getDb()): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.bypass_rls', 'on', true)`);
    return fn(tx);
  });
}
