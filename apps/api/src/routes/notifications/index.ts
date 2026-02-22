import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { notificationService } from "../../services/notification.js";

const paginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

const markReadBody = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
});

type PaginationQuery = z.infer<typeof paginationQuery>;
type MarkReadBody = z.infer<typeof markReadBody>;

export async function notificationRoutes(fastify: FastifyInstance) {
  // Get notifications for current user
  fastify.get<{ Querystring: PaginationQuery }>("/notifications", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Notifications"],
      description: "Get notifications for current user",
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          cursor: { type: "string" },
          limit: { type: "number", minimum: 1, maximum: 50 },
          unreadOnly: { type: "boolean" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
    const queryValidation = paginationQuery.safeParse(request.query);

    try {
      const result = await notificationService.getForUser(
        request.user.userId,
        queryValidation.success ? queryValidation.data.cursor : undefined,
        queryValidation.success ? queryValidation.data.limit : 20,
        queryValidation.success ? queryValidation.data.unreadOnly : false
      );

      return reply.send({
        success: true,
        data: result.notifications,
        meta: {
          nextCursor: result.nextCursor,
          unreadCount: result.unreadCount,
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch notifications",
        },
      });
    }
  });

  // Get unread notification count
  fastify.get("/notifications/unread-count", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Notifications"],
      description: "Get unread notification count",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply: FastifyReply) => {
    try {
      const count = await notificationService.getUnreadCount(request.user.userId);

      return reply.send({
        success: true,
        data: { unreadCount: count },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch unread count",
        },
      });
    }
  });

  // Mark notifications as read
  fastify.post<{ Body: MarkReadBody }>("/notifications/mark-read", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Notifications"],
      description: "Mark notifications as read (all if no IDs provided)",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        properties: {
          notificationIds: {
            type: "array",
            items: { type: "string", format: "uuid" },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: MarkReadBody }>, reply: FastifyReply) => {
    const validation = markReadBody.safeParse(request.body);

    try {
      await notificationService.markAsRead(
        request.user.userId,
        validation.success ? validation.data.notificationIds : undefined
      );

      return reply.send({
        success: true,
        data: { message: "Notifications marked as read" },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "UPDATE_FAILED",
          message: "Failed to mark notifications as read",
        },
      });
    }
  });
}
