import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { socialService } from "../../services/social.js";
import { userService } from "../../services/user.js";
import { bleatService } from "../../services/bleat.js";

const getUserParams = z.object({
  username: z.string(),
});

const userIdParams = z.object({
  userId: z.string().uuid(),
});

const paginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
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
type UserIdParams = z.infer<typeof userIdParams>;
type PaginationQuery = z.infer<typeof paginationQuery>;
type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function userRoutes(fastify: FastifyInstance) {
  // ==================== USER PROFILES ====================

  // Get user profile by username
  fastify.get<{ Params: GetUserParams }>("/users/by-username/:username", {
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

    try {
      const user = await userService.getByUsername(validation.data.username);

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "User not found",
          },
        });
      }

      // Get relationship if viewer is authenticated
      let relationship;
      if (request.user?.userId) {
        relationship = await socialService.getRelationship(
          request.user.userId,
          user.id
        );
      }

      return reply.send({
        success: true,
        data: {
          ...user,
          relationship,
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch user",
        },
      });
    }
  });

  // Get user profile by ID
  fastify.get<{ Params: UserIdParams }>("/users/:userId", {
    onRequest: [fastify.optionalAuth],
    schema: {
      tags: ["Users"],
      description: "Get user profile by ID",
      params: {
        type: "object",
        properties: {
          userId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
    const validation = userIdParams.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid user ID",
        },
      });
    }

    try {
      const user = await userService.getById(validation.data.userId);

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "User not found",
          },
        });
      }

      // Get relationship if viewer is authenticated
      let relationship;
      if (request.user?.userId && request.user.userId !== user.id) {
        relationship = await socialService.getRelationship(
          request.user.userId,
          user.id
        );
      }

      return reply.send({
        success: true,
        data: {
          ...user,
          relationship,
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch user",
        },
      });
    }
  });

  // Update current user profile
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

    try {
      const user = await userService.updateProfile(
        request.user.userId,
        validation.data
      );

      return reply.send({
        success: true,
        data: user,
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "UPDATE_FAILED",
          message: "Failed to update profile",
        },
      });
    }
  });

  // ==================== USER BLEATS ====================

  // Get user's bleats
  fastify.get<{ Params: UserIdParams; Querystring: PaginationQuery }>("/users/:userId/bleats", {
    onRequest: [fastify.optionalAuth],
    schema: {
      tags: ["Users"],
      description: "Get bleats by user",
      params: {
        type: "object",
        properties: {
          userId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: UserIdParams; Querystring: PaginationQuery }>, reply: FastifyReply) => {
    const paramsValidation = userIdParams.safeParse(request.params);
    const queryValidation = paginationQuery.safeParse(request.query);

    if (!paramsValidation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid user ID",
        },
      });
    }

    try {
      const result = await bleatService.getUserBleats(
        paramsValidation.data.userId,
        queryValidation.success ? queryValidation.data.cursor : undefined,
        queryValidation.success ? queryValidation.data.limit : 20,
        request.user?.userId
      );

      return reply.send({
        success: true,
        data: result.bleats,
        meta: {
          nextCursor: result.nextCursor,
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch bleats",
        },
      });
    }
  });

  // ==================== SOCIAL: GRAZES (FOLLOWS) ====================

  // Get user's followers (grazers/flock)
  fastify.get<{ Params: UserIdParams; Querystring: PaginationQuery }>("/users/:userId/grazers", {
    onRequest: [fastify.optionalAuth],
    schema: {
      tags: ["Social"],
      description: "Get user's followers (flock)",
      params: {
        type: "object",
        properties: {
          userId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: UserIdParams; Querystring: PaginationQuery }>, reply: FastifyReply) => {
    const paramsValidation = userIdParams.safeParse(request.params);
    const queryValidation = paginationQuery.safeParse(request.query);

    if (!paramsValidation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid user ID",
        },
      });
    }

    try {
      const result = await socialService.getGrazers(
        paramsValidation.data.userId,
        queryValidation.success ? queryValidation.data.cursor : undefined,
        queryValidation.success ? queryValidation.data.limit : 20
      );

      return reply.send({
        success: true,
        data: result.users,
        meta: {
          nextCursor: result.nextCursor,
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch followers",
        },
      });
    }
  });

  // Get users that user follows (grazing)
  fastify.get<{ Params: UserIdParams; Querystring: PaginationQuery }>("/users/:userId/grazing", {
    onRequest: [fastify.optionalAuth],
    schema: {
      tags: ["Social"],
      description: "Get users this user is following",
      params: {
        type: "object",
        properties: {
          userId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: UserIdParams; Querystring: PaginationQuery }>, reply: FastifyReply) => {
    const paramsValidation = userIdParams.safeParse(request.params);
    const queryValidation = paginationQuery.safeParse(request.query);

    if (!paramsValidation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid user ID",
        },
      });
    }

    try {
      const result = await socialService.getGrazing(
        paramsValidation.data.userId,
        queryValidation.success ? queryValidation.data.cursor : undefined,
        queryValidation.success ? queryValidation.data.limit : 20
      );

      return reply.send({
        success: true,
        data: result.users,
        meta: {
          nextCursor: result.nextCursor,
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch following",
        },
      });
    }
  });

  // Follow (graze) a user
  fastify.post<{ Params: UserIdParams }>("/users/:userId/graze", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Follow (graze) a user",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          userId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
    const validation = userIdParams.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid user ID",
        },
      });
    }

    try {
      const grazed = await socialService.graze(
        request.user.userId,
        validation.data.userId
      );

      if (!grazed) {
        return reply.status(409).send({
          success: false,
          error: {
            code: "GRAZE_FAILED",
            message: "Cannot follow this user (already following, blocked, or self)",
          },
        });
      }

      return reply.send({
        success: true,
        data: { message: "Now following user" },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "GRAZE_FAILED",
          message: "Failed to follow user",
        },
      });
    }
  });

  // Unfollow (ungraze) a user
  fastify.delete<{ Params: UserIdParams }>("/users/:userId/graze", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Unfollow (ungraze) a user",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          userId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
    const validation = userIdParams.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid user ID",
        },
      });
    }

    try {
      const ungrazed = await socialService.ungraze(
        request.user.userId,
        validation.data.userId
      );

      if (!ungrazed) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_GRAZING",
            message: "You are not following this user",
          },
        });
      }

      return reply.send({
        success: true,
        data: { message: "Unfollowed user" },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "UNGRAZE_FAILED",
          message: "Failed to unfollow user",
        },
      });
    }
  });

  // ==================== SOCIAL: BLOCKS ====================

  // Block a user
  fastify.post<{ Params: UserIdParams }>("/users/:userId/block", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Block a user",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          userId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
    const validation = userIdParams.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid user ID",
        },
      });
    }

    try {
      const blocked = await socialService.block(
        request.user.userId,
        validation.data.userId
      );

      if (!blocked) {
        return reply.status(409).send({
          success: false,
          error: {
            code: "BLOCK_FAILED",
            message: "Cannot block this user (already blocked or self)",
          },
        });
      }

      return reply.send({
        success: true,
        data: { message: "User blocked" },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "BLOCK_FAILED",
          message: "Failed to block user",
        },
      });
    }
  });

  // Unblock a user
  fastify.delete<{ Params: UserIdParams }>("/users/:userId/block", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Unblock a user",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          userId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
    const validation = userIdParams.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid user ID",
        },
      });
    }

    try {
      const unblocked = await socialService.unblock(
        request.user.userId,
        validation.data.userId
      );

      if (!unblocked) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_BLOCKED",
            message: "This user is not blocked",
          },
        });
      }

      return reply.send({
        success: true,
        data: { message: "User unblocked" },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "UNBLOCK_FAILED",
          message: "Failed to unblock user",
        },
      });
    }
  });

  // Get blocked users list
  fastify.get<{ Querystring: PaginationQuery }>("/users/me/blocked", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Get your blocked users list",
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
    const queryValidation = paginationQuery.safeParse(request.query);

    try {
      const result = await socialService.getBlockedUsers(
        request.user.userId,
        queryValidation.success ? queryValidation.data.cursor : undefined,
        queryValidation.success ? queryValidation.data.limit : 20
      );

      return reply.send({
        success: true,
        data: result.users,
        meta: {
          nextCursor: result.nextCursor,
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch blocked users",
        },
      });
    }
  });

  // ==================== SOCIAL: MUTES ====================

  // Mute a user
  fastify.post<{ Params: UserIdParams }>("/users/:userId/mute", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Mute a user",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          userId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
    const validation = userIdParams.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid user ID",
        },
      });
    }

    try {
      const muted = await socialService.mute(
        request.user.userId,
        validation.data.userId
      );

      if (!muted) {
        return reply.status(409).send({
          success: false,
          error: {
            code: "MUTE_FAILED",
            message: "Cannot mute this user (already muted or self)",
          },
        });
      }

      return reply.send({
        success: true,
        data: { message: "User muted" },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "MUTE_FAILED",
          message: "Failed to mute user",
        },
      });
    }
  });

  // Unmute a user
  fastify.delete<{ Params: UserIdParams }>("/users/:userId/mute", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Unmute a user",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          userId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
    const validation = userIdParams.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid user ID",
        },
      });
    }

    try {
      const unmuted = await socialService.unmute(
        request.user.userId,
        validation.data.userId
      );

      if (!unmuted) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_MUTED",
            message: "This user is not muted",
          },
        });
      }

      return reply.send({
        success: true,
        data: { message: "User unmuted" },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "UNMUTE_FAILED",
          message: "Failed to unmute user",
        },
      });
    }
  });

  // Get muted users list
  fastify.get<{ Querystring: PaginationQuery }>("/users/me/muted", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Get your muted users list",
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
    const queryValidation = paginationQuery.safeParse(request.query);

    try {
      const result = await socialService.getMutedUsers(
        request.user.userId,
        queryValidation.success ? queryValidation.data.cursor : undefined,
        queryValidation.success ? queryValidation.data.limit : 20
      );

      return reply.send({
        success: true,
        data: result.users,
        meta: {
          nextCursor: result.nextCursor,
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch muted users",
        },
      });
    }
  });

  // ==================== SOCIAL: RELATIONSHIP & SUGGESTIONS ====================

  // Get relationship with a user
  fastify.get<{ Params: UserIdParams }>("/users/:userId/relationship", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Get relationship status with a user",
      security: [{ bearerAuth: [] }],
      params: {
        type: "object",
        properties: {
          userId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
    const validation = userIdParams.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid user ID",
        },
      });
    }

    try {
      const relationship = await socialService.getRelationship(
        request.user.userId,
        validation.data.userId
      );

      return reply.send({
        success: true,
        data: relationship,
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch relationship",
        },
      });
    }
  });

  // Get suggested users to follow
  fastify.get<{ Querystring: { limit?: number } }>("/users/me/suggestions", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Social"],
      description: "Get suggested users to follow",
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          limit: { type: "number", minimum: 1, maximum: 50 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) => {
    try {
      const users = await socialService.getSuggestedUsers(
        request.user.userId,
        request.query.limit || 10
      );

      return reply.send({
        success: true,
        data: users,
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch suggestions",
        },
      });
    }
  });
}
