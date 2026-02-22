import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules", "dist", "src/test"],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test-jwt-secret-key-at-least-32-characters-long",
      DATABASE_URL: "postgresql://ramzee:ramzee_dev_password@localhost:5432/ramzee_test",
      LOG_LEVEL: "error",
      PORT: "0",
    },
  },
});
