import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../../services/auth.js";
import { userService } from "../../services/user.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./schemas.js";
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  VerifyEmailInput,
} from "./schemas.js";

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);

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

    try {
      const result = await authService.register(validation.data);

      return reply.status(201).send({
        success: true,
        data: {
          userId: result.userId,
          message: "Registration successful. Please check your email for verification code.",
        },
      });
    } catch (err) {
      const error = err as Error;

      if (error.message === "EMAIL_EXISTS") {
        return reply.status(409).send({
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "An account with this email already exists",
          },
        });
      }

      if (error.message === "USERNAME_EXISTS") {
        return reply.status(409).send({
          success: false,
          error: {
            code: "USERNAME_EXISTS",
            message: "This username is already taken",
          },
        });
      }

      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: "REGISTRATION_FAILED",
          message: "Registration failed. Please try again.",
        },
      });
    }
  });

  // Verify email
  fastify.post<{ Body: VerifyEmailInput }>("/auth/verify-email", {
    schema: {
      tags: ["Auth"],
      description: "Verify email with code sent to user",
      body: {
        type: "object",
        required: ["email", "code"],
        properties: {
          email: { type: "string", format: "email" },
          code: { type: "string", minLength: 6, maxLength: 6 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: VerifyEmailInput }>, reply: FastifyReply) => {
    const validation = verifyEmailSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
        },
      });
    }

    try {
      await authService.verifyEmail(validation.data.email, validation.data.code);

      return reply.send({
        success: true,
        data: {
          message: "Email verified successfully. You can now log in.",
        },
      });
    } catch (err) {
      const error = err as Error;

      if (error.message === "USER_NOT_FOUND") {
        return reply.status(404).send({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "No account found with this email",
          },
        });
      }

      if (error.message === "INVALID_CODE") {
        return reply.status(400).send({
          success: false,
          error: {
            code: "INVALID_CODE",
            message: "Invalid or expired verification code",
          },
        });
      }

      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: "VERIFICATION_FAILED",
          message: "Verification failed. Please try again.",
        },
      });
    }
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

    try {
      const { user, tokens } = await authService.login(
        validation.data.email,
        validation.data.password
      );

      return reply.send({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            isVerified: user.isVerified,
          },
        },
      });
    } catch (err) {
      const error = err as Error;

      if (error.message === "INVALID_CREDENTIALS") {
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        });
      }

      if (error.message === "EMAIL_NOT_VERIFIED") {
        return reply.status(403).send({
          success: false,
          error: {
            code: "EMAIL_NOT_VERIFIED",
            message: "Please verify your email before logging in",
          },
        });
      }

      if (error.message === "ACCOUNT_SUSPENDED") {
        return reply.status(403).send({
          success: false,
          error: {
            code: "ACCOUNT_SUSPENDED",
            message: "Your account has been suspended",
          },
        });
      }

      request.log.error(error);
      return reply.status(500).send({
        success: false,
        error: {
          code: "LOGIN_FAILED",
          message: "Login failed. Please try again.",
        },
      });
    }
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

    try {
      const tokens = await authService.refreshAccessToken(validation.data.refreshToken);

      return reply.send({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (err) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "INVALID_REFRESH_TOKEN",
          message: "Invalid or expired refresh token",
        },
      });
    }
  });

  // Forgot password
  fastify.post<{ Body: { email: string } }>("/auth/forgot-password", {
    schema: {
      tags: ["Auth"],
      description: "Request password reset email",
      body: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) => {
    const validation = forgotPasswordSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid email",
        },
      });
    }

    // Always return success to prevent email enumeration
    await authService.requestPasswordReset(validation.data.email);

    return reply.send({
      success: true,
      data: {
        message: "If an account exists with this email, a password reset link has been sent.",
      },
    });
  });

  // Reset password
  fastify.post<{ Body: { token: string; password: string } }>("/auth/reset-password", {
    schema: {
      tags: ["Auth"],
      description: "Reset password with token",
      body: {
        type: "object",
        required: ["token", "password"],
        properties: {
          token: { type: "string" },
          password: { type: "string", minLength: 8 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { token: string; password: string } }>, reply: FastifyReply) => {
    const validation = resetPasswordSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
        },
      });
    }

    try {
      await authService.resetPassword(validation.data.token, validation.data.password);

      return reply.send({
        success: true,
        data: {
          message: "Password reset successfully. You can now log in with your new password.",
        },
      });
    } catch (err) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_RESET_TOKEN",
          message: "Invalid or expired reset token",
        },
      });
    }
  });

  // Logout
  fastify.post("/auth/logout", {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ["Auth"],
      description: "Logout and invalidate refresh token",
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const refreshToken = (request.body as { refreshToken?: string })?.refreshToken;
    await authService.logout(request.user.userId, refreshToken);

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
    const user = await userService.getById(request.user.userId);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        hornStyle: user.hornStyle,
        fleeceTheme: user.fleeceTheme,
        isVerified: user.isVerified,
        rhodyPoints: user.rhodyPoints,
        streakDays: user.streakDays,
        createdAt: user.createdAt,
      },
    });
  });
}
