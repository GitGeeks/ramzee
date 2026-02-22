import { type FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { messageService } from "../../services/index.js";

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  mediaUrls: z.array(z.string().url()).max(4).optional(),
});

const createGroupSchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1).max(50),
  name: z.string().min(1).max(100).optional(),
});

export const messageRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all conversations
  fastify.get<{ Querystring: { cursor?: string; limit?: string } }>("/conversations", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { cursor, limit } = request.query;

      const result = await messageService.getConversations(
        request.user.userId,
        cursor,
        limit ? parseInt(limit, 10) : undefined
      );

      return reply.send({
        success: true,
        data: result.conversations,
        pagination: {
          nextCursor: result.nextCursor,
        },
      });
    },
  });

  // Get or create direct conversation with a user
  fastify.post<{ Params: { userId: string } }>("/conversations/direct/:userId", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { userId: targetUserId } = request.params;

      if (targetUserId === request.user.userId) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Cannot create conversation with yourself" },
        });
      }

      try {
        const conversationId = await messageService.getOrCreateDirectConversation(
          request.user.userId,
          targetUserId
        );

        return reply.send({
          success: true,
          data: { conversationId },
        });
      } catch (error) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "Cannot message this user" },
        });
      }
    },
  });

  // Create group conversation
  fastify.post("/conversations/group", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const body = createGroupSchema.parse(request.body);

      const conversationId = await messageService.createGroupConversation(
        request.user.userId,
        body.participantIds,
        body.name
      );

      return reply.status(201).send({
        success: true,
        data: { conversationId },
      });
    },
  });

  // Get messages in a conversation
  fastify.get<{ Params: { conversationId: string }; Querystring: { cursor?: string; limit?: string } }>(
    "/conversations/:conversationId/messages",
    {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {
        const { conversationId } = request.params;
        const { cursor, limit } = request.query;

        const result = await messageService.getMessages(
          conversationId,
          request.user.userId,
          cursor,
          limit ? parseInt(limit, 10) : undefined
        );

        return reply.send({
          success: true,
          data: result.messages,
          pagination: {
            nextCursor: result.nextCursor,
          },
        });
      },
    }
  );

  // Send a message
  fastify.post<{ Params: { conversationId: string } }>("/conversations/:conversationId/messages", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { conversationId } = request.params;
      const body = sendMessageSchema.parse(request.body);

      try {
        const message = await messageService.sendMessage({
          conversationId,
          senderId: request.user.userId,
          content: body.content,
          mediaUrls: body.mediaUrls,
        });

        // Broadcast to WebSocket if available
        if (fastify.websocketBroadcast) {
          // Get conversation participants to broadcast
          const result = await messageService.getMessages(conversationId, request.user.userId, undefined, 1);
          // Would broadcast to all participants here
        }

        return reply.status(201).send({
          success: true,
          data: message,
        });
      } catch (error) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "Cannot send message to this conversation" },
        });
      }
    },
  });

  // Mark conversation as read
  fastify.post<{ Params: { conversationId: string } }>("/conversations/:conversationId/read", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { conversationId } = request.params;

      await messageService.markAsRead(conversationId, request.user.userId);

      return reply.send({
        success: true,
        message: "Conversation marked as read",
      });
    },
  });

  // Delete a message
  fastify.delete<{ Params: { messageId: string } }>("/messages/:messageId", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { messageId } = request.params;

      const deleted = await messageService.deleteMessage(messageId, request.user.userId);

      if (!deleted) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "Cannot delete this message" },
        });
      }

      return reply.status(204).send();
    },
  });

  // Leave a group conversation
  fastify.post<{ Params: { conversationId: string } }>("/conversations/:conversationId/leave", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { conversationId } = request.params;

      const left = await messageService.leaveConversation(conversationId, request.user.userId);

      if (!left) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Cannot leave this conversation" },
        });
      }

      return reply.send({
        success: true,
        message: "Left conversation",
      });
    },
  });

  // Get total unread count
  fastify.get("/messages/unread-count", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const count = await messageService.getTotalUnreadCount(request.user.userId);

      return reply.send({
        success: true,
        data: { unreadCount: count },
      });
    },
  });
};
