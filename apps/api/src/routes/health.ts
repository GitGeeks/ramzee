import type { FastifyInstance } from "fastify";
import { db } from "@ramzee/database";
import { sql } from "drizzle-orm";

const startTime = Date.now();

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", {
    schema: {
      tags: ["Health"],
      description: "Health check endpoint",
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            timestamp: { type: "string" },
            version: { type: "string" },
            uptime: { type: "number" },
          },
        },
      },
    },
  }, async (_request, _reply) => {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };
  });

  fastify.get("/health/ready", {
    schema: {
      tags: ["Health"],
      description: "Readiness probe - checks if service is ready to accept traffic",
    },
  }, async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      return reply.send({ ready: true, database: "connected" });
    } catch {
      return reply.status(503).send({ ready: false, database: "disconnected" });
    }
  });

  fastify.get("/health/live", {
    schema: {
      tags: ["Health"],
      description: "Liveness probe - checks if service is alive",
    },
  }, async (_request, _reply) => {
    return { alive: true };
  });

  // API info endpoint
  fastify.get("/", {
    schema: {
      tags: ["Info"],
      description: "API information",
    },
  }, async (_request, _reply) => {
    return {
      name: "Ramzee API",
      description: "Social platform API for URI students",
      version: "0.1.0",
      docs: "/docs",
      health: "/health",
      features: [
        "Authentication (JWT)",
        "Bleats (Posts)",
        "Social Graph (Follow/Block/Mute)",
        "Feeds (Pasture/Meadow/ForYou)",
        "Real-time (WebSocket)",
        "Notifications",
        "Herds (Groups)",
        "Direct Messaging",
        "Gamification (Badges/Streaks)",
        "Search & Discovery",
        "Moderation & Safety",
      ],
    };
  });
}
