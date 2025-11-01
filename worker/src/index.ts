import { DurableObject } from "cloudflare:workers";

export interface Env {
  DND_WEBSOCKETS: DurableObjectNamespace<DNDWebSocketHibernationServer>;
}

// ES Module Worker - Main export default handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle WebSocket upgrade requests    
    if (request.headers.get("Upgrade") === "websocket") {
      // Extract connection parameters from URL
      try {
        const url = new URL(request.url);        
        const mapName = url.searchParams.get("mapName") || "default";
    
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

        case "move_character":
          this.handleMoveCharacter(ws, parsedMessage, connectionId);
          break;

        case "damage_log":
          this.hadleDamageLog(ws, parsedMessage, connectionId);
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

    const connectedClients = this.getConnectionsInSameMap(ws);
    const response = {
      type: "handshake_ack",
      connectionId,
      serverTime: Date.now(),
      connectedClients: this.getConnectedClientsInSameMap(ws),
      gameState: this.gameState,
    };
    
    ws.send(JSON.stringify(response));
    
    // Notify other clients about new connection (same mapName only)
    this.broadcastToOthers(ws, {
      type: "player_connected",      
      playerId: message.data.playerId,
      connectionId,
      timestamp: Date.now(),
      connectedClients
    });
  }

  private handleGameUpdate(ws: WebSocket, message: any, connectionId: string) {
    // Update game state
    if (message.data) {
      this.gameState = { ...this.gameState, ...message.data };
    }
    
    // Broadcast to all other clients in the same mapName
    this.broadcastToOthers(ws, {
      type: "game_update",
      connectionId,
      data: message.data,
      timestamp: Date.now()
    });
  }

  private handlePlayerAction(ws: WebSocket, message: any, connectionId: string) {
    // Broadcast player action to all clients in the same mapName
    this.broadcastToAll(ws, {
      type: "player_action",
      connectionId,
      action: message.action,
      data: message.data,
      timestamp: Date.now()
    });
  }

  private handleChatMessage(ws: WebSocket, message: any, connectionId: string) {
    // Broadcast chat message to all clients in the same mapName (including sender)    
    this.broadcastToAll(ws, {
      type: "chat_message",
      connectionId,
      message: message.message,
      playerName: message.playerName,
      timestamp: Date.now()
    });
  }

  private handleMoveCharacter(ws: WebSocket, message: any, connectionId: string) {
    // Broadcast character movement to other clients in the same map
    this.broadcastToOthers(ws, {
      type: "move_character",
      connectionId,
      data: message.data,
      characterId: message.characterId,
      position: message.position,
      timestamp: Date.now()
    });
  }

  private hadleDamageLog(ws: WebSocket, message: any, connectionId: string) {
    // Broadcast damage log to all clients in the same mapName
    this.broadcastToAll(ws, {
      type: "damage_log",
      connectionId,
      data: message.data,
      timestamp: Date.now()
    });
  }

  // Utility methods - Updated to filter by mapName
  private broadcastToAll(senderWs: WebSocket, message: any) {
    const messageStr = JSON.stringify(message);
    const senderTags = this.ctx.getTags(senderWs);
    const senderMapName = senderTags?.[2]; // mapName is the 3rd tag
    
    console.log("Broadcasting message to all clients in map:", senderMapName, message);
    
    this.ctx.getWebSockets().forEach(ws => {
      const tags = this.ctx.getTags(ws);
      const mapName = tags?.[2]; // mapName is the 3rd tag
      
      // Only send to clients in the same mapName
      if (mapName === senderMapName) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error("Error broadcasting to client:", error);
        }
      }
    });
  }

  private broadcastToOthers(sender: WebSocket, message: any) {
    const messageStr = JSON.stringify(message);
    const senderTags = this.ctx.getTags(sender);
    const senderMapName = senderTags?.[2]; // mapName is the 3rd tag
    
    console.log("Broadcasting message to others in map:", senderMapName, message);
    
    this.ctx.getWebSockets().forEach(ws => {
      if (ws !== sender) {
        const tags = this.ctx.getTags(ws);
        const mapName = tags?.[2]; // mapName is the 3rd tag
        
        // Only send to clients in the same mapName
        if (mapName === senderMapName) {
          try {
            ws.send(messageStr);
          } catch (error) {
            console.error("Error broadcasting to client:", error);
          }
        }
      }
    });
  }

  // Helper method to get count of connected clients in the same map
  private getConnectedClientsInSameMap(ws: WebSocket): number {
    const tags = this.ctx.getTags(ws);
    const mapName = tags?.[2]; // mapName is the 3rd tag
    
    let count = 0;
    this.ctx.getWebSockets().forEach(socket => {
      const socketTags = this.ctx.getTags(socket);
      const socketMapName = socketTags?.[2];
      if (socketMapName === mapName) {
        count++;
      }
    });
    
    return count;
  }

  // Optional: Method to get list of connection IDs in the same map
  private getConnectionsInSameMap(ws: WebSocket): string[] {
    const tags = this.ctx.getTags(ws);
    const mapName = tags?.[2]; // mapName is the 3rd tag
    
    const connections: string[] = [];
    this.ctx.getWebSockets().forEach(socket => {
      const socketTags = this.ctx.getTags(socket);
      const socketMapName = socketTags?.[2];
      const connectionId = socketTags?.[0];
      
      if (socketMapName === mapName && connectionId) {
        connections.push(connectionId);
      }
    });
    
    return connections;
  }
}