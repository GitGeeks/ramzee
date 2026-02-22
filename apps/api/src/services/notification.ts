import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db } from "@ramzee/database";
import { notifications, users, bleats } from "@ramzee/database/schema";

export type NotificationType =
  | "huff" // Someone liked your bleat
  | "reply" // Someone replied to your bleat
  | "rebaa" // Someone rebaaed your bleat
  | "graze" // Someone followed you
  | "mention" // Someone mentioned you
  | "herd_invite" // Invited to join a herd
  | "herd_join" // Someone joined your herd
  | "badge" // Earned a new badge
  | "system"; // System notification

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  actorId?: string;
  bleatId?: string;
  herdId?: string;
  badgeId?: string;
  message?: string;
}

interface NotificationWithDetails {
  notification: typeof notifications.$inferSelect;
  actor?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  bleat?: {
    id: string;
    content: string;
  } | null;
}

export class NotificationService {
  // Create a notification
  async create(input: CreateNotificationInput): Promise<typeof notifications.$inferSelect> {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: input.userId,
        type: input.type,
        actorId: input.actorId,
        bleatId: input.bleatId,
        herdId: input.herdId,
        badgeId: input.badgeId,
        message: input.message,
      })
      .returning();

    return notification;
  }

  // Create notification for huff (like)
  async createHuffNotification(bleatId: string, actorId: string): Promise<void> {
    // Get the bleat author
    const bleat = await db.query.bleats.findFirst({
      where: eq(bleats.id, bleatId),
    });

    if (!bleat || bleat.authorId === actorId) return; // Don't notify self

    await this.create({
      userId: bleat.authorId,
      type: "huff",
      actorId,
      bleatId,
    });
  }

  // Create notification for reply
  async createReplyNotification(parentBleatId: string, replyId: string, actorId: string): Promise<void> {
    const parentBleat = await db.query.bleats.findFirst({
      where: eq(bleats.id, parentBleatId),
    });

    if (!parentBleat || parentBleat.authorId === actorId) return;

    await this.create({
      userId: parentBleat.authorId,
      type: "reply",
      actorId,
      bleatId: replyId,
    });
  }

  // Create notification for rebaa
  async createRebaaNotification(originalBleatId: string, actorId: string): Promise<void> {
    const originalBleat = await db.query.bleats.findFirst({
      where: eq(bleats.id, originalBleatId),
    });

    if (!originalBleat || originalBleat.authorId === actorId) return;

    await this.create({
      userId: originalBleat.authorId,
      type: "rebaa",
      actorId,
      bleatId: originalBleatId,
    });
  }

  // Create notification for follow
  async createGrazeNotification(followedUserId: string, actorId: string): Promise<void> {
    if (followedUserId === actorId) return;

    await this.create({
      userId: followedUserId,
      type: "graze",
      actorId,
    });
  }

  // Create notification for mention
  async createMentionNotification(bleatId: string, mentionedUserId: string, actorId: string): Promise<void> {
    if (mentionedUserId === actorId) return;

    await this.create({
      userId: mentionedUserId,
      type: "mention",
      actorId,
      bleatId,
    });
  }

  // Create notification for badge earned
  async createBadgeNotification(userId: string, badgeId: string, badgeName: string): Promise<void> {
    await this.create({
      userId,
      type: "badge",
      badgeId,
      message: `You earned the "${badgeName}" badge!`,
    });
  }

  // Get notifications for a user
  async getForUser(
    userId: string,
    cursor?: string,
    limit = 20,
    unreadOnly = false
  ): Promise<{ notifications: NotificationWithDetails[]; nextCursor?: string; unreadCount: number }> {
    // Get notifications
    const results = await db
      .select({
        notification: notifications,
        actor: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.actorId, users.id))
      .where(
        and(
          eq(notifications.userId, userId),
          unreadOnly ? eq(notifications.isRead, false) : undefined,
          cursor ? sql`${notifications.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const notificationsData = hasMore ? results.slice(0, -1) : results;

    // Get bleat content for bleat-related notifications
    const bleatIds = notificationsData
      .filter(n => n.notification.bleatId)
      .map(n => n.notification.bleatId as string);

    let bleatsMap = new Map<string, { id: string; content: string }>();
    if (bleatIds.length > 0) {
      const bleatData = await db
        .select({ id: bleats.id, content: bleats.content })
        .from(bleats)
        .where(inArray(bleats.id, bleatIds));
      bleatsMap = new Map(bleatData.map(b => [b.id, b]));
    }

    // Get unread count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return {
      notifications: notificationsData.map(n => ({
        notification: n.notification,
        actor: n.actor,
        bleat: n.notification.bleatId ? bleatsMap.get(n.notification.bleatId) : null,
      })),
      nextCursor: hasMore
        ? notificationsData[notificationsData.length - 1].notification.createdAt.toISOString()
        : undefined,
      unreadCount: Number(count),
    };
  }

  // Mark notifications as read
  async markAsRead(userId: string, notificationIds?: string[]): Promise<void> {
    if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.userId, userId),
            inArray(notifications.id, notificationIds)
          )
        );
    } else {
      // Mark all notifications as read
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));
    }
  }

  // Get unread count for a user
  async getUnreadCount(userId: string): Promise<number> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return Number(count);
  }

  // Delete old notifications (cleanup job)
  async deleteOldNotifications(daysOld = 30): Promise<number> {
    const result = await db
      .delete(notifications)
      .where(sql`${notifications.createdAt} < NOW() - INTERVAL '${daysOld} days'`);

    return result.rowCount || 0;
  }
}

export const notificationService = new NotificationService();
