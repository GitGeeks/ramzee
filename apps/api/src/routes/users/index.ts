import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";

const getUserParams = z.object({
  username: z.string(),
});

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(160).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  fleeceColor: z.string().optional(),
  hornStyle: z.string().optional(),
});

type GetUserParams = z.infer<typeof getUserParams>;
type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function userRoutes(fastify: FastifyInstance) {
  // Get user profile
  fastify.get<{ Params: GetUserParams }>("/users/:username", {
    onRequest: [fastify.optionalAuth],
    schema: {
      tags: ["Users"],
      description: "Get user profile by username",
      params: {
        type: "object",
        properties: {
          username: { type: "string" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: GetUserParams }>, reply: FastifyReply) => {
    const validation = getUserParams.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid username",
        },
      });
    }

    // TODO: Fetch user profile
    // Check block status
    // Calculate isGrazing status

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Get user not yet implemented",
      },
    });
  });

  // Update user profile
  fastify.patch<{ Body: UpdateProfileInput }>("/users/me", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Users"],
      description: "Update current user profile",
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Body: UpdateProfileInput }>, reply: FastifyReply) => {
    const validation = updateProfileSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: validation.error.flatten(),
        },
      });
    }

    // TODO: Update user profile in database

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Update profile not yet implemented",
      },
    });
  });

  // Get user's bleats
  fastify.get<{ Params: GetUserParams }>("/users/:username/bleats", {
    onRequest: [fastify.optionalAuth],
    schema: {
      tags: ["Users"],
      description: "Get bleats by user",
    },
  }, async (_request, reply: FastifyReply) => {
    // TODO: Fetch user's bleats with pagination

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Get user bleats not yet implemented",
      },
    });
  });

  // Get user's flock (followers)
  fastify.get<{ Params: GetUserParams }>("/users/:username/flock", {
    onRequest: [fastify.optionalAuth],
    schema: {
      tags: ["Users"],
      description: "Get user's flock (followers)",
    },
  }, async (_request, reply: FastifyReply) => {
    // TODO: Fetch followers with pagination

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Get flock not yet implemented",
      },
    });
  });

  // Get who user is grazing (following)
  fastify.get<{ Params: GetUserParams }>("/users/:username/grazing", {
    onRequest: [fastify.optionalAuth],
    schema: {
      tags: ["Users"],
      description: "Get users this user is grazing (following)",
    },
  }, async (_request, reply: FastifyReply) => {
    // TODO: Fetch following with pagination

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Get grazing not yet implemented",
      },
    });
  });

  // Graze (follow) a user
  fastify.post<{ Params: GetUserParams }>("/users/:username/graze", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Graze (follow) a user",
      security: [{ bearerAuth: [] }],
    },
  }, async (_request, reply: FastifyReply) => {
    // TODO: Create graze relationship
    // Update counters
    // Create notification
    // Award points

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Graze not yet implemented",
      },
    });
  });

  // Ungraze (unfollow) a user
  fastify.delete<{ Params: GetUserParams }>("/users/:username/graze", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Ungraze (unfollow) a user",
      security: [{ bearerAuth: [] }],
    },
  }, async (_request, reply: FastifyReply) => {
    // TODO: Remove graze relationship
    // Update counters

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Ungraze not yet implemented",
      },
    });
  });

  // Block a user
  fastify.post<{ Params: GetUserParams }>("/users/:username/block", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Block a user",
      security: [{ bearerAuth: [] }],
    },
  }, async (_request, reply: FastifyReply) => {
    // TODO: Create block
    // Remove any grazes
    // Remove from conversations

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Block not yet implemented",
      },
    });
  });

  // Unblock a user
  fastify.delete<{ Params: GetUserParams }>("/users/:username/block", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Unblock a user",
      security: [{ bearerAuth: [] }],
    },
  }, async (_request, reply: FastifyReply) => {
    // TODO: Remove block

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Unblock not yet implemented",
      },
    });
  });
}
