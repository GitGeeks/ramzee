import { describe, it, expect, beforeAll } from "vitest";

describe("Feed Routes (Unit Tests)", () => {
  let app: Awaited<typeof import("./setup.js")>["app"];

  beforeAll(async () => {
    const setup = await import("./setup.js");
    app = setup.app;
  });

  describe("GET /v1/feed/pasture (home feed)", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/feed/pasture",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/feed/foryou (algorithmic feed)", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/feed/foryou",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/feed/meadow (explore/trending)", () => {
    it("should allow unauthenticated requests", async () => {
      // This will fail because DB is not connected, but it should not be 401
      const response = await app.inject({
        method: "GET",
        url: "/v1/feed/meadow",
      });

      // Should either succeed or fail with 500 (DB error), not 401
      expect(response.statusCode).not.toBe(401);
    });

    it("should accept filter parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/feed/meadow?filter=latest",
      });

      expect(response.statusCode).not.toBe(401);
    });
  });

  describe("GET /v1/feed/ramtag/:tag", () => {
    it("should allow unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/feed/ramtag/urirams",
      });

      // Should either succeed or fail with 500 (DB error), not 401
      expect(response.statusCode).not.toBe(401);
    });
  });

  describe("GET /v1/feed/ramtags/trending", () => {
    it("should allow unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/feed/ramtags/trending",
      });

      // Should either succeed or fail with 500 (DB error), not 401
      expect(response.statusCode).not.toBe(401);
    });

    it("should accept limit parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/feed/ramtags/trending?limit=5",
      });

      expect(response.statusCode).not.toBe(401);
    });
  });
});

describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)("Feed Routes (Integration Tests)", () => {
  it.todo("should return pasture feed for authenticated user");
  it.todo("should return for you feed with personalized content");
  it.todo("should return meadow feed with trending bleats");
  it.todo("should filter meadow by latest/top/trending");
  it.todo("should return ramtag feed");
  it.todo("should return trending ramtags");
  it.todo("should exclude blocked users from feed");
  it.todo("should exclude muted users from feed");
});
