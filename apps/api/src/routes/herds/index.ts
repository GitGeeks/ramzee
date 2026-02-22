import { type FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { herdService } from "../../services/index.js";

const createHerdSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  privacy: z.enum(["public", "private", "secret"]).optional(),
  iconUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

const updateHerdSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  privacy: z.enum(["public", "private", "secret"]).optional(),
  iconUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  rules: z.string().max(2000).optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(["admin", "moderator", "member"]),
});

export const herdRoutes: FastifyPluginAsync = async (fastify) => {
  // Create a new herd
  fastify.post("/herds", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const body = createHerdSchema.parse(request.body);

      const herd = await herdService.create({
        ...body,
        ownerId: request.user.userId,
      });

      return reply.status(201).send({
        success: true,
        data: herd,
      });
    },
  });

  // Get herd by ID
  fastify.get<{ Params: { herdId: string } }>("/herds/:herdId", {
    handler: async (request, reply) => {
      const { herdId } = request.params;
      const userId = request.user?.userId;

      const result = await herdService.getById(herdId, userId);

      if (!result) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Herd not found" },
        });
      }

      return reply.send({
        success: true,
        data: result,
      });
    },
  });

  // Update herd
  fastify.patch<{ Params: { herdId: string } }>("/herds/:herdId", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { herdId } = request.params;
      const body = updateHerdSchema.parse(request.body);

      const updated = await herdService.update(herdId, request.user.userId, body);

      if (!updated) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "Cannot update this herd" },
        });
      }

      return reply.send({
        success: true,
        data: updated,
      });
    },
  });

  // Delete herd
  fastify.delete<{ Params: { herdId: string } }>("/herds/:herdId", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { herdId } = request.params;

      const deleted = await herdService.delete(herdId, request.user.userId);

      if (!deleted) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "Cannot delete this herd" },
        });
      }

      return reply.status(204).send();
    },
  });

  // Join a herd
  fastify.post<{ Params: { herdId: string } }>("/herds/:herdId/join", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { herdId } = request.params;

      const joined = await herdService.join(herdId, request.user.userId);

      if (!joined) {
        return reply.status(400).send({
          success: false,
          error: { code: "JOIN_FAILED", message: "Cannot join this herd" },
        });
      }

      return reply.send({
        success: true,
        message: "Successfully joined herd",
      });
    },
  });

  // Leave a herd
  fastify.post<{ Params: { herdId: string } }>("/herds/:herdId/leave", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { herdId } = request.params;

      const left = await herdService.leave(herdId, request.user.userId);

      if (!left) {
        return reply.status(400).send({
          success: false,
          error: { code: "LEAVE_FAILED", message: "Cannot leave this herd" },
        });
      }

      return reply.send({
        success: true,
        message: "Successfully left herd",
      });
    },
  });

  // Get herd members
  fastify.get<{ Params: { herdId: string }; Querystring: { cursor?: string; limit?: string } }>(
    "/herds/:herdId/members",
    {
      handler: async (request, reply) => {
        const { herdId } = request.params;
        const { cursor, limit } = request.query;

        const result = await herdService.getMembers(
          herdId,
          cursor,
          limit ? parseInt(limit, 10) : undefined
        );

        return reply.send({
          success: true,
          data: result.members,
          pagination: {
            nextCursor: result.nextCursor,
          },
        });
      },
    }
  );

  // Update member role
  fastify.patch<{ Params: { herdId: string; userId: string } }>(
    "/herds/:herdId/members/:userId/role",
    {
      onRequest: [fastify.authenticate],
      handler: async (request, reply) => {
        const { herdId, userId: targetUserId } = request.params;
        const body = updateRoleSchema.parse(request.body);

        const updated = await herdService.updateMemberRole(
          herdId,
          targetUserId,
          request.user.userId,
          body.role
        );

        if (!updated) {
          return reply.status(403).send({
            success: false,
            error: { code: "FORBIDDEN", message: "Cannot update this member's role" },
          });
        }

        return reply.send({
          success: true,
          message: "Member role updated",
        });
      },
    }
  );

  // Remove member from herd
  fastify.delete<{ Params: { herdId: string; userId: string } }>("/herds/:herdId/members/:userId", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { herdId, userId: targetUserId } = request.params;

      const removed = await herdService.removeMember(herdId, targetUserId, request.user.userId);

      if (!removed) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "Cannot remove this member" },
        });
      }

      return reply.status(204).send();
    },
  });

  // Get herd feed
  fastify.get<{ Params: { herdId: string }; Querystring: { cursor?: string; limit?: string } }>(
    "/herds/:herdId/feed",
    {
      handler: async (request, reply) => {
        const { herdId } = request.params;
        const { cursor, limit } = request.query;
        const userId = request.user?.userId;

        const result = await herdService.getHerdFeed(
          herdId,
          cursor,
          limit ? parseInt(limit, 10) : undefined,
          userId
        );

        return reply.send({
          success: true,
          data: result.bleats,
          pagination: {
            nextCursor: result.nextCursor,
          },
        });
      },
    }
  );

  // Search herds
  fastify.get<{ Querystring: { q: string; cursor?: string; limit?: string } }>("/herds/search", {
    handler: async (request, reply) => {
      const { q, cursor, limit } = request.query;

      if (!q || q.trim().length === 0) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Search query is required" },
        });
      }

      const result = await herdService.search(
        q,
        cursor,
        limit ? parseInt(limit, 10) : undefined
      );

      return reply.send({
        success: true,
        data: result.herds,
        pagination: {
          nextCursor: result.nextCursor,
        },
      });
    },
  });

  // Get popular herds
  fastify.get<{ Querystring: { limit?: string } }>("/herds/popular", {
    handler: async (request, reply) => {
      const { limit } = request.query;

      const herds = await herdService.getPopular(limit ? parseInt(limit, 10) : undefined);

      return reply.send({
        success: true,
        data: herds,
      });
    },
  });

  // Get user's herds
  fastify.get("/me/herds", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const herds = await herdService.getUserHerds(request.user.userId);

      return reply.send({
        success: true,
        data: herds,
      });
    },
  });
};
