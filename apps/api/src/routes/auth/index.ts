import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { registerSchema, loginSchema, refreshTokenSchema } from "./schemas.js";
import type { RegisterInput, LoginInput, RefreshTokenInput } from "./schemas.js";

export async function authRoutes(fastify: FastifyInstance) {
  // Register new user
  fastify.post<{ Body: RegisterInput }>("/auth/register", {
    schema: {
      tags: ["Auth"],
      description: "Register a new user with URI email",
      body: {
        type: "object",
        required: ["email", "username", "displayName", "password"],
        properties: {
          email: { type: "string", format: "email" },
          username: { type: "string", minLength: 3, maxLength: 30 },
          displayName: { type: "string", minLength: 1, maxLength: 50 },
          password: { type: "string", minLength: 8 },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) => {
    const validation = registerSchema.safeParse(request.body);

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

    // TODO: Implement registration logic
    // 1. Check if email/username exists
    // 2. Hash password
    // 3. Create user
    // 4. Send verification email
    // 5. Return success

    return reply.status(201).send({
      success: true,
      data: {
        message: "Registration successful. Please check your email for verification code.",
      },
    });
  });

  // Login
  fastify.post<{ Body: LoginInput }>("/auth/login", {
    schema: {
      tags: ["Auth"],
      description: "Login with email and password",
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {
              type: "object",
              properties: {
                accessToken: { type: "string" },
                refreshToken: { type: "string" },
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    username: { type: "string" },
                    displayName: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) => {
    const validation = loginSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
        },
      });
    }

    // TODO: Implement login logic
    // 1. Find user by email
    // 2. Verify password
    // 3. Check email verification status
    // 4. Generate tokens
    // 5. Store refresh token
    // 6. Return tokens and user

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Login not yet implemented",
      },
    });
  });

  // Refresh token
  fastify.post<{ Body: RefreshTokenInput }>("/auth/refresh", {
    schema: {
      tags: ["Auth"],
      description: "Refresh access token using refresh token",
      body: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: { type: "string" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: RefreshTokenInput }>, reply: FastifyReply) => {
    const validation = refreshTokenSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
        },
      });
    }

    // TODO: Implement token refresh
    // 1. Verify refresh token
    // 2. Check if token exists in database
    // 3. Rotate refresh token
    // 4. Generate new access token
    // 5. Return new tokens

    return reply.status(501).send({
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Token refresh not yet implemented",
      },
    });
  });

  // Logout
  fastify.post("/auth/logout", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Auth"],
      description: "Logout and invalidate refresh token",
      security: [{ bearerAuth: [] }],
    },
  }, async (_request, reply) => {
    // TODO: Implement logout
    // 1. Delete refresh token from database

    return reply.send({
      success: true,
      data: {
        message: "Logged out successfully",
      },
    });
  });

  // Get current user
  fastify.get("/auth/me", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Auth"],
      description: "Get current authenticated user",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    // TODO: Fetch full user profile from database

    return reply.send({
      success: true,
      data: {
        userId: request.user.userId,
        username: request.user.username,
      },
    });
  });
}
