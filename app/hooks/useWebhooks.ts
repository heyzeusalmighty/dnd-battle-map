
import { useCallback, useEffect, useRef, useState } from 'react';

// Types for Cloudflare WebSocket worker
interface GameData {
  characterId?: string;
  position?: { x: number; y: number };
  hp?: number;
  conditions?: Record<string, boolean>;
  mapData?: unknown;
  [key: string]: unknown;
}

interface PlayerAction {
  actionType: string;
  playerId: string;
  targetId?: string;
  data?: unknown;
  [key: string]: unknown;
}

interface WebhookMessage {
  type: string;
  data: GameData | PlayerAction | { connectionId?: string; message?: string; [key: string]: unknown };
  timestamp: number;
  id?: string;
}

interface WebhookConnection {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: WebhookMessage | null;
  connectionId: string | null;
}

interface UseWebhooksReturn extends WebhookConnection {
  connect: (options?: { reconnect?: boolean }) => void;
  disconnect: () => void;
  sendMessage: (type: string, data: GameData | PlayerAction | Record<string, unknown>) => void;
  sendGameUpdate: (gameData: GameData) => void;
  sendPlayerAction: (action: PlayerAction) => void;
  clearError: () => void;
}

// Cloudflare WebSocket worker configuration
const WEBHOOK_WORKER_URL = process.env.NEXT_PUBLIC_WS_HOST;
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

const useWebhooks = (gameName: string): UseWebhooksReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const [state, setState] = useState<WebhookConnection>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    connectionId: null
  });

  const updateState = useCallback((updates: Partial<WebhookConnection>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    reconnectAttemptsRef.current = 0;
    updateState({
      isConnected: false,
      isConnecting: false,
      connectionId: null
    });
  }, [updateState]);

  const connect = useCallback((options: { reconnect?: boolean } = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    if (state.isConnecting) {
      console.log('WebSocket connection already in progress');
      return;
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    updateState({ isConnecting: true, error: null });

    try {
      // Connect to Cloudflare WebSocket worker with query parameters
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${proto}://${WEBHOOK_WORKER_URL}?connectionId=${connectionId}&clientType=web&gameName=${gameName}`;
      
      console.log('Connecting to Cloudflare WebSocket worker:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to Cloudflare WebSocket worker');
        reconnectAttemptsRef.current = 0;
        updateState({
          isConnected: true,
          isConnecting: false,
          error: null,
          connectionId
        });

        // Send initial handshake
        ws.send(JSON.stringify({
          type: 'handshake',
          data: {            
            gameName,            
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebhookMessage = JSON.parse(event.data);
          console.log('Received webhook message:', message);
          
          updateState({ lastMessage: message });

          // Handle specific message types
          switch (message.type) {
            case 'player_connected':
              console.log('Connection established with ID:', message.data.connectionId);
              if (typeof message.data.connectionId === 'string') {
                updateState({ connectionId: message.data.connectionId });
              }
              break;
            
            case 'game_update':
              console.log('Game update received:', message.data);
              // You can dispatch custom events or call callbacks here
              window.dispatchEvent(new CustomEvent('gameUpdate', { detail: message.data }));
              break;
            
            case 'player_action':
              console.log('Player action received:', message.data);
              window.dispatchEvent(new CustomEvent('playerAction', { detail: message.data }));
              break;
            
            case 'error': {
              console.error('WebSocket error message:', message.data);
              const errorMessage = typeof message.data.message === 'string' ? message.data.message : 'Unknown error';
              updateState({ error: errorMessage });
              break;
            }

            case 'handshake_ack':
              console.log('Handshake acknowledged by server', message.data);
              break;
            
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          updateState({ error: 'Failed to parse message' });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateState({
          error: 'WebSocket connection error',
          isConnecting: false
        });
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        
        wsRef.current = null;
        updateState({
          isConnected: false,
          isConnecting: false,
          connectionId: null
        });

        // // Auto-reconnect logic (unless manually disconnected)
        // if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        //   reconnectAttemptsRef.current++;
        //   console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
          
        //   reconnectTimeoutRef.current = setTimeout(() => {
        //     connect({ reconnect: true });
        //   }, RECONNECT_INTERVAL);
        // } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        //   updateState({ error: 'Max reconnection attempts reached' });
        // }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      updateState({
        isConnecting: false,
        error: 'Failed to create WebSocket connection'
      });
    }
  }, [state.isConnecting, updateState, gameName]);

  const sendMessage = useCallback((type: string, data: GameData | PlayerAction | Record<string, unknown>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      updateState({ error: 'WebSocket not connected' });
      return;
    }

    const message: WebhookMessage = {
      type,
      data,
      timestamp: Date.now(),
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };

    try {
      wsRef.current.send(JSON.stringify(message));
      console.log('Sent webhook message:', message);
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      updateState({ error: 'Failed to send message' });
    }
  }, [updateState]);

  const sendGameUpdate = useCallback((gameData: GameData) => {
    sendMessage('game_update', gameData);
  }, [sendMessage]);

  const sendPlayerAction = useCallback((action: PlayerAction) => {
    sendMessage('player_action', action);
  }, [sendMessage]);

  // // Auto-connect on mount
  // useEffect(() => {
  //   connect();

  //   // Cleanup on unmount
  //   return () => {
  //     disconnect();
  //   };
  // }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    sendGameUpdate,
    sendPlayerAction,
    clearError
  };
};

export default useWebhooks;