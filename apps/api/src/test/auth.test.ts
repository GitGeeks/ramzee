import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Unit tests that don't require database
describe("Auth Routes (Unit Tests)", () => {
  let app: Awaited<typeof import("./setup.js")>["app"];
  let dbAvailable = false;

  beforeAll(async () => {
    const setup = await import("./setup.js");
    app = setup.app;

    // Check if DB is available by trying a simple query
    try {
      await app.inject({
        method: "GET",
        url: "/health",
      });
      dbAvailable = true;
    } catch {
      dbAvailable = false;
    }
  });

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("healthy");
    });
  });

  describe("POST /v1/auth/register", () => {
    it("should reject non-URI email addresses", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/register",
        payload: {
          email: "test@gmail.com",
          username: "testuser123",
          displayName: "Test User",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });

    it("should reject short usernames", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/register",
        payload: {
          email: "test@uri.edu",
          username: "ab",
          displayName: "Test User",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should reject weak passwords", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/register",
        payload: {
          email: "test@uri.edu",
          username: "testuser123",
          displayName: "Test User",
          password: "short",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /v1/auth/me", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/auth/me",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should reject invalid JWT tokens", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/auth/me",
        headers: {
          authorization: "Bearer invalid.token.here",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/auth/refresh", () => {
    it("should reject invalid refresh tokens", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/refresh",
        payload: {
          refreshToken: "invalid-token",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

// Integration tests that require database (skipped if DB not available)
describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)("Auth Routes (Integration Tests)", () => {
  it.todo("should register a new user with valid URI email");
  it.todo("should verify email with correct code");
  it.todo("should login with valid credentials");
  it.todo("should refresh access token with valid refresh token");
  it.todo("should logout successfully");
});
