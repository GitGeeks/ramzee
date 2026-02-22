import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import type { WebSocket } from "ws";

// Store active WebSocket connections by userId
const connections = new Map<string, Set<WebSocket>>();

declare module "fastify" {
  interface FastifyInstance {
    websocketBroadcast: (userId: string, event: string, data: unknown) => void;
    websocketBroadcastAll: (event: string, data: unknown) => void;
  }
}

async function websocketPluginImpl(fastify: FastifyInstance) {
  // Register WebSocket support
  await fastify.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });

  // Add user connection
  function addConnection(userId: string, ws: WebSocket) {
    if (!connections.has(userId)) {
      connections.set(userId, new Set());
    }
    connections.get(userId)!.add(ws);
  }

  // Remove user connection
  function removeConnection(userId: string, ws: WebSocket) {
    const userConnections = connections.get(userId);
    if (userConnections) {
      userConnections.delete(ws);
      if (userConnections.size === 0) {
        connections.delete(userId);
      }
    }
  }

  // Broadcast to specific user
  fastify.decorate("websocketBroadcast", (userId: string, event: string, data: unknown) => {
    const userConnections = connections.get(userId);
    if (userConnections) {
      const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
      userConnections.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(message);
        }
      });
    }
  });

  // Broadcast to all connected users
  fastify.decorate("websocketBroadcastAll", (event: string, data: unknown) => {
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    connections.forEach((userConnections) => {
      userConnections.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(message);
        }
      });
    });
  });

  // WebSocket route for real-time updates
  fastify.get("/ws", { websocket: true }, (connection, req) => {
    let userId: string | null = null;

    // Handle incoming messages
    connection.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle authentication
        if (data.type === "auth" && data.token) {
          try {
            const decoded = await fastify.jwt.verify(data.token);
            userId = (decoded as { userId: string }).userId;
            addConnection(userId, connection);

            connection.send(JSON.stringify({
              event: "authenticated",
              data: { userId },
              timestamp: new Date().toISOString(),
            }));
          } catch {
            connection.send(JSON.stringify({
              event: "auth_error",
              data: { message: "Invalid token" },
              timestamp: new Date().toISOString(),
            }));
          }
        }

        // Handle ping/pong for keepalive
        if (data.type === "ping") {
          connection.send(JSON.stringify({
            event: "pong",
            timestamp: new Date().toISOString(),
          }));
        }
      } catch (err) {
        fastify.log.error(err, "WebSocket message parse error");
      }
    });

    // Handle connection close
    connection.on("close", () => {
      if (userId) {
        removeConnection(userId, connection);
      }
    });

    // Handle errors
    connection.on("error", (err) => {
      fastify.log.error(err, "WebSocket error");
      if (userId) {
        removeConnection(userId, connection);
      }
    });
  });
}

export const websocketPlugin = fp(websocketPluginImpl, {
  name: "websocket",
  dependencies: ["auth"],
});
