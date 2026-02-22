import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { feedService } from "../../services/feed.js";
import { bleatService } from "../../services/bleat.js";

const paginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});

const meadowQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  filter: z.enum(["trending", "latest", "top"]).optional().default("trending"),
});

const ramtagParams = z.object({
  tag: z.string().min(1).max(50),
});

type PaginationQuery = z.infer<typeof paginationQuery>;
type MeadowQuery = z.infer<typeof meadowQuery>;
type RamtagParams = z.infer<typeof ramtagParams>;

export async function feedRoutes(fastify: FastifyInstance) {
  // Get user's pasture (home feed) - bleats from users they graze
  fastify.get<{ Querystring: PaginationQuery }>("/feed/pasture", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Feed"],
      description: "Get user's pasture (home feed) - bleats from users they graze",
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          cursor: { type: "string" },
          limit: { type: "number", minimum: 1, maximum: 50 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
    const queryValidation = paginationQuery.safeParse(request.query);

    try {
      const result = await feedService.getPasture(
        request.user.userId,
        queryValidation.success ? queryValidation.data.cursor : undefined,
        queryValidation.success ? queryValidation.data.limit : 20
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
          message: "Failed to fetch pasture feed",
        },
      });
    }
  });

  // Get "For You" feed - algorithmic recommendations
  fastify.get<{ Querystring: PaginationQuery }>("/feed/foryou", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Feed"],
      description: "Get personalized 'For You' feed based on your interests",
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          cursor: { type: "string" },
          limit: { type: "number", minimum: 1, maximum: 50 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
    const queryValidation = paginationQuery.safeParse(request.query);

    try {
      const result = await feedService.getForYou(
        request.user.userId,
        queryValidation.success ? queryValidation.data.cursor : undefined,
        queryValidation.success ? queryValidation.data.limit : 20
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
          message: "Failed to fetch For You feed",
        },
      });
    }
  });

  // Get meadow (explore/trending) - popular bleats
  fastify.get<{ Querystring: MeadowQuery }>("/feed/meadow", {
    onRequest: [fastify.optionalAuth],
    schema: {
      tags: ["Feed"],
      description: "Get meadow (explore/trending) - popular bleats",
      querystring: {
        type: "object",
        properties: {
          cursor: { type: "string" },
          limit: { type: "number", minimum: 1, maximum: 50 },
          filter: { type: "string", enum: ["trending", "latest", "top"] },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: MeadowQuery }>, reply: FastifyReply) => {
    const queryValidation = meadowQuery.safeParse(request.query);

    try {
      const result = await feedService.getMeadow(
        request.user?.userId,
        queryValidation.success ? queryValidation.data.cursor : undefined,
        queryValidation.success ? queryValidation.data.limit : 20,
        queryValidation.success ? queryValidation.data.filter : "trending"
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
          message: "Failed to fetch meadow feed",
        },
      });
    }
  });

  // Get ramtag feed
  fastify.get<{ Params: RamtagParams; Querystring: PaginationQuery }>("/feed/ramtag/:tag", {
    onRequest: [fastify.optionalAuth],
    schema: {
      tags: ["Feed"],
      description: "Get bleats with a specific ramtag",
      params: {
        type: "object",
        properties: {
          tag: { type: "string" },
        },
      },
      querystring: {
        type: "object",
        properties: {
          cursor: { type: "string" },
          limit: { type: "number", minimum: 1, maximum: 50 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: RamtagParams; Querystring: PaginationQuery }>, reply: FastifyReply) => {
    const paramsValidation = ramtagParams.safeParse(request.params);
    const queryValidation = paginationQuery.safeParse(request.query);

    if (!paramsValidation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid ramtag",
        },
      });
    }

    try {
      const result = await bleatService.getBleatsByRamTag(
        paramsValidation.data.tag,
        queryValidation.success ? queryValidation.data.cursor : undefined,
        queryValidation.success ? queryValidation.data.limit : 20
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
          message: "Failed to fetch ramtag feed",
        },
      });
    }
  });

  // Get trending ramtags
  fastify.get<{ Querystring: { limit?: number } }>("/feed/ramtags/trending", {
    schema: {
      tags: ["Feed"],
      description: "Get trending ramtags",
      querystring: {
        type: "object",
        properties: {
          limit: { type: "number", minimum: 1, maximum: 20 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) => {
    try {
      const ramtags = await feedService.getTrendingRamtags(request.query.limit || 10);

      return reply.send({
        success: true,
        data: ramtags,
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch trending ramtags",
        },
      });
    }
  });
}
