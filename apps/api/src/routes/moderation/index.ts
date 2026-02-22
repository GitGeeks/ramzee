import { type FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { moderationService } from "../../services/index.js";

const createReportSchema = z.object({
  targetType: z.enum(["bleat", "user", "herd", "message"]),
  targetId: z.string().uuid(),
  reason: z.enum([
    "spam",
    "harassment",
    "hate_speech",
    "violence",
    "nudity",
    "misinformation",
    "impersonation",
    "copyright",
    "other",
  ]),
  description: z.string().max(1000).optional(),
});

const updateReportSchema = z.object({
  status: z.enum(["pending", "reviewing", "resolved", "dismissed"]),
  resolution: z.string().max(1000).optional(),
});

const moderationActionSchema = z.object({
  type: z.enum(["warn", "mute", "suspend", "ban", "delete_content"]),
  targetUserId: z.string().uuid(),
  duration: z.number().min(1).max(8760).optional(), // up to 1 year in hours
  reason: z.string().min(1).max(500),
});

const appealSchema = z.object({
  reportId: z.string().uuid(),
  reason: z.string().min(10).max(1000),
});

export const moderationRoutes: FastifyPluginAsync = async (fastify) => {
  // Create a report
  fastify.post("/reports", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const body = createReportSchema.parse(request.body);

      const report = await moderationService.createReport({
        reporterId: request.user.userId,
        ...body,
      });

      return reply.status(201).send({
        success: true,
        data: report,
      });
    },
  });

  // Get my reports
  fastify.get("/me/reports", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const reports = await moderationService.getUserReports(request.user.userId);

      return reply.send({
        success: true,
        data: reports,
      });
    },
  });

  // Appeal a report/action
  fastify.post("/appeals", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const body = appealSchema.parse(request.body);

      const result = await moderationService.createAppeal(
        request.user.userId,
        body.reportId,
        body.reason
      );

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: "APPEAL_FAILED", message: result.message },
        });
      }

      return reply.send({
        success: true,
        message: result.message,
      });
    },
  });

  // Admin/Moderator routes
  // Get all reports (moderators only)
  fastify.get<{
    Querystring: {
      status?: "pending" | "reviewing" | "resolved" | "dismissed";
      type?: "bleat" | "user" | "herd" | "message";
      cursor?: string;
      limit?: string;
    };
  }>("/admin/reports", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      // TODO: Add role check for moderator/admin
      const { status, type, cursor, limit } = request.query;

      const result = await moderationService.getReports(
        status,
        type,
        cursor,
        limit ? parseInt(limit, 10) : undefined
      );

      return reply.send({
        success: true,
        data: result.reports,
        pagination: {
          nextCursor: result.nextCursor,
        },
      });
    },
  });

  // Update report status (moderators only)
  fastify.patch<{ Params: { reportId: string } }>("/admin/reports/:reportId", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      // TODO: Add role check for moderator/admin
      const { reportId } = request.params;
      const body = updateReportSchema.parse(request.body);

      const updated = await moderationService.updateReportStatus(
        reportId,
        body.status,
        request.user.userId,
        body.resolution
      );

      if (!updated) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Report not found" },
        });
      }

      return reply.send({
        success: true,
        data: updated,
      });
    },
  });

  // Take moderation action (moderators only)
  fastify.post("/admin/actions", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      // TODO: Add role check for moderator/admin
      const body = moderationActionSchema.parse(request.body);

      const success = await moderationService.takeAction({
        ...body,
        moderatorId: request.user.userId,
      });

      if (!success) {
        return reply.status(400).send({
          success: false,
          error: { code: "ACTION_FAILED", message: "Failed to take moderation action" },
        });
      }

      return reply.send({
        success: true,
        message: "Moderation action taken successfully",
      });
    },
  });

  // Delete bleat (moderators only)
  fastify.delete<{ Params: { bleatId: string }; Body: { reason: string } }>(
    "/admin/bleats/:bleatId",
    {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {
        // TODO: Add role check for moderator/admin
        const { bleatId } = request.params;
        const { reason } = request.body as { reason: string };

        const deleted = await moderationService.deleteBleat(
          bleatId,
          request.user.userId,
          reason || "Violation of community guidelines"
        );

        if (!deleted) {
          return reply.status(404).send({
            success: false,
            error: { code: "NOT_FOUND", message: "Bleat not found" },
          });
        }

        return reply.status(204).send();
      },
    }
  );

  // Get user moderation history (moderators only)
  fastify.get<{ Params: { userId: string } }>("/admin/users/:userId/history", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      // TODO: Add role check for moderator/admin
      const { userId } = request.params;

      const history = await moderationService.getUserModerationHistory(userId);

      return reply.send({
        success: true,
        data: history,
      });
    },
  });

  // Check content before posting (optional pre-check)
  fastify.post("/content/check", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { content } = request.body as { content: string };

      if (!content) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Content is required" },
        });
      }

      const result = await moderationService.checkContent(content);

      return reply.send({
        success: true,
        data: result,
      });
    },
  });

  // Get my moderation status
  fastify.get("/me/moderation-status", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const [isMuted, isSuspended, isBanned] = await Promise.all([
        moderationService.isUserMuted(request.user.userId),
        moderationService.isUserSuspended(request.user.userId),
        moderationService.isUserBanned(request.user.userId),
      ]);

      return reply.send({
        success: true,
        data: {
          isMuted,
          isSuspended,
          isBanned,
          canPost: !isMuted && !isSuspended && !isBanned,
        },
      });
    },
  });
};
