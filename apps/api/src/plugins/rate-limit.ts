import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";

export async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
      },
    }),
    keyGenerator: (request) => {
      // Use user ID if authenticated, otherwise IP
      return request.user?.userId || request.ip;
    },
  });
}
