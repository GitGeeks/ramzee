import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { db } from "@ramzee/database";
import { reports, users, bleats, herds, herdMembers } from "@ramzee/database/schema";
import { notificationService } from "./notification.js";

type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "violence"
  | "nudity"
  | "misinformation"
  | "impersonation"
  | "copyright"
  | "other";

type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";

type ReportTargetType = "bleat" | "user" | "herd" | "message";

interface CreateReportInput {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
}

interface ModerationAction {
  type: "warn" | "mute" | "suspend" | "ban" | "delete_content";
  targetUserId: string;
  duration?: number; // in hours, for mute/suspend
  reason: string;
  moderatorId: string;
}

export class ModerationService {
  // Create a report
  async createReport(input: CreateReportInput): Promise<typeof reports.$inferSelect> {
    // Check if already reported
    const existing = await db.query.reports.findFirst({
      where: and(
        eq(reports.reporterId, input.reporterId),
        eq(reports.targetType, input.targetType),
        eq(reports.targetId, input.targetId),
        eq(reports.status, "pending")
      ),
    });

    if (existing) {
      return existing;
    }

    const [report] = await db
      .insert(reports)
      .values({
        reporterId: input.reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        description: input.description,
        status: "pending",
      })
      .returning();

    return report;
  }

  // Get reports (for moderators)
  async getReports(
    status?: ReportStatus,
    targetType?: ReportTargetType,
    cursor?: string,
    limit = 20
  ): Promise<{
    reports: {
      report: typeof reports.$inferSelect;
      reporter: {
        id: string;
        username: string;
        displayName: string;
      } | null;
    }[];
    nextCursor?: string;
  }> {
    const conditions = [];
    if (status) conditions.push(eq(reports.status, status));
    if (targetType) conditions.push(eq(reports.targetType, targetType));
    if (cursor) conditions.push(sql`${reports.createdAt} < ${cursor}`);

    const results = await db
      .select({
        report: reports,
        reporter: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        },
      })
      .from(reports)
      .leftJoin(users, eq(reports.reporterId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reports.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;

    return {
      reports: data,
      nextCursor: hasMore ? data[data.length - 1].report.createdAt.toISOString() : undefined,
    };
  }

  // Update report status
  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    moderatorId: string,
    resolution?: string
  ): Promise<typeof reports.$inferSelect | null> {
    const [updated] = await db
      .update(reports)
      .set({
        status,
        resolvedAt: status === "resolved" || status === "dismissed" ? new Date() : null,
        resolvedBy: moderatorId,
        resolution,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, reportId))
      .returning();

    return updated || null;
  }

  // Take moderation action
  async takeAction(action: ModerationAction): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, action.targetUserId),
    });

    if (!user) return false;

    switch (action.type) {
      case "warn":
        await this.warnUser(action.targetUserId, action.reason);
        break;

      case "mute":
        await this.muteUser(action.targetUserId, action.duration || 24, action.reason);
        break;

      case "suspend":
        await this.suspendUser(action.targetUserId, action.duration || 168, action.reason);
        break;

      case "ban":
        await this.banUser(action.targetUserId, action.reason);
        break;

      case "delete_content":
        // Would need targetId for specific content
        break;
    }

    return true;
  }

  // Warn a user
  private async warnUser(userId: string, reason: string): Promise<void> {
    await notificationService.create({
      userId,
      type: "system",
      content: `Warning: Your account has received a warning for: ${reason}. Please review our community guidelines.`,
    });
  }

  // Mute a user (prevent posting)
  private async muteUser(userId: string, hours: number, reason: string): Promise<void> {
    const mutedUntil = new Date();
    mutedUntil.setHours(mutedUntil.getHours() + hours);

    await db
      .update(users)
      .set({
        mutedUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await notificationService.create({
      userId,
      type: "system",
      content: `Your account has been muted for ${hours} hours for: ${reason}`,
    });
  }

  // Suspend a user
  private async suspendUser(userId: string, hours: number, reason: string): Promise<void> {
    const suspendedUntil = new Date();
    suspendedUntil.setHours(suspendedUntil.getHours() + hours);

    await db
      .update(users)
      .set({
        suspendedUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await notificationService.create({
      userId,
      type: "system",
      content: `Your account has been suspended for ${hours} hours for: ${reason}`,
    });
  }

  // Ban a user permanently
  private async banUser(userId: string, reason: string): Promise<void> {
    await db
      .update(users)
      .set({
        isBanned: true,
        banReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Check if user is muted
  async isUserMuted(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.mutedUntil) return false;
    return user.mutedUntil > new Date();
  }

  // Check if user is suspended
  async isUserSuspended(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.suspendedUntil) return false;
    return user.suspendedUntil > new Date();
  }

  // Check if user is banned
  async isUserBanned(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return user?.isBanned || false;
  }

  // Delete a bleat (moderation)
  async deleteBleat(bleatId: string, moderatorId: string, reason: string): Promise<boolean> {
    const bleat = await db.query.bleats.findFirst({
      where: eq(bleats.id, bleatId),
    });

    if (!bleat) return false;

    await db
      .update(bleats)
      .set({
        isDeleted: true,
        content: "[Content removed by moderator]",
        updatedAt: new Date(),
      })
      .where(eq(bleats.id, bleatId));

    // Notify the user
    await notificationService.create({
      userId: bleat.authorId,
      type: "system",
      content: `Your bleat was removed for: ${reason}`,
      relatedId: bleatId,
    });

    return true;
  }

  // Get user's moderation history
  async getUserModerationHistory(userId: string): Promise<{
    warnings: number;
    mutes: number;
    suspensions: number;
    reportsAgainst: number;
    reportsFiled: number;
  }> {
    const [{ reportsAgainst }] = await db
      .select({ reportsAgainst: sql<number>`count(*)` })
      .from(reports)
      .where(
        and(eq(reports.targetType, "user"), eq(reports.targetId, userId))
      );

    const [{ reportsFiled }] = await db
      .select({ reportsFiled: sql<number>`count(*)` })
      .from(reports)
      .where(eq(reports.reporterId, userId));

    // Would need a moderation_actions table for full history
    return {
      warnings: 0,
      mutes: 0,
      suspensions: 0,
      reportsAgainst: Number(reportsAgainst),
      reportsFiled: Number(reportsFiled),
    };
  }

  // Content filter - check for prohibited content
  async checkContent(content: string): Promise<{
    allowed: boolean;
    flagged: string[];
  }> {
    const flagged: string[] = [];

    // Basic profanity filter (would use a proper list in production)
    const prohibitedPatterns = [
      // Add prohibited patterns here
    ];

    // URL filter for phishing/malicious links
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urls = content.match(urlPattern) || [];
    // Would check URLs against blocklist

    // Spam detection (repeated characters, etc.)
    if (/(.)\1{10,}/.test(content)) {
      flagged.push("spam_repeated_chars");
    }

    // All caps detection
    const uppercaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (content.length > 20 && uppercaseRatio > 0.7) {
      flagged.push("excessive_caps");
    }

    return {
      allowed: flagged.length === 0,
      flagged,
    };
  }

  // Appeal a moderation decision
  async createAppeal(
    userId: string,
    reportId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    const report = await db.query.reports.findFirst({
      where: eq(reports.id, reportId),
    });

    if (!report) {
      return { success: false, message: "Report not found" };
    }

    if (report.targetId !== userId) {
      return { success: false, message: "Cannot appeal this report" };
    }

    // Would create an appeal record
    // For now, just update the report status
    await db
      .update(reports)
      .set({
        status: "reviewing",
        updatedAt: new Date(),
      })
      .where(eq(reports.id, reportId));

    return { success: true, message: "Appeal submitted for review" };
  }

  // Get user's reports
  async getUserReports(userId: string): Promise<typeof reports.$inferSelect[]> {
    return db
      .select()
      .from(reports)
      .where(eq(reports.reporterId, userId))
      .orderBy(desc(reports.createdAt));
  }
}

export const moderationService = new ModerationService();
