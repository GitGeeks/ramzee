import type { FastifyInstance } from "fastify";

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
          },
        },
      },
    },
  }, async (_request, _reply) => {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
    };
  });

  fastify.get("/health/ready", {
    schema: {
      tags: ["Health"],
      description: "Readiness probe - checks if service is ready to accept traffic",
    },
  }, async (_request, reply) => {
    // TODO: Add database connectivity check
    return reply.send({ ready: true });
  });

  fastify.get("/health/live", {
    schema: {
      tags: ["Health"],
      description: "Liveness probe - checks if service is alive",
    },
  }, async (_request, _reply) => {
    return { alive: true };
  });
}
