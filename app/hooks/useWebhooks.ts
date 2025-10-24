
import { useCallback, useRef, useState } from 'react';

import type { GameData, PlayerAction, WebhookConnection, WebhookMessage } from './websockets.types';

interface UseWebhooksReturn extends WebhookConnection {
  connect: (options?: { reconnect?: boolean }) => void;
  disconnect: () => void;
  sendMessage: (type: string, data: GameData | PlayerAction | Record<string, unknown>) => void;
  sendGameUpdate: (gameData: GameData) => void;
  sendPlayerAction: (action: PlayerAction) => void;
  clearError: () => void;
  players: string[];
}

const WEBHOOK_WORKER_URL = process.env.NEXT_PUBLIC_WS_HOST;

interface WebHooksProps {
  mapName: string
  playerId: string
}


const useWebhooks = (props: WebHooksProps): UseWebhooksReturn => {
  const { mapName, playerId } = props;

  const [players, setPlayers] = useState<string[]>([]);

  

  const wsRef = useRef<WebSocket | null>(null);  
  
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
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }   
    
    updateState({
      isConnected: false,
      isConnecting: false,
      connectionId: null
    });
  }, [updateState]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    if (state.isConnecting) {
      console.log('WebSocket connection already in progress');
      return;
    }

    if (!playerId || playerId.trim() === '') {
      console.warn('Player ID is required to connect');
      updateState({ error: 'Player ID is required' });
      return;
    }

    updateState({ isConnecting: true, error: null });

    try {
      // Connect to Cloudflare WebSocket worker with query parameters
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${proto}://${WEBHOOK_WORKER_URL}?connectionId=${connectionId}&clientType=web&mapName=${mapName}`;
      
      console.log('Connecting to Cloudflare WebSocket worker:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to Cloudflare WebSocket worker');
        
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
            mapName,
            playerId
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
            case 'player_connected': {
              console.log('Player connected:', message);
              
              const { playerId } = message;
              if (playerId && !players.includes(playerId)) {
                setPlayers((prev) => [...prev, playerId]);
              }
              break;
            }

            case 'player_disconnected':
              console.log('Player disconnected:', message);
              setPlayers((prev) => prev.filter(id => id !== message.playerId));
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
              console.log('Handshake acknowledged by server', message.connectionId);
              if (typeof message.connectionId === 'string') {
                updateState({ connectionId: message.connectionId });
              }
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
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      updateState({
        isConnecting: false,
        error: 'Failed to create WebSocket connection'
      });
    }
  }, [state.isConnecting, updateState, mapName, playerId, players.includes]);

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



  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    sendGameUpdate,
    sendPlayerAction,
    clearError,
    players
  };
};

export default useWebhooks;