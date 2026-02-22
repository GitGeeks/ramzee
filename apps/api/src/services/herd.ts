import { eq, and, desc, sql, inArray, like } from "drizzle-orm";
import { db } from "@ramzee/database";
import { herds, herdMembers, users, bleats } from "@ramzee/database/schema";

type HerdPrivacy = "public" | "private" | "secret";
type MemberRole = "owner" | "admin" | "moderator" | "member";

interface CreateHerdInput {
  name: string;
  description?: string;
  privacy?: HerdPrivacy;
  iconUrl?: string;
  bannerUrl?: string;
  ownerId: string;
}

interface HerdWithMemberCount {
  herd: typeof herds.$inferSelect;
  memberCount: number;
  isMember?: boolean;
  role?: MemberRole;
}

export class HerdService {
  // Create a new herd
  async create(input: CreateHerdInput): Promise<typeof herds.$inferSelect> {
    const [herd] = await db
      .insert(herds)
      .values({
        name: input.name,
        description: input.description,
        privacy: input.privacy || "public",
        iconUrl: input.iconUrl,
        bannerUrl: input.bannerUrl,
        ownerId: input.ownerId,
      })
      .returning();

    // Add owner as member with owner role
    await db.insert(herdMembers).values({
      herdId: herd.id,
      userId: input.ownerId,
      role: "owner",
    });

    return herd;
  }

  // Get herd by ID
  async getById(herdId: string, userId?: string): Promise<HerdWithMemberCount | null> {
    const herd = await db.query.herds.findFirst({
      where: eq(herds.id, herdId),
    });

    if (!herd) return null;

    // Get member count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(herdMembers)
      .where(eq(herdMembers.herdId, herdId));

    // Check if user is a member
    let isMember = false;
    let role: MemberRole | undefined;
    if (userId) {
      const membership = await db.query.herdMembers.findFirst({
        where: and(eq(herdMembers.herdId, herdId), eq(herdMembers.userId, userId)),
      });
      isMember = !!membership;
      role = membership?.role as MemberRole;
    }

    return {
      herd,
      memberCount: Number(count),
      isMember,
      role,
    };
  }

  // Update herd
  async update(
    herdId: string,
    userId: string,
    updates: Partial<{
      name: string;
      description: string;
      privacy: HerdPrivacy;
      iconUrl: string;
      bannerUrl: string;
      rules: string;
    }>
  ): Promise<typeof herds.$inferSelect | null> {
    // Check if user has permission (owner or admin)
    const membership = await db.query.herdMembers.findFirst({
      where: and(eq(herdMembers.herdId, herdId), eq(herdMembers.userId, userId)),
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return null;
    }

    const [updated] = await db
      .update(herds)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(herds.id, herdId))
      .returning();

    return updated;
  }

  // Delete herd (owner only)
  async delete(herdId: string, userId: string): Promise<boolean> {
    const herd = await db.query.herds.findFirst({
      where: and(eq(herds.id, herdId), eq(herds.ownerId, userId)),
    });

    if (!herd) return false;

    // Delete all members first
    await db.delete(herdMembers).where(eq(herdMembers.herdId, herdId));

    // Delete the herd
    await db.delete(herds).where(eq(herds.id, herdId));

    return true;
  }

  // Join a herd
  async join(herdId: string, userId: string): Promise<boolean> {
    const herd = await db.query.herds.findFirst({
      where: eq(herds.id, herdId),
    });

    if (!herd) return false;

    // Check if already a member
    const existingMembership = await db.query.herdMembers.findFirst({
      where: and(eq(herdMembers.herdId, herdId), eq(herdMembers.userId, userId)),
    });

    if (existingMembership) return false;

    // For private herds, this would need approval (simplified here)
    if (herd.privacy === "private" || herd.privacy === "secret") {
      return false; // Would need invite or approval flow
    }

    await db.insert(herdMembers).values({
      herdId,
      userId,
      role: "member",
    });

    // Update member count
    await db
      .update(herds)
      .set({ memberCount: sql`${herds.memberCount} + 1` })
      .where(eq(herds.id, herdId));

    return true;
  }

  // Leave a herd
  async leave(herdId: string, userId: string): Promise<boolean> {
    const herd = await db.query.herds.findFirst({
      where: eq(herds.id, herdId),
    });

    if (!herd) return false;

    // Owner cannot leave (must transfer or delete)
    if (herd.ownerId === userId) return false;

    const result = await db
      .delete(herdMembers)
      .where(and(eq(herdMembers.herdId, herdId), eq(herdMembers.userId, userId)));

    if (result.rowCount === 0) return false;

    // Update member count
    await db
      .update(herds)
      .set({ memberCount: sql`GREATEST(${herds.memberCount} - 1, 0)` })
      .where(eq(herds.id, herdId));

    return true;
  }

  // Get herd members
  async getMembers(
    herdId: string,
    cursor?: string,
    limit = 20
  ): Promise<{
    members: {
      user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      };
      role: MemberRole;
      joinedAt: Date;
    }[];
    nextCursor?: string;
  }> {
    const results = await db
      .select({
        member: herdMembers,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(herdMembers)
      .innerJoin(users, eq(herdMembers.userId, users.id))
      .where(
        and(
          eq(herdMembers.herdId, herdId),
          cursor ? sql`${herdMembers.joinedAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(herdMembers.joinedAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;

    return {
      members: data.map((r) => ({
        user: r.user,
        role: r.member.role as MemberRole,
        joinedAt: r.member.joinedAt,
      })),
      nextCursor: hasMore ? data[data.length - 1].member.joinedAt.toISOString() : undefined,
    };
  }

  // Update member role
  async updateMemberRole(
    herdId: string,
    targetUserId: string,
    actorUserId: string,
    newRole: MemberRole
  ): Promise<boolean> {
    // Check actor's permission
    const actorMembership = await db.query.herdMembers.findFirst({
      where: and(eq(herdMembers.herdId, herdId), eq(herdMembers.userId, actorUserId)),
    });

    if (!actorMembership) return false;

    // Only owner can promote to admin, admin can promote to moderator
    const roleHierarchy = { owner: 4, admin: 3, moderator: 2, member: 1 };
    const actorLevel = roleHierarchy[actorMembership.role as MemberRole];
    const newLevel = roleHierarchy[newRole];

    if (actorLevel <= newLevel) return false;

    // Cannot change owner role
    const targetMembership = await db.query.herdMembers.findFirst({
      where: and(eq(herdMembers.herdId, herdId), eq(herdMembers.userId, targetUserId)),
    });

    if (!targetMembership || targetMembership.role === "owner") return false;

    await db
      .update(herdMembers)
      .set({ role: newRole })
      .where(and(eq(herdMembers.herdId, herdId), eq(herdMembers.userId, targetUserId)));

    return true;
  }

  // Remove member from herd
  async removeMember(herdId: string, targetUserId: string, actorUserId: string): Promise<boolean> {
    // Check actor's permission
    const actorMembership = await db.query.herdMembers.findFirst({
      where: and(eq(herdMembers.herdId, herdId), eq(herdMembers.userId, actorUserId)),
    });

    if (!actorMembership || !["owner", "admin", "moderator"].includes(actorMembership.role)) {
      return false;
    }

    // Get target membership
    const targetMembership = await db.query.herdMembers.findFirst({
      where: and(eq(herdMembers.herdId, herdId), eq(herdMembers.userId, targetUserId)),
    });

    if (!targetMembership || targetMembership.role === "owner") return false;

    // Check role hierarchy (can't remove equal or higher role)
    const roleHierarchy = { owner: 4, admin: 3, moderator: 2, member: 1 };
    if (
      roleHierarchy[actorMembership.role as MemberRole] <=
      roleHierarchy[targetMembership.role as MemberRole]
    ) {
      return false;
    }

    await db
      .delete(herdMembers)
      .where(and(eq(herdMembers.herdId, herdId), eq(herdMembers.userId, targetUserId)));

    // Update member count
    await db
      .update(herds)
      .set({ memberCount: sql`GREATEST(${herds.memberCount} - 1, 0)` })
      .where(eq(herds.id, herdId));

    return true;
  }

  // Get user's herds
  async getUserHerds(userId: string): Promise<HerdWithMemberCount[]> {
    const memberships = await db
      .select({
        herd: herds,
        membership: herdMembers,
      })
      .from(herdMembers)
      .innerJoin(herds, eq(herdMembers.herdId, herds.id))
      .where(eq(herdMembers.userId, userId))
      .orderBy(desc(herdMembers.joinedAt));

    return memberships.map((m) => ({
      herd: m.herd,
      memberCount: m.herd.memberCount,
      isMember: true,
      role: m.membership.role as MemberRole,
    }));
  }

  // Search herds
  async search(
    query: string,
    cursor?: string,
    limit = 20
  ): Promise<{ herds: HerdWithMemberCount[]; nextCursor?: string }> {
    const results = await db
      .select()
      .from(herds)
      .where(
        and(
          like(herds.name, `%${query}%`),
          eq(herds.privacy, "public"), // Only search public herds
          cursor ? sql`${herds.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(herds.memberCount))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;

    return {
      herds: data.map((h) => ({
        herd: h,
        memberCount: h.memberCount,
      })),
      nextCursor: hasMore ? data[data.length - 1].createdAt.toISOString() : undefined,
    };
  }

  // Get herd's bleats feed
  async getHerdFeed(
    herdId: string,
    cursor?: string,
    limit = 20,
    userId?: string
  ): Promise<{
    bleats: {
      bleat: typeof bleats.$inferSelect;
      author: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        isVerified: boolean;
      } | null;
    }[];
    nextCursor?: string;
  }> {
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
          eq(bleats.herdId, herdId),
          eq(bleats.isDeleted, false),
          cursor ? sql`${bleats.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(bleats.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;

    return {
      bleats: data,
      nextCursor: hasMore ? data[data.length - 1].bleat.createdAt.toISOString() : undefined,
    };
  }

  // Get popular herds
  async getPopular(limit = 10): Promise<HerdWithMemberCount[]> {
    const results = await db
      .select()
      .from(herds)
      .where(eq(herds.privacy, "public"))
      .orderBy(desc(herds.memberCount))
      .limit(limit);

    return results.map((h) => ({
      herd: h,
      memberCount: h.memberCount,
    }));
  }
}

export const herdService = new HerdService();
