import { type FastifyPluginAsync } from "fastify";
import { searchService } from "../../services/index.js";

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  // Unified search
  fastify.get<{
    Querystring: {
      q: string;
      type?: "all" | "users" | "bleats" | "herds" | "ramtags";
      cursor?: string;
      limit?: string;
    };
  }>("/search", {
    handler: async (request, reply) => {
      const { q, type, cursor, limit } = request.query;

      if (!q || q.trim().length < 2) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Search query must be at least 2 characters" },
        });
      }

      const userId = request.user?.userId;

      // Record search for analytics
      await searchService.recordSearch(q, userId);

      const results = await searchService.search({
        query: q,
        type,
        userId,
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return reply.send({
        success: true,
        data: results.results,
        pagination: {
          nextCursor: results.nextCursor,
        },
      });
    },
  });

  // Autocomplete suggestions
  fastify.get<{ Querystring: { q: string; limit?: string } }>("/search/autocomplete", {
    handler: async (request, reply) => {
      const { q, limit } = request.query;

      if (!q || q.trim().length < 1) {
        return reply.send({
          success: true,
          data: { users: [], ramtags: [] },
        });
      }

      const userId = request.user?.userId;

      const suggestions = await searchService.getAutocompleteSuggestions(
        q,
        userId,
        limit ? parseInt(limit, 10) : undefined
      );

      return reply.send({
        success: true,
        data: suggestions,
      });
    },
  });

  // Discover/Explore page content
  fastify.get("/discover", {
    handler: async (request, reply) => {
      const userId = request.user?.userId;

      const content = await searchService.getDiscoverContent(userId);

      return reply.send({
        success: true,
        data: content,
      });
    },
  });

  // Search users specifically
  fastify.get<{ Querystring: { q: string; cursor?: string; limit?: string } }>("/search/users", {
    handler: async (request, reply) => {
      const { q, cursor, limit } = request.query;

      if (!q || q.trim().length < 2) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Search query must be at least 2 characters" },
        });
      }

      const userId = request.user?.userId;

      const results = await searchService.search({
        query: q,
        type: "users",
        userId,
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return reply.send({
        success: true,
        data: results.results.map((r) => r.data),
        pagination: {
          nextCursor: results.nextCursor,
        },
      });
    },
  });

  // Search bleats specifically
  fastify.get<{ Querystring: { q: string; cursor?: string; limit?: string } }>("/search/bleats", {
    handler: async (request, reply) => {
      const { q, cursor, limit } = request.query;

      if (!q || q.trim().length < 2) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Search query must be at least 2 characters" },
        });
      }

      const userId = request.user?.userId;

      const results = await searchService.search({
        query: q,
        type: "bleats",
        userId,
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return reply.send({
        success: true,
        data: results.results.map((r) => r.data),
        pagination: {
          nextCursor: results.nextCursor,
        },
      });
    },
  });

  // Search herds specifically
  fastify.get<{ Querystring: { q: string; cursor?: string; limit?: string } }>("/search/herds", {
    handler: async (request, reply) => {
      const { q, cursor, limit } = request.query;

      if (!q || q.trim().length < 2) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Search query must be at least 2 characters" },
        });
      }

      const results = await searchService.search({
        query: q,
        type: "herds",
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return reply.send({
        success: true,
        data: results.results.map((r) => r.data),
        pagination: {
          nextCursor: results.nextCursor,
        },
      });
    },
  });

  // Search ramtags specifically
  fastify.get<{ Querystring: { q: string; cursor?: string; limit?: string } }>("/search/ramtags", {
    handler: async (request, reply) => {
      const { q, cursor, limit } = request.query;

      if (!q || q.trim().length < 1) {
        return reply.status(400).send({
          success: false,
          error: { code: "BAD_REQUEST", message: "Search query is required" },
        });
      }

      const results = await searchService.search({
        query: q,
        type: "ramtags",
        cursor,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return reply.send({
        success: true,
        data: results.results.map((r) => r.data),
        pagination: {
          nextCursor: results.nextCursor,
        },
      });
    },
  });
};
