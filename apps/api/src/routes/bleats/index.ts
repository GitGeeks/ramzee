import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
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
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" },
          },
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

    // TODO: Implement bleat creation
    // 1. Extract ramtags from content
    // 2. Create bleat in database
    // 3. Update counters if reply/rebaa
    // 4. Publish to feed service
    // 5. Award points

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Bleat creation not yet implemented",
      },
    });
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

    // TODO: Fetch bleat from database
    // Check if user is blocked
    // Include author info, huff status

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Get bleat not yet implemented",
      },
    });
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

    // TODO: Verify ownership
    // Soft delete bleat
    // Update counters

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Delete bleat not yet implemented",
      },
    });
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
    // TODO: Create huff
    // Increment counter
    // Award points to author

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Huff not yet implemented",
      },
    });
  });

  // Unhuff (unlike) a bleat
  fastify.delete<{ Params: GetBleatParams }>("/bleats/:bleatId/huff", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Bleats"],
      description: "Remove huff from a bleat",
      security: [{ bearerAuth: [] }],
    },
  }, async (_request, reply: FastifyReply) => {
    // TODO: Remove huff
    // Decrement counter

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Unhuff not yet implemented",
      },
    });
  });

  // Get bleat replies
  fastify.get<{ Params: GetBleatParams; Querystring: GetFeedQuery }>("/bleats/:bleatId/replies", {
    onRequest: [fastify.optionalAuth],
    schema: {
      tags: ["Bleats"],
      description: "Get replies to a bleat",
    },
  }, async (_request, reply: FastifyReply) => {
    // TODO: Fetch replies with pagination

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Get replies not yet implemented",
      },
    });
  });
}
