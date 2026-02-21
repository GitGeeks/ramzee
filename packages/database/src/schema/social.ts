import {
  pgTable,
  uuid,
  timestamp,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const grazes = pgTable(
  "grazes",
  {
    grazerId: uuid("grazer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    grazeeId: uuid("grazee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.grazerId, table.grazeeId] }),
    index("idx_grazes_grazee").on(table.grazeeId),
    index("idx_grazes_grazer").on(table.grazerId),
  ]
);

export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    index("idx_blocks_blocked").on(table.blockedId),
  ]
);

export const mutes = pgTable(
  "mutes",
  {
    muterId: uuid("muter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mutedId: uuid("muted_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.muterId, table.mutedId] }),
    index("idx_mutes_muted").on(table.mutedId),
  ]
);

export type Graze = typeof grazes.$inferSelect;
export type NewGraze = typeof grazes.$inferInsert;
export type Block = typeof blocks.$inferSelect;
export type Mute = typeof mutes.$inferSelect;
