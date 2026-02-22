import Fastify, { type FastifyInstance, type FastifyError } from "fastify";
import helmet from "@fastify/helmet";
import { env } from "./config/index.js";
import { authPlugin, corsPlugin, rateLimitPlugin, swaggerPlugin, websocketPlugin } from "./plugins/index.js";
import { healthRoutes, authRoutes, bleatRoutes, userRoutes, feedRoutes, notificationRoutes, herdRoutes, messageRoutes, gamificationRoutes, searchRoutes } from "./routes/index.js";

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === "development" ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      } : undefined,
    },
    requestIdHeader: "x-request-id",
    genReqId: () => crypto.randomUUID(),
  });

  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === "production",
  });

  // Register plugins
  await fastify.register(corsPlugin);
  await fastify.register(authPlugin);
  await fastify.register(rateLimitPlugin);
  await fastify.register(swaggerPlugin);
  await fastify.register(websocketPlugin);

  // Global error handler
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);

    // Handle validation errors
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.validation,
        },
      });
    }

    // Handle rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: error.message,
        },
      });
    }

    // Default error response
    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: statusCode === 500 ? "INTERNAL_ERROR" : "ERROR",
        message: env.NODE_ENV === "production" && statusCode === 500
          ? "An unexpected error occurred"
          : error.message,
      },
    });
  });

  // Not found handler
  fastify.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found",
      },
    });
  });

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: "/v1" });
  await fastify.register(bleatRoutes, { prefix: "/v1" });
  await fastify.register(userRoutes, { prefix: "/v1" });
  await fastify.register(feedRoutes, { prefix: "/v1" });
  await fastify.register(notificationRoutes, { prefix: "/v1" });
  await fastify.register(herdRoutes, { prefix: "/v1" });
  await fastify.register(messageRoutes, { prefix: "/v1" });
  await fastify.register(gamificationRoutes, { prefix: "/v1" });
  await fastify.register(searchRoutes, { prefix: "/v1" });

  return fastify;
}
