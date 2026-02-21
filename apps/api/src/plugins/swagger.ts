import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env } from "../config/index.js";

export async function swaggerPlugin(fastify: FastifyInstance) {
  await fastify.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Ramzee API",
        description: "URI Student Social Network API",
        version: "1.0.0",
      },
      servers: [
        {
          url: env.NODE_ENV === "production" ? "https://api.ramzee.app" : `http://localhost:${env.PORT}`,
          description: env.NODE_ENV === "production" ? "Production" : "Development",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      tags: [
        { name: "Auth", description: "Authentication endpoints" },
        { name: "Users", description: "User profile endpoints" },
        { name: "Bleats", description: "Bleat (post) endpoints" },
        { name: "Social", description: "Social interactions (graze, block, mute)" },
        { name: "Herds", description: "Group (herd) endpoints" },
        { name: "Messages", description: "Direct messaging endpoints" },
        { name: "Feed", description: "Feed endpoints" },
        { name: "Search", description: "Search endpoints" },
      ],
    },
  });

  if (env.NODE_ENV !== "production") {
    await fastify.register(swaggerUi, {
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: true,
      },
    });
  }
}
