import { randomBytes } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@ramzee/database";
import { users, refreshTokens, emailVerifications, passwordResets } from "@ramzee/database/schema";
import { hashPassword, verifyPassword } from "./password.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email.js";
import type { FastifyInstance } from "fastify";

const VERIFICATION_CODE_LENGTH = 6;
const VERIFICATION_EXPIRY_MINUTES = 15;
const PASSWORD_RESET_EXPIRY_HOURS = 1;

export function generateVerificationCode(): string {
  return Array.from({ length: VERIFICATION_CODE_LENGTH }, () =>
    Math.floor(Math.random() * 10)
  ).join("");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

interface RegisterInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  async register(input: RegisterInput): Promise<{ userId: string }> {
    // Check if email already exists
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.uriEmail, input.email.toLowerCase()),
    });

    if (existingEmail) {
      throw new Error("EMAIL_EXISTS");
    }

    // Check if username already exists
    const existingUsername = await db.query.users.findFirst({
      where: eq(users.username, input.username.toLowerCase()),
    });

    if (existingUsername) {
      throw new Error("USERNAME_EXISTS");
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        uriEmail: input.email.toLowerCase(),
        username: input.username.toLowerCase(),
        displayName: input.displayName,
        passwordHash,
        isEmailVerified: false,
      })
      .returning({ id: users.id });

    // Generate and store verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(emailVerifications).values({
      userId: user.id,
      code,
      expiresAt,
    });

    // Send verification email
    await sendVerificationEmail(input.email, code);

    return { userId: user.id };
  }

  async verifyEmail(email: string, code: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.uriEmail, email.toLowerCase()),
    });

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    if (user.isEmailVerified) {
      return true;
    }

    const verification = await db.query.emailVerifications.findFirst({
      where: and(
        eq(emailVerifications.userId, user.id),
        eq(emailVerifications.code, code),
        gt(emailVerifications.expiresAt, new Date())
      ),
    });

    if (!verification) {
      throw new Error("INVALID_CODE");
    }

    // Mark email as verified
    await db
      .update(users)
      .set({ isEmailVerified: true })
      .where(eq(users.id, user.id));

    // Delete used verification codes
    await db
      .delete(emailVerifications)
      .where(eq(emailVerifications.userId, user.id));

    return true;
  }

  async login(email: string, password: string): Promise<{ user: typeof users.$inferSelect; tokens: AuthTokens }> {
    const user = await db.query.users.findFirst({
      where: eq(users.uriEmail, email.toLowerCase()),
    });

    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error("INVALID_CREDENTIALS");
    }

    if (!user.isEmailVerified) {
      throw new Error("EMAIL_NOT_VERIFIED");
    }

    if (user.isSuspended) {
      throw new Error("ACCOUNT_SUSPENDED");
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.username);

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return { user, tokens };
  }

  async generateTokens(userId: string, username: string): Promise<AuthTokens> {
    const accessToken = this.fastify.jwt.sign(
      { userId, username, type: "access" },
      { expiresIn: "15m" }
    );

    const refreshTokenValue = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(refreshTokens).values({
      userId,
      token: refreshTokenValue,
      expiresAt,
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }

  async refreshAccessToken(refreshTokenValue: string): Promise<AuthTokens> {
    const tokenRecord = await db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.token, refreshTokenValue),
        gt(refreshTokens.expiresAt, new Date())
      ),
    });

    if (!tokenRecord) {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, tokenRecord.userId),
    });

    if (!user || user.isSuspended) {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    // Delete old refresh token (rotation)
    await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));

    // Generate new tokens
    return this.generateTokens(user.id, user.username);
  }

  async logout(userId: string, refreshTokenValue?: string): Promise<void> {
    if (refreshTokenValue) {
      await db
        .delete(refreshTokens)
        .where(and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.token, refreshTokenValue)
        ));
    } else {
      // Logout from all devices
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(users.uriEmail, email.toLowerCase()),
    });

    // Don't reveal if user exists
    if (!user) return;

    const token = generateToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000);

    // Delete any existing reset tokens
    await db.delete(passwordResets).where(eq(passwordResets.userId, user.id));

    // Create new reset token
    await db.insert(passwordResets).values({
      userId: user.id,
      token,
      expiresAt,
    });

    await sendPasswordResetEmail(email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetRecord = await db.query.passwordResets.findFirst({
      where: and(
        eq(passwordResets.token, token),
        gt(passwordResets.expiresAt, new Date())
      ),
    });

    if (!resetRecord) {
      throw new Error("INVALID_RESET_TOKEN");
    }

    const passwordHash = await hashPassword(newPassword);

    // Update password
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, resetRecord.userId));

    // Delete reset token
    await db.delete(passwordResets).where(eq(passwordResets.userId, resetRecord.userId));

    // Invalidate all refresh tokens
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, resetRecord.userId));
  }
}
