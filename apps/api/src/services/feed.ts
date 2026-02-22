import { eq, and, desc, sql, inArray, or, notInArray } from "drizzle-orm";
import { db } from "@ramzee/database";
import { bleats, huffs, grazes, blocks, mutes, users, ramTags } from "@ramzee/database/schema";

interface BleatWithAuthor {
  bleat: typeof bleats.$inferSelect;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  } | null;
  huffedByUser?: boolean;
  rebaaedByUser?: boolean;
}

interface FeedResult {
  bleats: BleatWithAuthor[];
  nextCursor?: string;
}

export class FeedService {
  // Get blocked and muted user IDs for filtering
  private async getFilteredUserIds(userId: string): Promise<string[]> {
    const [blockedByUser, blockedByOthers, mutedUsers] = await Promise.all([
      // Users the current user has blocked
      db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, userId)),
      // Users who have blocked the current user
      db.select({ id: blocks.blockerId }).from(blocks).where(eq(blocks.blockedId, userId)),
      // Users the current user has muted
      db.select({ id: mutes.mutedId }).from(mutes).where(eq(mutes.muterId, userId)),
    ]);

    const ids = new Set<string>();
    blockedByUser.forEach(b => ids.add(b.id));
    blockedByOthers.forEach(b => ids.add(b.id));
    mutedUsers.forEach(m => ids.add(m.id));

    return Array.from(ids);
  }

  // Get user's pasture (home feed) - bleats from users they follow
  async getPasture(
    userId: string,
    cursor?: string,
    limit = 20
  ): Promise<FeedResult> {
    // Get users the current user follows
    const following = await db
      .select({ grazingId: grazes.grazingId })
      .from(grazes)
      .where(eq(grazes.grazerId, userId));

    const followingIds = following.map(f => f.grazingId);

    // Include user's own bleats in the feed
    followingIds.push(userId);

    // Get filtered user IDs (blocked/muted)
    const filteredIds = await this.getFilteredUserIds(userId);

    // Build query
    const results = await db
      .select({
        bleat: bleats,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isVerified: users.isVerified,
        },
      })
      .from(bleats)
      .leftJoin(users, eq(bleats.authorId, users.id))
      .where(
        and(
          inArray(bleats.authorId, followingIds.length > 0 ? followingIds : ['00000000-0000-0000-0000-000000000000']),
          eq(bleats.isDeleted, false),
          eq(bleats.isIncognito, false),
          filteredIds.length > 0 ? notInArray(bleats.authorId, filteredIds) : undefined,
          cursor ? sql`${bleats.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(bleats.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const bleatsData = hasMore ? results.slice(0, -1) : results;

    // Get huff status for user
    let huffedBleatIds: Set<string> = new Set();
    if (bleatsData.length > 0) {
      const bleatIds = bleatsData.map(b => b.bleat.id);
      const userHuffs = await db.query.huffs.findMany({
        where: and(inArray(huffs.bleatId, bleatIds), eq(huffs.userId, userId)),
      });
      huffedBleatIds = new Set(userHuffs.map(h => h.bleatId));
    }

    return {
      bleats: bleatsData.map(b => ({
        ...b,
        huffedByUser: huffedBleatIds.has(b.bleat.id),
      })),
      nextCursor: hasMore ? bleatsData[bleatsData.length - 1].bleat.createdAt.toISOString() : undefined,
    };
  }

  // Get meadow (explore/trending) - popular and trending bleats
  async getMeadow(
    userId?: string,
    cursor?: string,
    limit = 20,
    filter: "trending" | "latest" | "top" = "trending"
  ): Promise<FeedResult> {
    // Get filtered user IDs if authenticated
    const filteredIds = userId ? await this.getFilteredUserIds(userId) : [];

    let orderBy;
    switch (filter) {
      case "latest":
        orderBy = desc(bleats.createdAt);
        break;
      case "top":
        // Order by engagement (huffs + replies + rebaas)
        orderBy = desc(sql`${bleats.huffCount} + ${bleats.replyCount} + ${bleats.rebaaCount}`);
        break;
      case "trending":
      default:
        // Time-decay algorithm: score = engagement / (hours_since_post + 2)^1.5
        orderBy = desc(
          sql`(${bleats.huffCount} + ${bleats.replyCount} * 2 + ${bleats.rebaaCount} * 3) /
              POWER(EXTRACT(EPOCH FROM (NOW() - ${bleats.createdAt})) / 3600 + 2, 1.5)`
        );
        break;
    }

    const results = await db
      .select({
        bleat: bleats,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isVerified: users.isVerified,
        },
      })
      .from(bleats)
      .leftJoin(users, eq(bleats.authorId, users.id))
      .where(
        and(
          eq(bleats.isDeleted, false),
          eq(bleats.isIncognito, false),
          filteredIds.length > 0 ? notInArray(bleats.authorId, filteredIds) : undefined,
          // For trending, only look at recent bleats (last 7 days)
          filter === "trending"
            ? sql`${bleats.createdAt} > NOW() - INTERVAL '7 days'`
            : undefined,
          cursor ? sql`${bleats.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(orderBy)
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const bleatsData = hasMore ? results.slice(0, -1) : results;

    // Get huff status for user if authenticated
    let huffedBleatIds: Set<string> = new Set();
    if (userId && bleatsData.length > 0) {
      const bleatIds = bleatsData.map(b => b.bleat.id);
      const userHuffs = await db.query.huffs.findMany({
        where: and(inArray(huffs.bleatId, bleatIds), eq(huffs.userId, userId)),
      });
      huffedBleatIds = new Set(userHuffs.map(h => h.bleatId));
    }

    return {
      bleats: bleatsData.map(b => ({
        ...b,
        huffedByUser: userId ? huffedBleatIds.has(b.bleat.id) : undefined,
      })),
      nextCursor: hasMore ? bleatsData[bleatsData.length - 1].bleat.createdAt.toISOString() : undefined,
    };
  }

  // Get bleats by ramtag
  async getRamtagFeed(
    tag: string,
    userId?: string,
    cursor?: string,
    limit = 20
  ): Promise<FeedResult> {
    // Import bleatService to avoid circular dependency
    const { bleatService } = await import("./bleat.js");
    return bleatService.getBleatsByRamTag(tag, cursor, limit);
  }

  // Get trending ramtags
  async getTrendingRamtags(limit = 10): Promise<typeof ramTags.$inferSelect[]> {
    // Get ramtags with recent activity (last 24 hours)
    // Weighted by both total usage and velocity
    return db
      .select()
      .from(ramTags)
      .where(sql`${ramTags.lastUsedAt} > NOW() - INTERVAL '24 hours'`)
      .orderBy(
        desc(sql`${ramTags.useCount} * (1 / (EXTRACT(EPOCH FROM (NOW() - ${ramTags.lastUsedAt})) / 3600 + 1))`)
      )
      .limit(limit);
  }

  // Get "For You" feed - algorithmic feed based on user's interests
  async getForYou(
    userId: string,
    cursor?: string,
    limit = 20
  ): Promise<FeedResult> {
    // Get users the current user follows
    const following = await db
      .select({ grazingId: grazes.grazingId })
      .from(grazes)
      .where(eq(grazes.grazerId, userId));

    const followingIds = following.map(f => f.grazingId);

    // Get filtered user IDs (blocked/muted)
    const filteredIds = await this.getFilteredUserIds(userId);

    // Algorithm:
    // 1. Include bleats from followed users with high engagement
    // 2. Include trending bleats from non-followed users
    // 3. Weight by recency and engagement

    const results = await db
      .select({
        bleat: bleats,
        author: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isVerified: users.isVerified,
        },
      })
      .from(bleats)
      .leftJoin(users, eq(bleats.authorId, users.id))
      .where(
        and(
          eq(bleats.isDeleted, false),
          eq(bleats.isIncognito, false),
          filteredIds.length > 0 ? notInArray(bleats.authorId, filteredIds) : undefined,
          sql`${bleats.createdAt} > NOW() - INTERVAL '3 days'`,
          cursor ? sql`${bleats.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(
        // Score formula that boosts followed users and engagement
        desc(
          sql`
            CASE WHEN ${bleats.authorId} = ANY(${followingIds.length > 0 ? followingIds : ['00000000-0000-0000-0000-000000000000']})
              THEN 2.0 ELSE 1.0 END *
            (${bleats.huffCount} + ${bleats.replyCount} * 2 + ${bleats.rebaaCount} * 3 + 1) /
            POWER(EXTRACT(EPOCH FROM (NOW() - ${bleats.createdAt})) / 3600 + 2, 1.2)
          `
        )
      )
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const bleatsData = hasMore ? results.slice(0, -1) : results;

    // Get huff status for user
    let huffedBleatIds: Set<string> = new Set();
    if (bleatsData.length > 0) {
      const bleatIds = bleatsData.map(b => b.bleat.id);
      const userHuffs = await db.query.huffs.findMany({
        where: and(inArray(huffs.bleatId, bleatIds), eq(huffs.userId, userId)),
      });
      huffedBleatIds = new Set(userHuffs.map(h => h.bleatId));
    }

    return {
      bleats: bleatsData.map(b => ({
        ...b,
        huffedByUser: huffedBleatIds.has(b.bleat.id),
      })),
      nextCursor: hasMore ? bleatsData[bleatsData.length - 1].bleat.createdAt.toISOString() : undefined,
    };
  }
}

export const feedService = new FeedService();
