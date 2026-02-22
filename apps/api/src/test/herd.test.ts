import { describe, it, expect, beforeAll } from "vitest";

describe("Herd Routes (Unit Tests)", () => {
  let app: Awaited<typeof import("./setup.js")>["app"];

  beforeAll(async () => {
    const setup = await import("./setup.js");
    app = setup.app;
  });

  describe("POST /v1/herds", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/herds",
        payload: {
          name: "Test Herd",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("PATCH /v1/herds/:herdId", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/v1/herds/some-herd-id",
        payload: {
          name: "Updated Name",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /v1/herds/:herdId", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/v1/herds/some-herd-id",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/herds/:herdId/join", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/herds/some-herd-id/join",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/herds/:herdId/leave", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/herds/some-herd-id/leave",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("PATCH /v1/herds/:herdId/members/:userId/role", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/v1/herds/some-herd-id/members/some-user-id/role",
        payload: {
          role: "moderator",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /v1/herds/:herdId/members/:userId", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/v1/herds/some-herd-id/members/some-user-id",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/herds/search", () => {
    it("should require search query", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/herds/search",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /v1/me/herds", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/me/herds",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)("Herd Routes (Integration Tests)", () => {
  it.todo("should create a new herd");
  it.todo("should get herd by ID");
  it.todo("should update herd settings");
  it.todo("should delete herd");
  it.todo("should join public herd");
  it.todo("should not join private herd without invite");
  it.todo("should leave herd");
  it.todo("should get herd members");
  it.todo("should update member role");
  it.todo("should remove member from herd");
  it.todo("should get herd feed");
  it.todo("should search herds");
  it.todo("should get popular herds");
  it.todo("should get user's herds");
});
