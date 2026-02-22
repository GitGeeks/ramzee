import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { bleatService } from "../../services/bleat.js";
import { createBleatSchema, getBleatParams, getFeedQuery } from "./schemas.js";
import type { CreateBleatInput, GetBleatParams, GetFeedQuery } from "./schemas.js";

export async function bleatRoutes(fastify: FastifyInstance) {
  // Create a bleat
  fastify.post<{ Body: CreateBleatInput }>("/bleats", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Bleats"],
      description: "Create a new bleat",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string", maxLength: 280 },
          bleatType: { type: "string", enum: ["text", "photo", "poll", "event"] },
          mediaUrls: { type: "array", items: { type: "string" } },
          parentBleatId: { type: "string", format: "uuid" },
          rebaaOfId: { type: "string", format: "uuid" },
          isIncognito: { type: "boolean" },
          herdId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: CreateBleatInput }>, reply: FastifyReply) => {
    const validation = createBleatSchema.safeParse(request.body);

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
      const bleat = await bleatService.create({
        authorId: request.user.userId,
        ...validation.data,
      });

      return reply.status(201).send({
        success: true,
        data: bleat,
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "CREATE_FAILED",
          message: "Failed to create bleat",
        },
      });
    }
  });

  // Get a single bleat
  fastify.get<{ Params: GetBleatParams }>("/bleats/:bleatId", {
    onRequest: [fastify.optionalAuth],
    schema: {
      tags: ["Bleats"],
      description: "Get a single bleat by ID",
      params: {
        type: "object",
        properties: {
          bleatId: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: GetBleatParams }>, reply: FastifyReply) => {
    const validation = getBleatParams.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid bleat ID",
        },
      });
    }

    try {
      const bleat = await bleatService.getById(
        validation.data.bleatId,
        request.user?.userId
      );

      if (!bleat) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Bleat not found",
          },
        });
      }

      return reply.send({
        success: true,
        data: bleat,
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch bleat",
        },
      });
    }
  });

  // Delete a bleat
  fastify.delete<{ Params: GetBleatParams }>("/bleats/:bleatId", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Bleats"],
      description: "Delete a bleat (soft delete)",
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Params: GetBleatParams }>, reply: FastifyReply) => {
    const validation = getBleatParams.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid bleat ID",
        },
      });
    }

    try {
      const deleted = await bleatService.delete(
        validation.data.bleatId,
        request.user.userId
      );

      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Bleat not found or not owned by you",
          },
        });
      }

      return reply.send({
        success: true,
        data: { message: "Bleat deleted successfully" },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "DELETE_FAILED",
          message: "Failed to delete bleat",
        },
      });
    }
  });

  // Huff (like) a bleat
  fastify.post<{ Params: GetBleatParams }>("/bleats/:bleatId/huff", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Bleats"],
      description: "Huff (like) a bleat",
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Params: GetBleatParams }>, reply: FastifyReply) => {
    const validation = getBleatParams.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid bleat ID",
        },
      });
    }

    try {
      const huffed = await bleatService.huff(
        validation.data.bleatId,
        request.user.userId
      );

      if (!huffed) {
        return reply.status(409).send({
          success: false,
          error: {
            code: "ALREADY_HUFFED",
            message: "You have already huffed this bleat",
          },
        });
      }

      return reply.send({
        success: true,
        data: { message: "Bleat huffed successfully" },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "HUFF_FAILED",
          message: "Failed to huff bleat",
        },
      });
    }
  });

  // Unhuff (unlike) a bleat
  fastify.delete<{ Params: GetBleatParams }>("/bleats/:bleatId/huff", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Bleats"],
      description: "Remove huff from a bleat",
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Params: GetBleatParams }>, reply: FastifyReply) => {
    const validation = getBleatParams.safeParse(request.params);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid bleat ID",
        },
      });
    }

    try {
      const unhuffed = await bleatService.unhuff(
        validation.data.bleatId,
        request.user.userId
      );

      if (!unhuffed) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_HUFFED",
            message: "You have not huffed this bleat",
          },
        });
      }

      return reply.send({
        success: true,
        data: { message: "Huff removed successfully" },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: {
          code: "UNHUFF_FAILED",
          message: "Failed to remove huff",
        },
      });
    }
  });

  // Get bleat replies
  fastify.get<{ Params: GetBleatParams; Querystring: GetFeedQuery }>("/bleats/:bleatId/replies", {
    onRequest: [fastify.optionalAuth],
    schema: {
      tags: ["Bleats"],
      description: "Get replies to a bleat",
      params: {
        type: "object",
        properties: {
          bleatId: { type: "string", format: "uuid" },
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
  }, async (request: FastifyRequest<{ Params: GetBleatParams; Querystring: GetFeedQuery }>, reply: FastifyReply) => {
    const paramsValidation = getBleatParams.safeParse(request.params);
    const queryValidation = getFeedQuery.safeParse(request.query);

    if (!paramsValidation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid bleat ID",
        },
      });
    }

    try {
      const result = await bleatService.getReplies(
        paramsValidation.data.bleatId,
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
          message: "Failed to fetch replies",
        },
      });
    }
  });
}
