import { describe, it, expect, beforeAll } from "vitest";

describe("Notification Routes (Unit Tests)", () => {
  let app: Awaited<typeof import("./setup.js")>["app"];

  beforeAll(async () => {
    const setup = await import("./setup.js");
    app = setup.app;
  });

  describe("GET /v1/notifications", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/notifications",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/notifications/unread-count", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/notifications/unread-count",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/notifications/mark-read", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/notifications/mark-read",
        payload: {},
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)("Notification Routes (Integration Tests)", () => {
  it.todo("should return notifications for authenticated user");
  it.todo("should return unread count");
  it.todo("should mark specific notifications as read");
  it.todo("should mark all notifications as read");
  it.todo("should create huff notification");
  it.todo("should create reply notification");
  it.todo("should create rebaa notification");
  it.todo("should create graze notification");
});
