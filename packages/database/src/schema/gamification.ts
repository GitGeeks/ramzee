import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const achievements = pgTable("achievements", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  iconUrl: text("icon_url"),
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: varchar("achievement_id", { length: 50 })
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_user_achievements_user").on(table.userId),
    index("idx_user_achievements_achievement").on(table.achievementId),
  ]
);

export const pointsTransactions = pgTable(
  "points_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: varchar("reason", { length: 100 }).notNull(),
    referenceType: varchar("reference_type", { length: 50 }),
    referenceId: uuid("reference_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_points_transactions_user").on(table.userId, table.createdAt),
  ]
);

export const streaks = pgTable(
  "streaks",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    currentStreak: integer("current_streak").default(0).notNull(),
    longestStreak: integer("longest_streak").default(0).notNull(),
    lastCheckIn: timestamp("last_check_in", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type Streak = typeof streaks.$inferSelect;
