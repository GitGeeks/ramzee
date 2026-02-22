import { describe, it, expect, beforeAll } from "vitest";

describe("Moderation Routes (Unit Tests)", () => {
  let app: Awaited<typeof import("./setup.js")>["app"];

  beforeAll(async () => {
    const setup = await import("./setup.js");
    app = setup.app;
  });

  describe("POST /v1/reports", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/reports",
        payload: {
          targetType: "bleat",
          targetId: "123e4567-e89b-12d3-a456-426614174000",
          reason: "spam",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/me/reports", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/me/reports",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/appeals", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/appeals",
        payload: {
          reportId: "123e4567-e89b-12d3-a456-426614174000",
          reason: "This was a mistake",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/admin/reports", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/admin/reports",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("PATCH /v1/admin/reports/:reportId", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/v1/admin/reports/some-report-id",
        payload: {
          status: "resolved",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/admin/actions", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/admin/actions",
        payload: {
          type: "warn",
          targetUserId: "123e4567-e89b-12d3-a456-426614174000",
          reason: "Spamming",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/content/check", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/content/check",
        payload: {
          content: "Test content",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/me/moderation-status", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/me/moderation-status",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)("Moderation Routes (Integration Tests)", () => {
  it.todo("should create a report");
  it.todo("should get user's reports");
  it.todo("should appeal a report");
  it.todo("should get all reports (moderator)");
  it.todo("should update report status (moderator)");
  it.todo("should take moderation action (moderator)");
  it.todo("should warn a user");
  it.todo("should mute a user");
  it.todo("should suspend a user");
  it.todo("should ban a user");
  it.todo("should delete bleat (moderator)");
  it.todo("should check content for violations");
  it.todo("should get moderation status");
});
