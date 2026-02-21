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

export const memberRoleEnum = pgEnum("member_role", ["owner", "moderator", "member"]);

export const herds = pgTable(
  "herds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    avatarUrl: text("avatar_url"),
    isPrivate: boolean("is_private").default(false).notNull(),
    allowsIncognito: boolean("allows_incognito").default(false).notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberCount: integer("member_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_herds_owner").on(table.ownerId),
    index("idx_herds_member_count").on(table.memberCount),
  ]
);

export const herdMembers = pgTable(
  "herd_members",
  {
    herdId: uuid("herd_id")
      .notNull()
      .references(() => herds.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_herd_members_herd").on(table.herdId),
    index("idx_herd_members_user").on(table.userId),
  ]
);

export const herdJoinRequests = pgTable(
  "herd_join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    herdId: uuid("herd_id")
      .notNull()
      .references(() => herds.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_herd_join_requests_herd").on(table.herdId),
    index("idx_herd_join_requests_user").on(table.userId),
  ]
);

export type Herd = typeof herds.$inferSelect;
export type NewHerd = typeof herds.$inferInsert;
export type HerdMember = typeof herdMembers.$inferSelect;
