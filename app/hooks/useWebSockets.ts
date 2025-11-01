import { useCallback, useRef, useState } from 'react';
import type { AppSnapshot, DamageEvent } from '../map/types';
import type {
  ConnectedPlayer,
  MoveCharacterData,
  PlayerAction,
  WebSocketConnection,
  WebSocketMessage,
} from './websockets.types';

interface UseWebSocketsReturn extends WebSocketConnection {
  connect: (options?: { reconnect?: boolean }) => void;
  disconnect: () => void;
  sendMessage: (
    type: string,
    data: AppSnapshot | PlayerAction | Record<string, unknown>
  ) => void;
  sendGameUpdate: (gameData: AppSnapshot) => void;
  sendPlayerAction: (action: PlayerAction) => void;
  sendMoveCharacter: (action: MoveCharacterData) => void;
  sendDamageLog: (logData: DamageEvent) => void;
  clearError: () => void;
  players: ConnectedPlayer[];
}

const WEBSOCKET_WORKER_URL = process.env.NEXT_PUBLIC_WS_HOST;

interface WebSocketsProps {
  mapName: string;
  playerId: string;
}

const useWebSockets = (props: WebSocketsProps): UseWebSocketsReturn => {
  const { mapName, playerId } = props;

  const [players, setPlayers] = useState<ConnectedPlayer[]>([]);

  const wsRef = useRef<WebSocket | null>(null);

  const [state, setState] = useState<WebSocketConnection>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    connectionId: null,
  });

  const updateState = useCallback((updates: Partial<WebSocketConnection>) => {
    setState((prev) => ({ ...prev, ...updates }));
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
      connectionId: null,
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
      const wsUrl = `${proto}://${WEBSOCKET_WORKER_URL}?connectionId=${connectionId}&clientType=web&mapName=${mapName}`;

      console.log('Connecting to Cloudflare WebSocket worker:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to Cloudflare WebSocket worker');

        updateState({
          isConnected: true,
          isConnecting: false,
          error: null,
          connectionId,
        });

        // Send initial handshake
        ws.send(
          JSON.stringify({
            type: 'handshake',
            data: {
              mapName,
              playerId,
            },
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('Received websocket message:', message);

          updateState({ lastMessage: message });

          // Handle specific message types
          switch (message.type) {
            case 'player_connected': {
              console.log('Player connected:', message);

              const {
                playerId,
                connectionId = '',
                connectedClients = [],
              } = message;
              if (playerId && !players.find((p) => p.playerId === playerId)) {
                const stillHerePlayers = players.filter((p) =>
                  connectedClients.some((c: string) => c === p.connectionId)
                );

                setPlayers([...stillHerePlayers, { playerId, connectionId }]);
              }
              window.dispatchEvent(
                new CustomEvent('playerConnected', { detail: message })
              );
              break;
            }

            case 'player_disconnected':
              console.log('Player disconnected:', message);
              setPlayers((prev) =>
                prev.filter(
                  (player) => player.connectionId !== message.connectionId
                )
              );
              window.dispatchEvent(
                new CustomEvent('playerDisconnected', { detail: message })
              );
              break;

            case 'game_update':
              console.log('Game update received:', message.data);
              window.dispatchEvent(
                new CustomEvent('gameUpdate', { detail: message.data })
              );
              break;

            case 'player_action':
              console.log('Player action received:', message.data);
              window.dispatchEvent(
                new CustomEvent('playerAction', { detail: message.data })
              );
              break;

            case 'move_character':
              window.dispatchEvent(
                new CustomEvent('moveCharacter', { detail: message.data })
              );
              break;

            case 'damage_log':
              console.log('Damage log received:', message.data);
              window.dispatchEvent(
                new CustomEvent('damageLog', { detail: message.data })
              );
              break;

            case 'error': {
              console.error('WebSocket error message:', message.data);
              // Safely narrow message.data to an indexable object and check the "message" property
              const maybeData = message.data as
                | Record<string, unknown>
                | undefined;
              const errorMessage =
                maybeData && typeof maybeData.message === 'string'
                  ? (maybeData.message as string)
                  : 'Unknown error';
              updateState({ error: errorMessage });
              break;
            }

            case 'handshake_ack':
              console.log(
                'Handshake acknowledged by server',
                message.connectionId
              );
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
          isConnecting: false,
        });
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);

        wsRef.current = null;
        updateState({
          isConnected: false,
          isConnecting: false,
          connectionId: null,
        });
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      updateState({
        isConnecting: false,
        error: 'Failed to create WebSocket connection',
      });
    }
  }, [state.isConnecting, updateState, mapName, playerId, players]);

  const sendMessage = useCallback(
    (
      type: string,
      data:
        | AppSnapshot
        | PlayerAction
        | MoveCharacterData
        | DamageEvent
        | Record<string, unknown>
    ) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket not connected, cannot send message');
        updateState({ error: 'WebSocket not connected' });
        return;
      }

      const message: WebSocketMessage = {
        type,
        data,
        timestamp: Date.now(),
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      };

      try {
        wsRef.current.send(JSON.stringify(message));
        console.log('Sent websocket message:', message);
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        updateState({ error: 'Failed to send message' });
      }
    },
    [updateState]
  );

  const sendGameUpdate = useCallback(
    (gameData: AppSnapshot) => {
      sendMessage('game_update', gameData);
    },
    [sendMessage]
  );

  const sendPlayerAction = useCallback(
    (action: PlayerAction) => {
      sendMessage('player_action', action);
    },
    [sendMessage]
  );

  const sendMoveCharacter = useCallback(
    (action: MoveCharacterData) => {
      sendMessage('move_character', action);
    },
    [sendMessage]
  );

  const sendDamageLog = useCallback(
    (logData: DamageEvent) => {
      console.log('Sending damage log:', logData);
      sendMessage('damage_log', logData);
    },
    [sendMessage]
  );

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    sendGameUpdate,
    sendPlayerAction,
    sendMoveCharacter,
    sendDamageLog,
    clearError,
    players,
  };
};

export default useWebSockets;
