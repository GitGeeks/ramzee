import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { env } from "../config/index.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      userId: string;
      username: string;
      type: "access" | "refresh";
    };
    user: {
      userId: string;
      username: string;
      type: "access" | "refresh";
    };
  }
}

async function authPluginImpl(fastify: FastifyInstance) {
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      algorithm: "HS256",
    },
  });

  // Required authentication decorator
  fastify.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();

      if (request.user.type !== "access") {
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_TOKEN_TYPE",
            message: "Invalid token type",
          },
        });
      }
    } catch (err) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }
  });

  // Optional authentication decorator
  fastify.decorate("optionalAuth", async function (request: FastifyRequest, _reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch {
      // Silently ignore - user is not authenticated
    }
  });
}

export const authPlugin = fp(authPluginImpl, {
  name: "auth",
});
