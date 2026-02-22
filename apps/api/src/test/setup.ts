// Set test environment variables BEFORE any imports
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-key-at-least-32-characters-long";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://ramzee:ramzee_dev_password@localhost:5432/ramzee_test";
process.env.LOG_LEVEL = "silent";
process.env.PORT = "0"; // Use random port for tests

import { beforeAll, afterAll } from "vitest";
import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";

export let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

export async function createTestUser(overrides = {}) {
  const timestamp = Date.now();
  return {
    email: `test${timestamp}@uri.edu`,
    username: `testuser${timestamp}`,
    displayName: "Test User",
    password: "password123",
    ...overrides,
  };
}
