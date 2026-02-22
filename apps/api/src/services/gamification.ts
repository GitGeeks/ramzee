import { eq, and, sql, desc, gte } from "drizzle-orm";
import { db } from "@ramzee/database";
import { users, badges, userBadges, bleats, herdMembers, follows } from "@ramzee/database/schema";
import { notificationService } from "./notification.js";

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: "engagement" | "social" | "content" | "special";
  requirement: {
    type: string;
    threshold: number;
  };
}

// Badge definitions
const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Engagement badges
  {
    id: "first-bleat",
    name: "First Bleat",
    description: "Posted your first bleat",
    iconUrl: "/badges/first-bleat.png",
    category: "engagement",
    requirement: { type: "bleat_count", threshold: 1 },
  },
  {
    id: "prolific-bleater",
    name: "Prolific Bleater",
    description: "Posted 100 bleats",
    iconUrl: "/badges/prolific-bleater.png",
    category: "engagement",
    requirement: { type: "bleat_count", threshold: 100 },
  },
  {
    id: "bleat-master",
    name: "Bleat Master",
    description: "Posted 1000 bleats",
    iconUrl: "/badges/bleat-master.png",
    category: "engagement",
    requirement: { type: "bleat_count", threshold: 1000 },
  },
  // Social badges
  {
    id: "first-graze",
    name: "First Graze",
    description: "Followed your first user",
    iconUrl: "/badges/first-graze.png",
    category: "social",
    requirement: { type: "grazing_count", threshold: 1 },
  },
  {
    id: "social-butterfly",
    name: "Social Butterfly",
    description: "Followed 50 users",
    iconUrl: "/badges/social-butterfly.png",
    category: "social",
    requirement: { type: "grazing_count", threshold: 50 },
  },
  {
    id: "popular-ram",
    name: "Popular Ram",
    description: "Gained 100 grazers",
    iconUrl: "/badges/popular-ram.png",
    category: "social",
    requirement: { type: "grazer_count", threshold: 100 },
  },
  {
    id: "influencer",
    name: "Influencer",
    description: "Gained 1000 grazers",
    iconUrl: "/badges/influencer.png",
    category: "social",
    requirement: { type: "grazer_count", threshold: 1000 },
  },
  // Content badges
  {
    id: "viral-bleat",
    name: "Viral Bleat",
    description: "Got 100 huffs on a single bleat",
    iconUrl: "/badges/viral-bleat.png",
    category: "content",
    requirement: { type: "max_huff_count", threshold: 100 },
  },
  {
    id: "conversation-starter",
    name: "Conversation Starter",
    description: "Got 50 replies on a single bleat",
    iconUrl: "/badges/conversation-starter.png",
    category: "content",
    requirement: { type: "max_reply_count", threshold: 50 },
  },
  // Special badges
  {
    id: "herd-leader",
    name: "Herd Leader",
    description: "Created a herd with 100+ members",
    iconUrl: "/badges/herd-leader.png",
    category: "special",
    requirement: { type: "herd_member_count", threshold: 100 },
  },
  {
    id: "week-streak",
    name: "Week Warrior",
    description: "Maintained a 7-day activity streak",
    iconUrl: "/badges/week-streak.png",
    category: "special",
    requirement: { type: "streak_days", threshold: 7 },
  },
  {
    id: "month-streak",
    name: "Monthly Master",
    description: "Maintained a 30-day activity streak",
    iconUrl: "/badges/month-streak.png",
    category: "special",
    requirement: { type: "streak_days", threshold: 30 },
  },
];

export class GamificationService {
  // Initialize badges in database (call on startup)
  async initializeBadges(): Promise<void> {
    for (const badge of BADGE_DEFINITIONS) {
      const existing = await db.query.badges.findFirst({
        where: eq(badges.id, badge.id),
      });

      if (!existing) {
        await db.insert(badges).values({
          id: badge.id,
          name: badge.name,
          description: badge.description,
          iconUrl: badge.iconUrl,
          category: badge.category,
        });
      }
    }
  }

  // Check and award badges for a user
  async checkAndAwardBadges(userId: string): Promise<string[]> {
    const awardedBadges: string[] = [];

    // Get user stats
    const stats = await this.getUserStats(userId);

    // Check existing badges
    const existingBadges = await db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(eq(userBadges.userId, userId));

    const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

    // Check each badge
    for (const badge of BADGE_DEFINITIONS) {
      if (existingBadgeIds.has(badge.id)) continue;

      const { type, threshold } = badge.requirement;
      let earned = false;

      switch (type) {
        case "bleat_count":
          earned = stats.bleatCount >= threshold;
          break;
        case "grazing_count":
          earned = stats.grazingCount >= threshold;
          break;
        case "grazer_count":
          earned = stats.grazerCount >= threshold;
          break;
        case "max_huff_count":
          earned = stats.maxHuffCount >= threshold;
          break;
        case "max_reply_count":
          earned = stats.maxReplyCount >= threshold;
          break;
        case "herd_member_count":
          earned = stats.maxHerdMemberCount >= threshold;
          break;
        case "streak_days":
          earned = stats.currentStreak >= threshold;
          break;
      }

      if (earned) {
        await this.awardBadge(userId, badge.id);
        awardedBadges.push(badge.id);
      }
    }

    return awardedBadges;
  }

  // Award a badge to user
  async awardBadge(userId: string, badgeId: string): Promise<void> {
    // Check if already awarded
    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)),
    });

    if (existing) return;

    await db.insert(userBadges).values({
      userId,
      badgeId,
    });

    // Send notification
    await notificationService.create({
      userId,
      type: "badge",
      content: `You earned a new badge!`,
      relatedId: badgeId,
    });
  }

  // Get user stats for badge checking
  async getUserStats(userId: string): Promise<{
    bleatCount: number;
    grazingCount: number;
    grazerCount: number;
    maxHuffCount: number;
    maxReplyCount: number;
    maxHerdMemberCount: number;
    currentStreak: number;
  }> {
    // Get bleat count
    const [{ bleatCount }] = await db
      .select({ bleatCount: sql<number>`count(*)` })
      .from(bleats)
      .where(and(eq(bleats.authorId, userId), eq(bleats.isDeleted, false)));

    // Get grazing count (following)
    const [{ grazingCount }] = await db
      .select({ grazingCount: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followerId, userId));

    // Get grazer count (followers)
    const [{ grazerCount }] = await db
      .select({ grazerCount: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followingId, userId));

    // Get max huff count on a single bleat
    const maxHuffBleat = await db
      .select({ huffCount: bleats.huffCount })
      .from(bleats)
      .where(and(eq(bleats.authorId, userId), eq(bleats.isDeleted, false)))
      .orderBy(desc(bleats.huffCount))
      .limit(1);

    const maxHuffCount = maxHuffBleat[0]?.huffCount || 0;

    // Get max reply count on a single bleat
    const maxReplyBleat = await db
      .select({ replyCount: bleats.replyCount })
      .from(bleats)
      .where(and(eq(bleats.authorId, userId), eq(bleats.isDeleted, false)))
      .orderBy(desc(bleats.replyCount))
      .limit(1);

    const maxReplyCount = maxReplyBleat[0]?.replyCount || 0;

    // Get max herd member count for herds user owns
    const maxHerdResult = await db
      .select({ memberCount: sql<number>`count(*)` })
      .from(herdMembers)
      .innerJoin(
        sql`(SELECT id FROM herds WHERE owner_id = ${userId})`,
        sql`herds.id = ${herdMembers.herdId}`
      )
      .groupBy(herdMembers.herdId)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    const maxHerdMemberCount = maxHerdResult[0]?.memberCount || 0;

    // Get current streak
    const currentStreak = await this.calculateStreak(userId);

    return {
      bleatCount: Number(bleatCount),
      grazingCount: Number(grazingCount),
      grazerCount: Number(grazerCount),
      maxHuffCount,
      maxReplyCount,
      maxHerdMemberCount: Number(maxHerdMemberCount),
      currentStreak,
    };
  }

  // Calculate activity streak
  async calculateStreak(userId: string): Promise<number> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) return 0;

    const lastActive = user.lastActiveAt;
    const now = new Date();

    // Check if user was active today or yesterday
    const daysSinceActive = lastActive
      ? Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceActive > 1) {
      // Streak broken
      return 0;
    }

    // Return stored streak (would need a streak column in users table)
    // For now, calculate from bleats
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(bleats)
        .where(
          and(
            eq(bleats.authorId, userId),
            gte(bleats.createdAt, dayStart),
            sql`${bleats.createdAt} < ${dayEnd}`
          )
        );

      if (Number(count) > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  // Update user activity (call on any user action)
  async recordActivity(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Get user's badges
  async getUserBadges(userId: string): Promise<
    {
      badge: typeof badges.$inferSelect;
      earnedAt: Date;
    }[]
  > {
    const results = await db
      .select({
        badge: badges,
        earnedAt: userBadges.earnedAt,
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt));

    return results;
  }

  // Get all available badges
  async getAllBadges(): Promise<typeof badges.$inferSelect[]> {
    return db.select().from(badges).orderBy(badges.category);
  }

  // Get leaderboard
  async getLeaderboard(
    type: "huffs" | "grazers" | "bleats" = "grazers",
    limit = 10
  ): Promise<
    {
      user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      };
      value: number;
    }[]
  > {
    let orderColumn;

    switch (type) {
      case "huffs":
        orderColumn = sql`(SELECT COALESCE(SUM(huff_count), 0) FROM bleats WHERE author_id = ${users.id})`;
        break;
      case "bleats":
        orderColumn = sql`(SELECT COUNT(*) FROM bleats WHERE author_id = ${users.id})`;
        break;
      case "grazers":
      default:
        orderColumn = users.grazerCount;
    }

    const results = await db
      .select({
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
        value: orderColumn,
      })
      .from(users)
      .where(eq(users.isVerified, true)) // Only verified users on leaderboard
      .orderBy(desc(orderColumn))
      .limit(limit);

    return results.map((r) => ({
      user: r.user,
      value: Number(r.value),
    }));
  }

  // Get badge progress for a user
  async getBadgeProgress(userId: string): Promise<
    {
      badge: BadgeDefinition;
      progress: number;
      earned: boolean;
    }[]
  > {
    const stats = await this.getUserStats(userId);
    const earnedBadges = await db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(eq(userBadges.userId, userId));

    const earnedBadgeIds = new Set(earnedBadges.map((b) => b.badgeId));

    return BADGE_DEFINITIONS.map((badge) => {
      const { type, threshold } = badge.requirement;
      let current = 0;

      switch (type) {
        case "bleat_count":
          current = stats.bleatCount;
          break;
        case "grazing_count":
          current = stats.grazingCount;
          break;
        case "grazer_count":
          current = stats.grazerCount;
          break;
        case "max_huff_count":
          current = stats.maxHuffCount;
          break;
        case "max_reply_count":
          current = stats.maxReplyCount;
          break;
        case "herd_member_count":
          current = stats.maxHerdMemberCount;
          break;
        case "streak_days":
          current = stats.currentStreak;
          break;
      }

      return {
        badge,
        progress: Math.min(current / threshold, 1),
        earned: earnedBadgeIds.has(badge.id),
      };
    });
  }
}

export const gamificationService = new GamificationService();
