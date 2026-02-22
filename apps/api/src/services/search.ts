import { eq, and, or, desc, sql, like, ilike } from "drizzle-orm";
import { db } from "@ramzee/database";
import { users, bleats, herds, ramtags, blocks } from "@ramzee/database/schema";

type SearchType = "all" | "users" | "bleats" | "herds" | "ramtags";

interface SearchResult {
  type: "user" | "bleat" | "herd" | "ramtag";
  data: unknown;
  score: number;
}

interface SearchOptions {
  query: string;
  type?: SearchType;
  userId?: string;
  cursor?: string;
  limit?: number;
}

export class SearchService {
  // Unified search across all content types
  async search(options: SearchOptions): Promise<{
    results: SearchResult[];
    nextCursor?: string;
  }> {
    const { query, type = "all", userId, limit = 20 } = options;
    const searchTerm = query.toLowerCase().trim();

    if (searchTerm.length < 2) {
      return { results: [] };
    }

    // Get blocked users if userId provided
    let blockedUserIds: Set<string> = new Set();
    if (userId) {
      const blocks_result = await db.query.blocks.findMany({
        where: eq(blocks.blockerId, userId),
      });
      blockedUserIds = new Set(blocks_result.map((b) => b.blockedId));
    }

    const results: SearchResult[] = [];

    // Search users
    if (type === "all" || type === "users") {
      const userResults = await this.searchUsers(searchTerm, blockedUserIds, limit);
      results.push(...userResults);
    }

    // Search bleats
    if (type === "all" || type === "bleats") {
      const bleatResults = await this.searchBleats(searchTerm, blockedUserIds, limit);
      results.push(...bleatResults);
    }

    // Search herds
    if (type === "all" || type === "herds") {
      const herdResults = await this.searchHerds(searchTerm, limit);
      results.push(...herdResults);
    }

    // Search ramtags
    if (type === "all" || type === "ramtags") {
      const ramtagResults = await this.searchRamtags(searchTerm, limit);
      results.push(...ramtagResults);
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);

    return {
      results: results.slice(0, limit),
    };
  }

  // Search users
  private async searchUsers(
    searchTerm: string,
    blockedUserIds: Set<string>,
    limit: number
  ): Promise<SearchResult[]> {
    const userResults = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        isVerified: users.isVerified,
        grazerCount: users.grazerCount,
      })
      .from(users)
      .where(
        or(
          ilike(users.username, `%${searchTerm}%`),
          ilike(users.displayName, `%${searchTerm}%`)
        )
      )
      .orderBy(desc(users.grazerCount))
      .limit(limit * 2); // Get more to filter

    return userResults
      .filter((u) => !blockedUserIds.has(u.id))
      .slice(0, limit)
      .map((user) => ({
        type: "user" as const,
        data: user,
        score: this.calculateUserScore(user, searchTerm),
      }));
  }

  // Search bleats
  private async searchBleats(
    searchTerm: string,
    blockedUserIds: Set<string>,
    limit: number
  ): Promise<SearchResult[]> {
    const bleatResults = await db
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
          ilike(bleats.content, `%${searchTerm}%`),
          eq(bleats.isDeleted, false)
        )
      )
      .orderBy(desc(bleats.huffCount))
      .limit(limit * 2);

    return bleatResults
      .filter((r) => !blockedUserIds.has(r.bleat.authorId))
      .slice(0, limit)
      .map((result) => ({
        type: "bleat" as const,
        data: {
          ...result.bleat,
          author: result.author,
        },
        score: this.calculateBleatScore(result.bleat, searchTerm),
      }));
  }

  // Search herds
  private async searchHerds(searchTerm: string, limit: number): Promise<SearchResult[]> {
    const herdResults = await db
      .select()
      .from(herds)
      .where(
        and(
          or(
            ilike(herds.name, `%${searchTerm}%`),
            ilike(herds.description, `%${searchTerm}%`)
          ),
          eq(herds.privacy, "public")
        )
      )
      .orderBy(desc(herds.memberCount))
      .limit(limit);

    return herdResults.map((herd) => ({
      type: "herd" as const,
      data: herd,
      score: this.calculateHerdScore(herd, searchTerm),
    }));
  }

  // Search ramtags
  private async searchRamtags(searchTerm: string, limit: number): Promise<SearchResult[]> {
    // Remove # if present
    const tag = searchTerm.replace(/^#/, "");

    const ramtagResults = await db
      .select()
      .from(ramtags)
      .where(ilike(ramtags.tag, `%${tag}%`))
      .orderBy(desc(ramtags.usageCount))
      .limit(limit);

    return ramtagResults.map((ramtag) => ({
      type: "ramtag" as const,
      data: ramtag,
      score: this.calculateRamtagScore(ramtag, tag),
    }));
  }

  // Calculate user relevance score
  private calculateUserScore(
    user: { username: string; displayName: string; grazerCount: number; isVerified: boolean },
    searchTerm: string
  ): number {
    let score = 0;

    // Exact match bonuses
    if (user.username.toLowerCase() === searchTerm) score += 100;
    if (user.displayName.toLowerCase() === searchTerm) score += 80;

    // Starts with bonus
    if (user.username.toLowerCase().startsWith(searchTerm)) score += 50;
    if (user.displayName.toLowerCase().startsWith(searchTerm)) score += 40;

    // Popularity bonus (logarithmic)
    score += Math.log10(user.grazerCount + 1) * 10;

    // Verified bonus
    if (user.isVerified) score += 20;

    return score;
  }

  // Calculate bleat relevance score
  private calculateBleatScore(
    bleat: { content: string; huffCount: number; rebaaCount: number },
    searchTerm: string
  ): number {
    let score = 0;

    // Engagement bonus (logarithmic)
    score += Math.log10(bleat.huffCount + 1) * 10;
    score += Math.log10(bleat.rebaaCount + 1) * 5;

    // Content relevance
    const contentLower = bleat.content.toLowerCase();
    const termOccurrences = (contentLower.match(new RegExp(searchTerm, "g")) || []).length;
    score += termOccurrences * 5;

    return score;
  }

  // Calculate herd relevance score
  private calculateHerdScore(
    herd: { name: string; memberCount: number },
    searchTerm: string
  ): number {
    let score = 0;

    // Exact match bonus
    if (herd.name.toLowerCase() === searchTerm) score += 100;
    if (herd.name.toLowerCase().startsWith(searchTerm)) score += 50;

    // Popularity bonus
    score += Math.log10(herd.memberCount + 1) * 15;

    return score;
  }

  // Calculate ramtag relevance score
  private calculateRamtagScore(
    ramtag: { tag: string; usageCount: number },
    searchTerm: string
  ): number {
    let score = 0;

    // Exact match bonus
    if (ramtag.tag.toLowerCase() === searchTerm.toLowerCase()) score += 100;
    if (ramtag.tag.toLowerCase().startsWith(searchTerm.toLowerCase())) score += 50;

    // Usage bonus
    score += Math.log10(ramtag.usageCount + 1) * 20;

    return score;
  }

  // Get autocomplete suggestions
  async getAutocompleteSuggestions(
    query: string,
    userId?: string,
    limit = 10
  ): Promise<{
    users: { id: string; username: string; displayName: string; avatarUrl: string | null }[];
    ramtags: { tag: string; usageCount: number }[];
  }> {
    const searchTerm = query.toLowerCase().trim();

    if (searchTerm.length < 1) {
      return { users: [], ramtags: [] };
    }

    // Check if searching for ramtag
    if (searchTerm.startsWith("#")) {
      const tag = searchTerm.slice(1);
      const ramtagResults = await db
        .select({ tag: ramtags.tag, usageCount: ramtags.usageCount })
        .from(ramtags)
        .where(ilike(ramtags.tag, `${tag}%`))
        .orderBy(desc(ramtags.usageCount))
        .limit(limit);

      return { users: [], ramtags: ramtagResults };
    }

    // Check if searching for user (@mention)
    if (searchTerm.startsWith("@")) {
      const username = searchTerm.slice(1);
      const userResults = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(ilike(users.username, `${username}%`))
        .orderBy(desc(users.grazerCount))
        .limit(limit);

      return { users: userResults, ramtags: [] };
    }

    // General autocomplete - return both users and ramtags
    const [userResults, ramtagResults] = await Promise.all([
      db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(
          or(
            ilike(users.username, `${searchTerm}%`),
            ilike(users.displayName, `${searchTerm}%`)
          )
        )
        .orderBy(desc(users.grazerCount))
        .limit(Math.floor(limit / 2)),

      db
        .select({ tag: ramtags.tag, usageCount: ramtags.usageCount })
        .from(ramtags)
        .where(ilike(ramtags.tag, `${searchTerm}%`))
        .orderBy(desc(ramtags.usageCount))
        .limit(Math.floor(limit / 2)),
    ]);

    return { users: userResults, ramtags: ramtagResults };
  }

  // Get discover/explore content
  async getDiscoverContent(userId?: string): Promise<{
    trendingRamtags: { tag: string; usageCount: number }[];
    suggestedUsers: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      bio: string | null;
      grazerCount: number;
    }[];
    popularHerds: typeof herds.$inferSelect[];
    trendingBleats: {
      bleat: typeof bleats.$inferSelect;
      author: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        isVerified: boolean;
      } | null;
    }[];
  }> {
    // Get blocked users if userId provided
    let blockedUserIds: Set<string> = new Set();
    if (userId) {
      const blocks_result = await db.query.blocks.findMany({
        where: eq(blocks.blockerId, userId),
      });
      blockedUserIds = new Set(blocks_result.map((b) => b.blockedId));
    }

    const [trendingRamtags, suggestedUsers, popularHerds, trendingBleats] = await Promise.all([
      // Trending ramtags
      db
        .select({ tag: ramtags.tag, usageCount: ramtags.usageCount })
        .from(ramtags)
        .orderBy(desc(ramtags.usageCount))
        .limit(10),

      // Suggested users (verified, high follower count)
      db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          grazerCount: users.grazerCount,
        })
        .from(users)
        .where(eq(users.isVerified, true))
        .orderBy(desc(users.grazerCount))
        .limit(10),

      // Popular herds
      db
        .select()
        .from(herds)
        .where(eq(herds.privacy, "public"))
        .orderBy(desc(herds.memberCount))
        .limit(10),

      // Trending bleats (recent with high engagement)
      db
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
        .where(eq(bleats.isDeleted, false))
        .orderBy(
          desc(
            sql`(${bleats.huffCount} + ${bleats.replyCount} * 2 + ${bleats.rebaaCount} * 3) /
                POWER(EXTRACT(EPOCH FROM (NOW() - ${bleats.createdAt})) / 3600 + 2, 1.5)`
          )
        )
        .limit(20),
    ]);

    return {
      trendingRamtags,
      suggestedUsers: suggestedUsers.filter((u) => !blockedUserIds.has(u.id) && u.id !== userId),
      popularHerds,
      trendingBleats: trendingBleats.filter((t) => !blockedUserIds.has(t.bleat.authorId)),
    };
  }

  // Record search for analytics
  async recordSearch(query: string, userId?: string): Promise<void> {
    // This would store search history for recommendations
    // Simplified implementation - would need a search_history table
  }
}

export const searchService = new SearchService();
