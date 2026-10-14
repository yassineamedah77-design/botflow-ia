import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import { env } from "@/server/env";
import { logger } from "@/server/observability/logger";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

export interface DatabaseHandle {
  db: Database;
  pool: Pool;
}

export function createDatabase(connectionString: string, options: Omit<PoolConfig, "connectionString"> = {}): DatabaseHandle {
  const pool = new Pool({
    connectionString,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: "sofia-app",
    ...options,
  });
  pool.on("error", (error) => {
    // An idle client lost its connection (database restart, network). The pool
    // replaces it; log so the incident is visible.
    logger.error("PostgreSQL idle client error", { err: error });
  });
  return { pool, db: drizzle(pool, { schema, casing: "snake_case" }) };
}

// One pool per server process. The global cache survives dev hot reloads,
// which would otherwise open a new pool on every edit.
const globalForDb = globalThis as unknown as { __sofiaDatabase?: DatabaseHandle };

function handle(): DatabaseHandle {
  if (!globalForDb.__sofiaDatabase) {
    const config = env();
    globalForDb.__sofiaDatabase = createDatabase(config.DATABASE_URL, { max: config.DATABASE_POOL_MAX });
  }
  return globalForDb.__sofiaDatabase;
}

export function getDb(): Database {
  return handle().db;
}

export function getPool(): Pool {
  return handle().pool;
}

/** Closes the shared pool (scripts and tests). */
export async function closeDb() {
  const current = globalForDb.__sofiaDatabase;
  globalForDb.__sofiaDatabase = undefined;
  await current?.pool.end();
}
