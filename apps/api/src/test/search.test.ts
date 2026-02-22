import { describe, it, expect, beforeAll } from "vitest";

describe("Search Routes (Unit Tests)", () => {
  let app: Awaited<typeof import("./setup.js")>["app"];

  beforeAll(async () => {
    const setup = await import("./setup.js");
    app = setup.app;
  });

  describe("GET /v1/search", () => {
    it("should require minimum query length", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/search?q=a",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should require query parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/search",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /v1/search/autocomplete", () => {
    it("should return empty for empty query", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/search/autocomplete?q=",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.users).toEqual([]);
      expect(body.data.ramtags).toEqual([]);
    });
  });

  describe("GET /v1/search/users", () => {
    it("should require minimum query length", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/search/users?q=a",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /v1/search/bleats", () => {
    it("should require minimum query length", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/search/bleats?q=a",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /v1/search/herds", () => {
    it("should require minimum query length", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/search/herds?q=a",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /v1/search/ramtags", () => {
    it("should require query parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/search/ramtags",
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)("Search Routes (Integration Tests)", () => {
  it.todo("should search across all content types");
  it.todo("should search users by username");
  it.todo("should search users by display name");
  it.todo("should search bleats by content");
  it.todo("should search herds by name");
  it.todo("should search ramtags");
  it.todo("should return autocomplete suggestions");
  it.todo("should return discover content");
  it.todo("should filter blocked users from results");
  it.todo("should sort by relevance score");
});
