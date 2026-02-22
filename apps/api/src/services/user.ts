import { eq } from "drizzle-orm";
import { db } from "@ramzee/database";
import { users, userSettings } from "@ramzee/database/schema";

interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  hornStyle?: string;
  fleeceTheme?: string;
}

export class UserService {
  async getById(userId: string) {
    return db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  }

  async getByUsername(username: string) {
    return db.query.users.findFirst({
      where: eq(users.username, username.toLowerCase()),
    });
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const [updated] = await db
      .update(users)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }

  async getSettings(userId: string) {
    let settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (!settings) {
      // Create default settings
      const [newSettings] = await db
        .insert(userSettings)
        .values({ userId })
        .returning();
      settings = newSettings;
    }

    return settings;
  }

  async updateSettings(userId: string, input: Partial<typeof userSettings.$inferInsert>) {
    const [updated] = await db
      .update(userSettings)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId))
      .returning();

    return updated;
  }

  async updateLastActive(userId: string) {
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export const userService = new UserService();
