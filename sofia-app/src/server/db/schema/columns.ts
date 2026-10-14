import { timestamp, uuid } from "drizzle-orm/pg-core";

// Shared column builders. Column names come from the TypeScript keys through
// the `snake_case` casing configured on the client and in drizzle.config.ts.

export const primaryId = () => uuid().primaryKey().defaultRandom();

export const timestamptz = () => timestamp({ withTimezone: true });

export const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
