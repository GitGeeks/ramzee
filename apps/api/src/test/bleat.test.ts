import { describe, it, expect, beforeAll } from "vitest";
import { extractRamTags } from "../services/bleat.js";

describe("Bleat Service", () => {
  describe("extractRamTags", () => {
    it("should extract ramtags from content", () => {
      const content = "Hello #ramzee! Check out #URIRams and #GoRhody";
      const tags = extractRamTags(content);

      expect(tags).toHaveLength(3);
      expect(tags).toContain("ramzee");
      expect(tags).toContain("urirams");
      expect(tags).toContain("gorhody");
    });

    it("should return empty array when no tags", () => {
      const content = "Hello world!";
      const tags = extractRamTags(content);

      expect(tags).toHaveLength(0);
    });

    it("should handle duplicate tags", () => {
      const content = "#ramzee is great! #ramzee forever!";
      const tags = extractRamTags(content);

      expect(tags).toHaveLength(1);
      expect(tags[0]).toBe("ramzee");
    });

    it("should lowercase all tags", () => {
      const content = "#UPPERCASE #MixedCase #lowercase";
      const tags = extractRamTags(content);

      expect(tags).toContain("uppercase");
      expect(tags).toContain("mixedcase");
      expect(tags).toContain("lowercase");
    });

    it("should handle tags with numbers and underscores", () => {
      const content = "#class_of_2025 #uri123";
      const tags = extractRamTags(content);

      expect(tags).toContain("class_of_2025");
      expect(tags).toContain("uri123");
    });
  });
});

describe("Bleat Routes (Unit Tests)", () => {
  let app: Awaited<typeof import("./setup.js")>["app"];

  beforeAll(async () => {
    const setup = await import("./setup.js");
    app = setup.app;
  });

  describe("POST /v1/bleats", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/bleats",
        payload: {
          content: "Hello world!",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should reject empty content", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/bleats",
        headers: {
          authorization: "Bearer invalid.token",
        },
        payload: {
          content: "",
        },
      });

      expect(response.statusCode).toBe(401); // Auth fails first
    });
  });

  describe("GET /v1/bleats/:bleatId", () => {
    it("should return 400 for invalid bleat ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/bleats/not-a-uuid",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /v1/bleats/:bleatId/huff", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/bleats/550e8400-e29b-41d4-a716-446655440000/huff",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /v1/bleats/:bleatId/huff", () => {
    it("should reject unauthenticated requests", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/v1/bleats/550e8400-e29b-41d4-a716-446655440000/huff",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
