import { type FastifyPluginAsync } from "fastify";
import { gamificationService } from "../../services/index.js";

export const gamificationRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all available badges
  fastify.get("/badges", {
    handler: async (_request, reply) => {
      const badges = await gamificationService.getAllBadges();

      return reply.send({
        success: true,
        data: badges,
      });
    },
  });

  // Get user's badges
  fastify.get<{ Params: { userId: string } }>("/users/:userId/badges", {
    handler: async (request, reply) => {
      const { userId } = request.params;

      const badges = await gamificationService.getUserBadges(userId);

      return reply.send({
        success: true,
        data: badges,
      });
    },
  });

  // Get current user's badge progress
  fastify.get("/me/badge-progress", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const progress = await gamificationService.getBadgeProgress(request.user.userId);

      return reply.send({
        success: true,
        data: progress,
      });
    },
  });

  // Check and award badges for current user
  fastify.post("/me/check-badges", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const awardedBadges = await gamificationService.checkAndAwardBadges(request.user.userId);

      return reply.send({
        success: true,
        data: {
          newBadges: awardedBadges,
        },
      });
    },
  });

  // Get user stats
  fastify.get<{ Params: { userId: string } }>("/users/:userId/stats", {
    handler: async (request, reply) => {
      const { userId } = request.params;

      const stats = await gamificationService.getUserStats(userId);

      return reply.send({
        success: true,
        data: stats,
      });
    },
  });

  // Get leaderboard
  fastify.get<{ Querystring: { type?: "huffs" | "grazers" | "bleats"; limit?: string } }>(
    "/leaderboard",
    {
      handler: async (request, reply) => {
        const { type = "grazers", limit } = request.query;

        const leaderboard = await gamificationService.getLeaderboard(
          type,
          limit ? parseInt(limit, 10) : undefined
        );

        return reply.send({
          success: true,
          data: leaderboard,
        });
      },
    }
  );

  // Get current user's streak
  fastify.get("/me/streak", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const streak = await gamificationService.calculateStreak(request.user.userId);

      return reply.send({
        success: true,
        data: {
          currentStreak: streak,
        },
      });
    },
  });

  // Record activity (called by other services, but exposed for testing)
  fastify.post("/me/activity", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      await gamificationService.recordActivity(request.user.userId);

      return reply.send({
        success: true,
        message: "Activity recorded",
      });
    },
  });
};
