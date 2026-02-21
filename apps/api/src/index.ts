import { buildApp } from "./app.js";
import { env } from "./config/index.js";

async function main() {
  const app = await buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    console.log(`
🐏 Ramzee API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${env.NODE_ENV}
Server:      http://${env.HOST}:${env.PORT}
Docs:        http://${env.HOST}:${env.PORT}/docs
Health:      http://${env.HOST}:${env.PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    try {
      await app.close();
      console.log("Server closed successfully");
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
