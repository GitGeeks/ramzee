import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db } from "@ramzee/database";
import { grazes, blocks, mutes, users } from "@ramzee/database/schema";

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  bio: string | null;
}

interface PaginatedUsers {
  users: UserProfile[];
  nextCursor?: string;
}

export class SocialService {
  // ==================== GRAZES (FOLLOWS) ====================

  async graze(grazerId: string, grazingId: string): Promise<boolean> {
    // Can't follow yourself
    if (grazerId === grazingId) return false;

    // Check if already following
    const existingGraze = await db.query.grazes.findFirst({
      where: and(eq(grazes.grazerId, grazerId), eq(grazes.grazingId, grazingId)),
    });

    if (existingGraze) return false;

    // Check if blocked
    const isBlocked = await this.isBlocked(grazerId, grazingId);
    if (isBlocked) return false;

    // Create graze
    await db.insert(grazes).values({ grazerId, grazingId });

    // Update follower/following counts
    await Promise.all([
      db
        .update(users)
        .set({ followingCount: sql`${users.followingCount} + 1` })
        .where(eq(users.id, grazerId)),
      db
        .update(users)
        .set({ followerCount: sql`${users.followerCount} + 1` })
        .where(eq(users.id, grazingId)),
    ]);

    return true;
  }

  async ungraze(grazerId: string, grazingId: string): Promise<boolean> {
    const result = await db
      .delete(grazes)
      .where(and(eq(grazes.grazerId, grazerId), eq(grazes.grazingId, grazingId)));

    if (result.rowCount === 0) return false;

    // Update follower/following counts
    await Promise.all([
      db
        .update(users)
        .set({ followingCount: sql`GREATEST(${users.followingCount} - 1, 0)` })
        .where(eq(users.id, grazerId)),
      db
        .update(users)
        .set({ followerCount: sql`GREATEST(${users.followerCount} - 1, 0)` })
        .where(eq(users.id, grazingId)),
    ]);

    return true;
  }

  async isGrazing(grazerId: string, grazingId: string): Promise<boolean> {
    const graze = await db.query.grazes.findFirst({
      where: and(eq(grazes.grazerId, grazerId), eq(grazes.grazingId, grazingId)),
    });
    return !!graze;
  }

  async getGrazers(
    userId: string,
    cursor?: string,
    limit = 20
  ): Promise<PaginatedUsers> {
    const results = await db
      .select({
        graze: grazes,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isVerified: users.isVerified,
          bio: users.bio,
        },
      })
      .from(grazes)
      .innerJoin(users, eq(grazes.grazerId, users.id))
      .where(
        and(
          eq(grazes.grazingId, userId),
          cursor ? sql`${grazes.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(grazes.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;

    return {
      users: data.map((r) => r.user),
      nextCursor: hasMore ? data[data.length - 1].graze.createdAt.toISOString() : undefined,
    };
  }

  async getGrazing(
    userId: string,
    cursor?: string,
    limit = 20
  ): Promise<PaginatedUsers> {
    const results = await db
      .select({
        graze: grazes,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isVerified: users.isVerified,
          bio: users.bio,
        },
      })
      .from(grazes)
      .innerJoin(users, eq(grazes.grazingId, users.id))
      .where(
        and(
          eq(grazes.grazerId, userId),
          cursor ? sql`${grazes.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(grazes.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;

    return {
      users: data.map((r) => r.user),
      nextCursor: hasMore ? data[data.length - 1].graze.createdAt.toISOString() : undefined,
    };
  }

  // ==================== BLOCKS ====================

  async block(blockerId: string, blockedId: string): Promise<boolean> {
    // Can't block yourself
    if (blockerId === blockedId) return false;

    // Check if already blocked
    const existingBlock = await db.query.blocks.findFirst({
      where: and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)),
    });

    if (existingBlock) return false;

    // Create block
    await db.insert(blocks).values({ blockerId, blockedId });

    // Remove any existing grazes (follows) between these users
    await Promise.all([
      this.ungraze(blockerId, blockedId),
      this.ungraze(blockedId, blockerId),
    ]);

    return true;
  }

  async unblock(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await db
      .delete(blocks)
      .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));

    return result.rowCount !== 0;
  }

  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    // Check if either user has blocked the other
    const block = await db.query.blocks.findFirst({
      where: and(
        eq(blocks.blockerId, userId1),
        eq(blocks.blockedId, userId2)
      ),
    });

    if (block) return true;

    const reverseBlock = await db.query.blocks.findFirst({
      where: and(
        eq(blocks.blockerId, userId2),
        eq(blocks.blockedId, userId1)
      ),
    });

    return !!reverseBlock;
  }

  async getBlockedUsers(
    userId: string,
    cursor?: string,
    limit = 20
  ): Promise<PaginatedUsers> {
    const results = await db
      .select({
        block: blocks,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isVerified: users.isVerified,
          bio: users.bio,
        },
      })
      .from(blocks)
      .innerJoin(users, eq(blocks.blockedId, users.id))
      .where(
        and(
          eq(blocks.blockerId, userId),
          cursor ? sql`${blocks.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(blocks.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;

    return {
      users: data.map((r) => r.user),
      nextCursor: hasMore ? data[data.length - 1].block.createdAt.toISOString() : undefined,
    };
  }

  // ==================== MUTES ====================

  async mute(muterId: string, mutedId: string): Promise<boolean> {
    // Can't mute yourself
    if (muterId === mutedId) return false;

    // Check if already muted
    const existingMute = await db.query.mutes.findFirst({
      where: and(eq(mutes.muterId, muterId), eq(mutes.mutedId, mutedId)),
    });

    if (existingMute) return false;

    // Create mute
    await db.insert(mutes).values({ muterId, mutedId });

    return true;
  }

  async unmute(muterId: string, mutedId: string): Promise<boolean> {
    const result = await db
      .delete(mutes)
      .where(and(eq(mutes.muterId, muterId), eq(mutes.mutedId, mutedId)));

    return result.rowCount !== 0;
  }

  async isMuted(muterId: string, mutedId: string): Promise<boolean> {
    const mute = await db.query.mutes.findFirst({
      where: and(eq(mutes.muterId, muterId), eq(mutes.mutedId, mutedId)),
    });
    return !!mute;
  }

  async getMutedUsers(
    userId: string,
    cursor?: string,
    limit = 20
  ): Promise<PaginatedUsers> {
    const results = await db
      .select({
        mute: mutes,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isVerified: users.isVerified,
          bio: users.bio,
        },
      })
      .from(mutes)
      .innerJoin(users, eq(mutes.mutedId, users.id))
      .where(
        and(
          eq(mutes.muterId, userId),
          cursor ? sql`${mutes.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(mutes.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;

    return {
      users: data.map((r) => r.user),
      nextCursor: hasMore ? data[data.length - 1].mute.createdAt.toISOString() : undefined,
    };
  }

  // ==================== RELATIONSHIP CHECKS ====================

  async getRelationship(
    userId: string,
    targetUserId: string
  ): Promise<{
    isGrazing: boolean;
    isGrazedBy: boolean;
    isBlocked: boolean;
    isBlockedBy: boolean;
    isMuted: boolean;
  }> {
    const [
      grazing,
      grazedBy,
      blocked,
      blockedBy,
      muted,
    ] = await Promise.all([
      this.isGrazing(userId, targetUserId),
      this.isGrazing(targetUserId, userId),
      db.query.blocks.findFirst({
        where: and(eq(blocks.blockerId, userId), eq(blocks.blockedId, targetUserId)),
      }),
      db.query.blocks.findFirst({
        where: and(eq(blocks.blockerId, targetUserId), eq(blocks.blockedId, userId)),
      }),
      this.isMuted(userId, targetUserId),
    ]);

    return {
      isGrazing: grazing,
      isGrazedBy: grazedBy,
      isBlocked: !!blocked,
      isBlockedBy: !!blockedBy,
      isMuted: muted,
    };
  }

  // Get mutual followers (users who follow each other)
  async getMutualGrazers(userId: string, limit = 20): Promise<UserProfile[]> {
    // Get users that userId follows
    const following = await db
      .select({ grazingId: grazes.grazingId })
      .from(grazes)
      .where(eq(grazes.grazerId, userId));

    if (following.length === 0) return [];

    const followingIds = following.map((f) => f.grazingId);

    // Find users who also follow userId back
    const mutuals = await db
      .select({
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isVerified: users.isVerified,
          bio: users.bio,
        },
      })
      .from(grazes)
      .innerJoin(users, eq(grazes.grazerId, users.id))
      .where(
        and(
          eq(grazes.grazingId, userId),
          inArray(grazes.grazerId, followingIds)
        )
      )
      .limit(limit);

    return mutuals.map((m) => m.user);
  }

  // Get suggested users (users followed by people you follow)
  async getSuggestedUsers(userId: string, limit = 10): Promise<UserProfile[]> {
    // Get users that userId follows
    const following = await db
      .select({ grazingId: grazes.grazingId })
      .from(grazes)
      .where(eq(grazes.grazerId, userId));

    if (following.length === 0) {
      // If not following anyone, return popular users
      return db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isVerified: users.isVerified,
          bio: users.bio,
        })
        .from(users)
        .where(and(sql`${users.id} != ${userId}`, eq(users.isSuspended, false)))
        .orderBy(desc(users.followerCount))
        .limit(limit);
    }

    const followingIds = following.map((f) => f.grazingId);

    // Get users followed by people you follow, excluding users you already follow
    const suggested = await db
      .select({
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isVerified: users.isVerified,
          bio: users.bio,
        },
        followCount: sql<number>`count(*)`.as("followCount"),
      })
      .from(grazes)
      .innerJoin(users, eq(grazes.grazingId, users.id))
      .where(
        and(
          inArray(grazes.grazerId, followingIds),
          sql`${grazes.grazingId} != ${userId}`,
          sql`${grazes.grazingId} NOT IN (SELECT grazing_id FROM grazes WHERE grazer_id = ${userId})`,
          eq(users.isSuspended, false)
        )
      )
      .groupBy(users.id)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return suggested.map((s) => s.user);
  }
}

export const socialService = new SocialService();
