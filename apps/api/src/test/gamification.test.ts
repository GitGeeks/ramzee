import { describe, it, expect, beforeAll } from "vitest";

describe("Gamification Routes (Unit Tests)", () => {
  let app: Awaited<typeof import("./setup.js")>["app"];

  beforeAll(async () => {
    const setup = await import("./setup.js");
    app = setup.app;
  });

  describe("GET /v1/me/badge-progress", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/me/badge-progress",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/me/check-badges", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/me/check-badges",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/me/streak", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/me/streak",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/me/activity", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/me/activity",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)("Gamification Routes (Integration Tests)", () => {
  it.todo("should return all badges");
  it.todo("should return user badges");
  it.todo("should return badge progress");
  it.todo("should check and award badges");
  it.todo("should return user stats");
  it.todo("should return leaderboard");
  it.todo("should return current streak");
  it.todo("should record activity");
  it.todo("should award badge on threshold");
});
