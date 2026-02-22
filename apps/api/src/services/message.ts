import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { db } from "@ramzee/database";
import { conversations, conversationParticipants, messages, users, blocks } from "@ramzee/database/schema";

interface CreateMessageInput {
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrls?: string[];
}

interface ConversationWithDetails {
  conversation: typeof conversations.$inferSelect;
  participants: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }[];
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: Date;
  };
  unreadCount: number;
}

export class MessageService {
  // Get or create a direct conversation between two users
  async getOrCreateDirectConversation(userId1: string, userId2: string): Promise<string> {
    // Check if blocked
    const blocked = await db.query.blocks.findFirst({
      where: or(
        and(eq(blocks.blockerId, userId1), eq(blocks.blockedId, userId2)),
        and(eq(blocks.blockerId, userId2), eq(blocks.blockedId, userId1))
      ),
    });

    if (blocked) {
      throw new Error("Cannot message this user");
    }

    // Find existing direct conversation
    const existingConversations = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId1));

    for (const { conversationId } of existingConversations) {
      const conv = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, conversationId),
          eq(conversations.isGroup, false)
        ),
      });

      if (!conv) continue;

      const otherParticipant = await db.query.conversationParticipants.findFirst({
        where: and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId2)
        ),
      });

      if (otherParticipant) {
        return conversationId;
      }
    }

    // Create new direct conversation
    const [conversation] = await db
      .insert(conversations)
      .values({
        isGroup: false,
      })
      .returning();

    // Add both participants
    await db.insert(conversationParticipants).values([
      { conversationId: conversation.id, userId: userId1 },
      { conversationId: conversation.id, userId: userId2 },
    ]);

    return conversation.id;
  }

  // Create a group conversation
  async createGroupConversation(
    creatorId: string,
    participantIds: string[],
    name?: string
  ): Promise<string> {
    // Filter out blocked users
    const blockedByCreator = await db
      .select({ blockedId: blocks.blockedId })
      .from(blocks)
      .where(eq(blocks.blockerId, creatorId));

    const blockedIds = new Set(blockedByCreator.map((b) => b.blockedId));
    const validParticipants = participantIds.filter((id) => !blockedIds.has(id) && id !== creatorId);

    const [conversation] = await db
      .insert(conversations)
      .values({
        isGroup: true,
        name,
      })
      .returning();

    // Add all participants including creator
    const allParticipants = [creatorId, ...validParticipants];
    await db.insert(conversationParticipants).values(
      allParticipants.map((userId) => ({
        conversationId: conversation.id,
        userId,
      }))
    );

    return conversation.id;
  }

  // Send a message
  async sendMessage(input: CreateMessageInput): Promise<typeof messages.$inferSelect> {
    // Verify sender is a participant
    const participant = await db.query.conversationParticipants.findFirst({
      where: and(
        eq(conversationParticipants.conversationId, input.conversationId),
        eq(conversationParticipants.userId, input.senderId)
      ),
    });

    if (!participant) {
      throw new Error("Not a participant of this conversation");
    }

    const [message] = await db
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        senderId: input.senderId,
        content: input.content,
        mediaUrls: input.mediaUrls,
      })
      .returning();

    // Update conversation's last message timestamp
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, input.conversationId));

    return message;
  }

  // Get messages in a conversation
  async getMessages(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit = 50
  ): Promise<{
    messages: {
      message: typeof messages.$inferSelect;
      sender: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      } | null;
    }[];
    nextCursor?: string;
  }> {
    // Verify user is a participant
    const participant = await db.query.conversationParticipants.findFirst({
      where: and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      ),
    });

    if (!participant) {
      return { messages: [] };
    }

    const results = await db
      .select({
        message: messages,
        sender: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isDeleted, false),
          cursor ? sql`${messages.createdAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;

    return {
      messages: data,
      nextCursor: hasMore ? data[data.length - 1].message.createdAt.toISOString() : undefined,
    };
  }

  // Get user's conversations
  async getConversations(
    userId: string,
    cursor?: string,
    limit = 20
  ): Promise<{
    conversations: ConversationWithDetails[];
    nextCursor?: string;
  }> {
    // Get user's conversation IDs
    const userConversations = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    if (userConversations.length === 0) {
      return { conversations: [] };
    }

    const conversationIds = userConversations.map((c) => c.conversationId);

    const convs = await db
      .select()
      .from(conversations)
      .where(
        and(
          inArray(conversations.id, conversationIds),
          cursor ? sql`${conversations.lastMessageAt} < ${cursor}` : undefined
        )
      )
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit + 1);

    const hasMore = convs.length > limit;
    const data = hasMore ? convs.slice(0, -1) : convs;

    // Get details for each conversation
    const conversationsWithDetails: ConversationWithDetails[] = await Promise.all(
      data.map(async (conv) => {
        // Get participants
        const participants = await db
          .select({
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
          })
          .from(conversationParticipants)
          .innerJoin(users, eq(conversationParticipants.userId, users.id))
          .where(
            and(
              eq(conversationParticipants.conversationId, conv.id),
              sql`${conversationParticipants.userId} != ${userId}`
            )
          );

        // Get last message
        const lastMessage = await db.query.messages.findFirst({
          where: eq(messages.conversationId, conv.id),
          orderBy: [desc(messages.createdAt)],
        });

        // Get unread count
        const participant = await db.query.conversationParticipants.findFirst({
          where: and(
            eq(conversationParticipants.conversationId, conv.id),
            eq(conversationParticipants.userId, userId)
          ),
        });

        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conv.id),
              sql`${messages.senderId} != ${userId}`,
              participant?.lastReadAt
                ? sql`${messages.createdAt} > ${participant.lastReadAt}`
                : sql`1=1`
            )
          );

        return {
          conversation: conv,
          participants,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt,
              }
            : undefined,
          unreadCount: Number(count),
        };
      })
    );

    return {
      conversations: conversationsWithDetails,
      nextCursor: hasMore && data.length > 0
        ? data[data.length - 1].lastMessageAt?.toISOString()
        : undefined,
    };
  }

  // Mark conversation as read
  async markAsRead(conversationId: string, userId: string): Promise<boolean> {
    const result = await db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );

    return result.rowCount > 0;
  }

  // Delete a message (soft delete)
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });

    if (!message || message.senderId !== userId) {
      return false;
    }

    await db
      .update(messages)
      .set({ isDeleted: true, content: "[Message deleted]" })
      .where(eq(messages.id, messageId));

    return true;
  }

  // Leave a group conversation
  async leaveConversation(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation || !conversation.isGroup) {
      return false;
    }

    const result = await db
      .delete(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );

    return result.rowCount > 0;
  }

  // Get total unread message count
  async getTotalUnreadCount(userId: string): Promise<number> {
    const userConversations = await db
      .select({
        conversationId: conversationParticipants.conversationId,
        lastReadAt: conversationParticipants.lastReadAt,
      })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    if (userConversations.length === 0) {
      return 0;
    }

    let totalUnread = 0;

    for (const { conversationId, lastReadAt } of userConversations) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            sql`${messages.senderId} != ${userId}`,
            lastReadAt ? sql`${messages.createdAt} > ${lastReadAt}` : sql`1=1`
          )
        );

      totalUnread += Number(count);
    }

    return totalUnread;
  }
}

export const messageService = new MessageService();
