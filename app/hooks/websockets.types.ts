import type { AppSnapshot } from '../map/types';

export interface GameData {
  characterId?: string;
  position?: { x: number; y: number };
  hp?: number;
  conditions?: Record<string, boolean>;
  mapData?: unknown;
  [key: string]: unknown;
}

type PlayerActionType =
  | 'updateHp'
  | 'addCondition'
  | 'removeCondition'
  | 'toggleStatus'
  | string;

export interface PlayerAction {
  actionType: PlayerActionType;
  characterId: string;
  targetId?: string;
  data?: unknown;
  [key: string]: unknown;
}

export interface MoveCharacterData {
  characterId: string;
  position: { x: number; y: number };
  [key: string]: unknown;
}

export interface WebhookMessage {
  type: string;
  data:
    | AppSnapshot
    | PlayerAction
    | GameData
    | { connectionId?: string; message?: string; [key: string]: unknown };
  timestamp: number;
  id?: string;
  connectionId?: string;
  playerId?: string;
  connectedClients?: string[];
}

export interface WebhookConnection {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebhookMessage | null;
  connectionId: string | null;
}

export interface ConnectedPlayer {
  playerId: string;
  connectionId: string;
}
