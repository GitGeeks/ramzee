import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uriEmail: varchar("uri_email", { length: 255 }).notNull().unique(),
    username: varchar("username", { length: 30 }).notNull().unique(),
    displayName: varchar("display_name", { length: 50 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    avatarUrl: text("avatar_url"),
    bio: varchar("bio", { length: 160 }),
    hornStyle: varchar("horn_style", { length: 50 }).default("classic").notNull(),
    fleeceTheme: varchar("fleece_theme", { length: 50 }).default("keaney_blue").notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    isShepherd: boolean("is_shepherd").default(false).notNull(),
    isEmailVerified: boolean("is_email_verified").default(false).notNull(),
    rhodyPoints: integer("rhody_points").default(0).notNull(),
    streakDays: integer("streak_days").default(0).notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_users_username").on(table.username),
    index("idx_users_uri_email").on(table.uriEmail),
    index("idx_users_last_active").on(table.lastActiveAt),
  ]
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_refresh_tokens_user").on(table.userId),
    index("idx_refresh_tokens_hash").on(table.tokenHash),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
