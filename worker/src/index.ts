import { DurableObject } from "cloudflare:workers";

export interface Env {
  DND_WEBSOCKETS: DurableObjectNamespace<DNDWebSocketHibernationServer>;
}

// ES Module Worker - Main export default handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle WebSocket upgrade requests

    console.log("Incoming request:", request.url);
    if (request.headers.get("Upgrade") === "websocket") {
      // Extract connection parameters from URL
        console.log('Handling WebSocket upgrade request');

        try {
            const url = new URL(request.url);
      const connectionId = url.searchParams.get("connectionId") || crypto.randomUUID();
      const mapName = url.searchParams.get("mapName") || "default";

      console.log(url, mapName)

      console.log(env.DND_WEBSOCKETS)
      
      // Create Durable Object ID based on mapName for room isolation
      const durableObjectId = env.DND_WEBSOCKETS.idFromName(mapName);
      const durableObjectStub = env.DND_WEBSOCKETS.get(durableObjectId);
      
      // Forward the request to the Durable Object
      return durableObjectStub.fetch(request);
        } catch (error) {
            console.error('Error handling WebSocket upgrade:', error);
            return new Response("WebSocket upgrade error", { status: 500 });
        }

      
    }
    
    // Handle non-WebSocket requests
    return new Response("Expected WebSocket connection", { status: 400 });
  }
} satisfies ExportedHandler<Env>;

// Durable Object Class
export class DNDWebSocketHibernationServer extends DurableObject<Env> {
  private connections: Map<string, WebSocket> = new Map();
  private gameState: any = {};

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    // Check if this is a WebSocket upgrade request
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }

    console.log("CLASS :::: WebSocket upgrade request:", request.url);

    // Extract connection parameters
    const url = new URL(request.url);
    const connectionId = url.searchParams.get("connectionId") || crypto.randomUUID();
    const clientType = url.searchParams.get("clientType") || "unknown";
    const mapName    = url.searchParams.get("mapName") || "default";

    // Create WebSocket pair
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept WebSocket connection
    this.ctx.acceptWebSocket(server, [connectionId, clientType, mapName]);

    // Store connection metadata
    this.connections.set(connectionId, server);

    // Send welcome message
    server.send(JSON.stringify({
      type: "connected",
      connectionId,
      mapName,
      timestamp: Date.now()
    }));

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    try {
      // Parse incoming message
      const messageStr = typeof message === "string" ? message : new TextDecoder().decode(message);
      const parsedMessage = JSON.parse(messageStr);
      
      // Get connection metadata
      const tags = this.ctx.getTags(ws);
      const [connectionId, clientType, gameId] = tags || [];

      console.log(`Received message from ${connectionId}:`, parsedMessage);

      // Handle different message types
      switch (parsedMessage.type) {
        case "handshake":
          this.handleHandshake(ws, parsedMessage, connectionId);
          break;
          
        case "game_update":
          this.handleGameUpdate(ws, parsedMessage, connectionId);
          break;
          
        case "player_action":
          this.handlePlayerAction(ws, parsedMessage, connectionId);
          break;
          
        case "chat_message":
          this.handleChatMessage(ws, parsedMessage, connectionId);
          break;
          
        case "ping":
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          break;

        default:
          ws.send(JSON.stringify({ 
            type: "error", 
            message: `Unknown message type: ${parsedMessage.type}` 
          }));
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(JSON.stringify({ 
        type: "error", 
        message: "Failed to process message" 
      }));
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // Get connection metadata
    const tags = this.ctx.getTags(ws);
    const [connectionId] = tags || [];
    
    if (connectionId) {
      this.connections.delete(connectionId);
      console.log(`Connection ${connectionId} closed. Remaining connections: ${this.connections.size}`);
      
      // Notify other clients about disconnection
      this.broadcastToOthers(ws, {
        type: "player_disconnected",
        connectionId,
        timestamp: Date.now()
      });
    }
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error("WebSocket error:", error);
    
    // Clean up connection
    const tags = this.ctx.getTags(ws);
    const [connectionId] = tags || [];
    if (connectionId) {
      this.connections.delete(connectionId);
    }
  }

  // Message handlers
  private handleHandshake(ws: WebSocket, message: any, connectionId: string) {
    console.log(`Handshake from ${connectionId}:`, message);
    const response = {
      type: "handshake_ack",
      connectionId,
      serverTime: Date.now(),
      connectedClients: this.ctx.getWebSockets().length,
      gameState: this.gameState,
      
    };
    
    ws.send(JSON.stringify(response));
    
    // Notify other clients about new connection
    this.broadcastToOthers(ws, {
      type: "player_connected",      
      playerId: message.data.playerId,
      timestamp: Date.now()
    });
  }

  private handleGameUpdate(ws: WebSocket, message: any, connectionId: string) {
    // Update game state
    if (message.data) {
      this.gameState = { ...this.gameState, ...message.data };
    }
    
    // Broadcast to all other clients
    this.broadcastToOthers(ws, {
      type: "game_update",
      connectionId,
      data: message.data,
      timestamp: Date.now()
    });
  }

  private handlePlayerAction(ws: WebSocket, message: any, connectionId: string) {
    // Broadcast player action to all other clients
    this.broadcastToOthers(ws, {
      type: "player_action",
      connectionId,
      action: message.action,
      data: message.data,
      timestamp: Date.now()
    });
  }

  private handleChatMessage(ws: WebSocket, message: any, connectionId: string) {
    // Broadcast chat message to all clients (including sender)    
    this.broadcastToAll({
      type: "chat_message",
      connectionId,
      message: message.message,
      playerName: message.playerName,
      timestamp: Date.now()
    });
  }

  // Utility methods
  private broadcastToAll(message: any) {
    const messageStr = JSON.stringify(message);
    this.ctx.getWebSockets().forEach(ws => {
        console.log("Broadcasting message to all clients:", message);
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error("Error broadcasting to client:", error);
      }
    });
  }

  private broadcastToOthers(sender: WebSocket, message: any) {
    const messageStr = JSON.stringify(message);
    this.ctx.getWebSockets().forEach(ws => {
      if (ws !== sender) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error("Error broadcasting to client:", error);
        }
      }
    });
  }
}