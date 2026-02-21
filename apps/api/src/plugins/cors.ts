import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { env } from "../config/index.js";

export async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    maxAge: 86400,
  });
}
