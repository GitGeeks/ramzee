import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const bleatTypeEnum = pgEnum("bleat_type", ["text", "photo", "poll", "event"]);

export const bleats = pgTable(
  "bleats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: varchar("content", { length: 280 }).notNull(),
    bleatType: bleatTypeEnum("bleat_type").default("text").notNull(),
    mediaUrls: text("media_urls").array(),
    locationId: uuid("location_id"),
    parentBleatId: uuid("parent_bleat_id"),
    rebaaOfId: uuid("rebaa_of_id"),
    isIncognito: boolean("is_incognito").default(false).notNull(),
    herdId: uuid("herd_id"),
    huffCount: integer("huff_count").default(0).notNull(),
    rebaaCount: integer("rebaa_count").default(0).notNull(),
    replyCount: integer("reply_count").default(0).notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_bleats_author").on(table.authorId, table.createdAt),
    index("idx_bleats_parent").on(table.parentBleatId),
    index("idx_bleats_herd").on(table.herdId, table.createdAt),
    index("idx_bleats_trending").on(table.huffCount, table.createdAt),
    index("idx_bleats_created").on(table.createdAt),
  ]
);

export const huffs = pgTable(
  "huffs",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bleatId: uuid("bleat_id")
      .notNull()
      .references(() => bleats.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_huffs_bleat").on(table.bleatId),
    index("idx_huffs_user").on(table.userId),
  ]
);

export const ramTags = pgTable(
  "ram_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tag: varchar("tag", { length: 100 }).notNull().unique(),
    useCount: integer("use_count").default(0).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_ram_tags_use_count").on(table.useCount),
    index("idx_ram_tags_last_used").on(table.lastUsedAt),
  ]
);

export const bleatRamTags = pgTable(
  "bleat_ram_tags",
  {
    bleatId: uuid("bleat_id")
      .notNull()
      .references(() => bleats.id, { onDelete: "cascade" }),
    ramTagId: uuid("ram_tag_id")
      .notNull()
      .references(() => ramTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("idx_bleat_ram_tags_bleat").on(table.bleatId),
    index("idx_bleat_ram_tags_tag").on(table.ramTagId),
  ]
);

export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Bleat = typeof bleats.$inferSelect;
export type NewBleat = typeof bleats.$inferInsert;
export type Huff = typeof huffs.$inferSelect;
export type NewHuff = typeof huffs.$inferInsert;
export type RamTag = typeof ramTags.$inferSelect;
export type Location = typeof locations.$inferSelect;
