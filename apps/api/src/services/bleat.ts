import { eq, and, desc, sql, isNull, or, inArray } from "drizzle-orm";
import { db } from "@ramzee/database";
import { bleats, huffs, ramTags, bleatRamTags, users } from "@ramzee/database/schema";

const RAMTAG_REGEX = /#([a-zA-Z0-9_]+)/g;

export function extractRamTags(content: string): string[] {
  const matches = content.match(RAMTAG_REGEX);
  if (!matches) return [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
}

interface CreateBleatInput {
  authorId: string;
  content: string;
  bleatType?: "text" | "photo" | "poll" | "event";
  mediaUrls?: string[];
  parentBleatId?: string;
  rebaaOfId?: string;
  isIncognito?: boolean;
  herdId?: string;
  locationId?: string;
}

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

export class BleatService {
  async create(input: CreateBleatInput): Promise<typeof bleats.$inferSelect> {
    // Create the bleat
    const [bleat] = await db
      .insert(bleats)
      .values({
        authorId: input.authorId,
        content: input.content,
        bleatType: input.bleatType || "text",
        mediaUrls: input.mediaUrls,
        parentBleatId: input.parentBleatId,
        rebaaOfId: input.rebaaOfId,
        isIncognito: input.isIncognito || false,
        herdId: input.herdId,
        locationId: input.locationId,
      })
      .returning();

    // Extract and process ramtags
    const tags = extractRamTags(input.content);
    if (tags.length > 0) {
      await this.processRamTags(bleat.id, tags);
    }

    // Update parent bleat reply count
    if (input.parentBleatId) {
      await db
        .update(bleats)
        .set({ replyCount: sql`${bleats.replyCount} + 1` })
        .where(eq(bleats.id, input.parentBleatId));
    }

    // Update original bleat rebaa count
    if (input.rebaaOfId) {
      await db
        .update(bleats)
        .set({ rebaaCount: sql`${bleats.rebaaCount} + 1` })
        .where(eq(bleats.id, input.rebaaOfId));
    }

    return bleat;
  }

  async processRamTags(bleatId: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      // Upsert ramtag
      const [ramTag] = await db
        .insert(ramTags)
        .values({ tag })
        .onConflictDoUpdate({
          target: ramTags.tag,
          set: {
            useCount: sql`${ramTags.useCount} + 1`,
            lastUsedAt: new Date(),
          },
        })
        .returning();

      // Link bleat to ramtag
      await db.insert(bleatRamTags).values({
        bleatId,
        ramTagId: ramTag.id,
      });
    }
  }

  async getById(bleatId: string, userId?: string): Promise<BleatWithAuthor | null> {
    const result = await db
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
      .where(and(eq(bleats.id, bleatId), eq(bleats.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;

    const bleatData = result[0];
    let huffedByUser = false;
    let rebaaedByUser = false;

    if (userId) {
      const userHuff = await db.query.huffs.findFirst({
        where: and(eq(huffs.bleatId, bleatId), eq(huffs.userId, userId)),
      });
      huffedByUser = !!userHuff;

      const userRebaa = await db.query.bleats.findFirst({
        where: and(eq(bleats.rebaaOfId, bleatId), eq(bleats.authorId, userId)),
      });
      rebaaedByUser = !!userRebaa;
    }

    return {
      ...bleatData,
      huffedByUser,
      rebaaedByUser,
    };
  }

  async delete(bleatId: string, userId: string): Promise<boolean> {
    const bleat = await db.query.bleats.findFirst({
      where: and(eq(bleats.id, bleatId), eq(bleats.authorId, userId)),
    });

    if (!bleat) return false;

    // Soft delete
    await db
      .update(bleats)
      .set({ isDeleted: true })
      .where(eq(bleats.id, bleatId));

    // Update parent reply count
    if (bleat.parentBleatId) {
      await db
        .update(bleats)
        .set({ replyCount: sql`GREATEST(${bleats.replyCount} - 1, 0)` })
        .where(eq(bleats.id, bleat.parentBleatId));
    }

    // Update original rebaa count
    if (bleat.rebaaOfId) {
      await db
        .update(bleats)
        .set({ rebaaCount: sql`GREATEST(${bleats.rebaaCount} - 1, 0)` })
        .where(eq(bleats.id, bleat.rebaaOfId));
    }

    return true;
  }

  async huff(bleatId: string, userId: string): Promise<boolean> {
    // Check if already huffed
    const existingHuff = await db.query.huffs.findFirst({
      where: and(eq(huffs.bleatId, bleatId), eq(huffs.userId, userId)),
    });

    if (existingHuff) return false;

    // Create huff
    await db.insert(huffs).values({ bleatId, userId });

    // Increment huff count
    await db
      .update(bleats)
      .set({ huffCount: sql`${bleats.huffCount} + 1` })
      .where(eq(bleats.id, bleatId));

    return true;
  }

  async unhuff(bleatId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(huffs)
      .where(and(eq(huffs.bleatId, bleatId), eq(huffs.userId, userId)));

    if (result.rowCount === 0) return false;

    // Decrement huff count
    await db
      .update(bleats)
      .set({ huffCount: sql`GREATEST(${bleats.huffCount} - 1, 0)` })
      .where(eq(bleats.id, bleatId));

    return true;
  }

  async getReplies(
    bleatId: string,
    cursor?: string,
    limit = 20,
    userId?: string
  ): Promise<{ bleats: BleatWithAuthor[]; nextCursor?: string }> {
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
          eq(bleats.parentBleatId, bleatId),
          eq(bleats.isDeleted, false),
          cursor ? sql`${bleats.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(bleats.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const bleatsData = hasMore ? results.slice(0, -1) : results;

    // Get huff status for user
    let huffedBleatIds: Set<string> = new Set();
    if (userId && bleatsData.length > 0) {
      const bleatIds = bleatsData.map((b) => b.bleat.id);
      const userHuffs = await db.query.huffs.findMany({
        where: and(inArray(huffs.bleatId, bleatIds), eq(huffs.userId, userId)),
      });
      huffedBleatIds = new Set(userHuffs.map((h) => h.bleatId));
    }

    return {
      bleats: bleatsData.map((b) => ({
        ...b,
        huffedByUser: huffedBleatIds.has(b.bleat.id),
      })),
      nextCursor: hasMore ? bleatsData[bleatsData.length - 1].bleat.createdAt.toISOString() : undefined,
    };
  }

  async getUserBleats(
    userId: string,
    cursor?: string,
    limit = 20,
    viewerId?: string
  ): Promise<{ bleats: BleatWithAuthor[]; nextCursor?: string }> {
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
          eq(bleats.authorId, userId),
          eq(bleats.isDeleted, false),
          isNull(bleats.parentBleatId), // Only top-level bleats
          cursor ? sql`${bleats.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(bleats.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const bleatsData = hasMore ? results.slice(0, -1) : results;

    // Get huff status for viewer
    let huffedBleatIds: Set<string> = new Set();
    if (viewerId && bleatsData.length > 0) {
      const bleatIds = bleatsData.map((b) => b.bleat.id);
      const userHuffs = await db.query.huffs.findMany({
        where: and(inArray(huffs.bleatId, bleatIds), eq(huffs.userId, viewerId)),
      });
      huffedBleatIds = new Set(userHuffs.map((h) => h.bleatId));
    }

    return {
      bleats: bleatsData.map((b) => ({
        ...b,
        huffedByUser: huffedBleatIds.has(b.bleat.id),
      })),
      nextCursor: hasMore ? bleatsData[bleatsData.length - 1].bleat.createdAt.toISOString() : undefined,
    };
  }

  async getTrendingRamTags(limit = 10): Promise<typeof ramTags.$inferSelect[]> {
    return db.query.ramTags.findMany({
      orderBy: [desc(ramTags.useCount), desc(ramTags.lastUsedAt)],
      limit,
    });
  }

  async getBleatsByRamTag(
    tag: string,
    cursor?: string,
    limit = 20
  ): Promise<{ bleats: BleatWithAuthor[]; nextCursor?: string }> {
    const ramTag = await db.query.ramTags.findFirst({
      where: eq(ramTags.tag, tag.toLowerCase()),
    });

    if (!ramTag) return { bleats: [] };

    const bleatIds = await db
      .select({ bleatId: bleatRamTags.bleatId })
      .from(bleatRamTags)
      .where(eq(bleatRamTags.ramTagId, ramTag.id));

    if (bleatIds.length === 0) return { bleats: [] };

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
          inArray(
            bleats.id,
            bleatIds.map((b) => b.bleatId)
          ),
          eq(bleats.isDeleted, false),
          cursor ? sql`${bleats.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(bleats.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const bleatsData = hasMore ? results.slice(0, -1) : results;

    return {
      bleats: bleatsData,
      nextCursor: hasMore ? bleatsData[bleatsData.length - 1].bleat.createdAt.toISOString() : undefined,
    };
  }
}

export const bleatService = new BleatService();
