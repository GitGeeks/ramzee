import { describe, it, expect, beforeAll } from "vitest";

describe("Message Routes (Unit Tests)", () => {
  let app: Awaited<typeof import("./setup.js")>["app"];

  beforeAll(async () => {
    const setup = await import("./setup.js");
    app = setup.app;
  });

  describe("GET /v1/conversations", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/conversations",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/conversations/direct/:userId", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/conversations/direct/some-user-id",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/conversations/group", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/conversations/group",
        payload: {
          participantIds: ["user-1", "user-2"],
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/conversations/:conversationId/messages", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/conversations/some-conv-id/messages",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/conversations/:conversationId/messages", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/conversations/some-conv-id/messages",
        payload: {
          content: "Hello!",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/conversations/:conversationId/read", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/conversations/some-conv-id/read",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /v1/messages/:messageId", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/v1/messages/some-message-id",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /v1/conversations/:conversationId/leave", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/conversations/some-conv-id/leave",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /v1/messages/unread-count", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/messages/unread-count",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)("Message Routes (Integration Tests)", () => {
  it.todo("should get or create direct conversation");
  it.todo("should create group conversation");
  it.todo("should send message in conversation");
  it.todo("should get messages with pagination");
  it.todo("should mark conversation as read");
  it.todo("should delete own message");
  it.todo("should not delete other user's message");
  it.todo("should leave group conversation");
  it.todo("should get total unread count");
  it.todo("should not message blocked user");
});
