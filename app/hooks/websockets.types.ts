export interface GameData {
  characterId?: string;
  position?: { x: number; y: number };
  hp?: number;
  conditions?: Record<string, boolean>;
  mapData?: unknown;
  [key: string]: unknown;
}

export interface PlayerAction {
  actionType: string;
  playerId: string;
  targetId?: string;
  data?: unknown;
  [key: string]: unknown;
}

export interface WebhookMessage {
  type: string;
  data:
    | GameData
    | PlayerAction
    | { connectionId?: string; message?: string; [key: string]: unknown };
  timestamp: number;
  id?: string;
  connectionId?: string;
  playerId?: string;
}

export interface WebhookConnection {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebhookMessage | null;
  connectionId: string | null;
}
