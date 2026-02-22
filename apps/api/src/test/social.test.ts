import { describe, it, expect, beforeAll } from "vitest";

describe("Social Routes (Unit Tests)", () => {
  let app: Awaited<typeof import("./setup.js")>["app"];

  beforeAll(async () => {
    const setup = await import("./setup.js");
    app = setup.app;
  });

  describe("POST /v1/users/:userId/graze (follow)", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/users/550e8400-e29b-41d4-a716-446655440000/graze",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /v1/users/:userId/graze (unfollow)", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/v1/users/550e8400-e29b-41d4-a716-446655440000/graze",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/users/:userId/grazers (followers)", () => {
    it("should return 400 for invalid user ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/users/not-a-uuid/grazers",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /v1/users/:userId/grazing (following)", () => {
    it("should return 400 for invalid user ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/users/not-a-uuid/grazing",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /v1/users/:userId/block", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/users/550e8400-e29b-41d4-a716-446655440000/block",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /v1/users/:userId/block", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/v1/users/550e8400-e29b-41d4-a716-446655440000/block",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/users/me/blocked", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/users/me/blocked",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/users/:userId/mute", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/users/550e8400-e29b-41d4-a716-446655440000/mute",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /v1/users/:userId/mute", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/v1/users/550e8400-e29b-41d4-a716-446655440000/mute",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/users/me/muted", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/users/me/muted",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/users/:userId/relationship", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/users/550e8400-e29b-41d4-a716-446655440000/relationship",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/users/me/suggestions", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/users/me/suggestions",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)("Social Routes (Integration Tests)", () => {
  it.todo("should follow a user");
  it.todo("should unfollow a user");
  it.todo("should get followers");
  it.todo("should get following");
  it.todo("should block a user and remove follows");
  it.todo("should mute a user");
  it.todo("should get relationship status");
  it.todo("should get suggested users");
});
