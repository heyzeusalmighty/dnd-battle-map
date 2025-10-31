import type {
  AddConditionMessage,
  AppSnapshot,
  RemoveConditionMessage,
  SnapshotUpdate,
  ToggleStatusMessage,
  UpdateHpMessage,
} from '@/app/map/types';
import { getCookie, setCookie } from '@/app/utils/cookie';
import Peer, { type DataConnection } from 'peerjs';
import { useEffect, useRef, useState } from 'react';

// Utility function to detect browser (same as useGuestMap)
const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  const isFirefox = userAgent.indexOf('Firefox') > -1;
  const isChrome = userAgent.indexOf('Chrome') > -1;
  const isSafari = userAgent.indexOf('Safari') > -1 && !isChrome;
  const isEdge = userAgent.indexOf('Edge') > -1;

  return {
    userAgent,
    isFirefox,
    isChrome,
    isSafari,
    isEdge,
    browserName: isFirefox
      ? 'Firefox'
      : isChrome
        ? 'Chrome'
        : isSafari
          ? 'Safari'
          : isEdge
            ? 'Edge'
            : 'Unknown',
  };
};

interface MoveCharacterMessage {
  type: 'moveCharacter';
  characterId: string;
  x: number;
  y: number;
}

export function useHostPeerSession({
  mapName,
  moveCharacterCallback,
  getCurrentGameState,
  updateHpCallback,
  addConditionCallback,
  removeConditionCallback,
  toggleStatusCallback,
  undoCallback,
}: {
  mapName: string;
  moveCharacterCallback?: (characterId: string, x: number, y: number) => void;
  getCurrentGameState: () => AppSnapshot | undefined;
  updateHpCallback?: (characterId: string, newHp: number) => void;
  addConditionCallback?: (characterId: string, condition: string) => void;
  removeConditionCallback?: (characterId: string, condition: string) => void;
  toggleStatusCallback?: (
    characterId: string,
    statusType: 'advantage' | 'disadvantage' | 'concentration',
    value: boolean
  ) => void;
  undoCallback?: () => void;
}) {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [peerId, setPeerId] = useState<string>('');
  const connectionsRef = useRef<DataConnection[]>([]);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    console.log('[useHostMap] Initializing peer ID for map:', mapName);
    let id = getCookie(`peerId-${mapName}`);
    if (!id) {
      id = `${mapName}-${Math.random().toString(36).substring(2, 15)}`;
      setCookie(`peerId-${mapName}`, id);
      console.log('[useHostMap] Generated new peer ID:', id);
    } else {
      console.log('[useHostMap] Using existing peer ID:', id);
    }
    setPeerId(id);
  }, [mapName]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: peerId is only set once
  useEffect(() => {
    if (!peerId) {
      console.log('[useHostMap] No peer ID available yet');
      return;
    }

    const browserInfo = getBrowserInfo();
    console.log('[useHostMap] Browser Info:', browserInfo);
    console.log('[useHostMap] Creating host peer with ID:', peerId);
    console.log('[useHostMap] WebRTC Support Check:', {
      RTCPeerConnection: typeof RTCPeerConnection !== 'undefined',
      RTCDataChannel: typeof RTCDataChannel !== 'undefined',
      getUserMedia: typeof navigator.mediaDevices?.getUserMedia !== 'undefined',
    });

    // Enhanced peer configuration for better compatibility
    const peerConfig = {
      debug: 2, // Enable debug logging
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          // Add Mozilla STUN server for Firefox compatibility
          { urls: 'stun:stun.mozilla.org:3478' },
        ],
        iceTransportPolicy: 'all' as RTCIceTransportPolicy,
        bundlePolicy: 'balanced' as RTCBundlePolicy,
        rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
      },
    };

    console.log('[useHostMap] Creating peer with config:', peerConfig);
    const p = new Peer(peerId, peerConfig);
    setPeer(p);

    // Add timeout for peer opening
    const openTimeout = setTimeout(() => {
      console.error('[useHostMap] Peer failed to open within 30 seconds');
      if (p && !p.destroyed) {
        console.log('[useHostMap] Destroying timed-out peer');
        p.destroy();
      }
    }, 30000);

    p.on('open', (id) => {
      console.log('[useHostMap] ✅ Host peer opened successfully with ID:', id);
      console.log('[useHostMap] Peer is ready to accept connections');
      clearTimeout(openTimeout);

      // Log peer server connection details
      console.log('[useHostMap] Peer server details:', {
        host: p.options.host,
        port: p.options.port,
        path: p.options.path,
        secure: p.options.secure,
      });
    });

    p.on('connection', (conn) => {
      console.log(
        '[useHostMap] 🔗 New connection attempt from peer:',
        conn.peer
      );
      console.log('[useHostMap] Connection details:', {
        peer: conn.peer,
        connectionId: conn.connectionId,
        metadata: conn.metadata,
        open: conn.open,
        reliable: conn.reliable,
      });

      setConnections((prev) => {
        const updated = [...prev, conn];
        connectionsRef.current = updated;
        console.log('[useHostMap] Total connections now:', updated.length);
        return updated;
      });

      // Monitor connection state changes
      if (conn.peerConnection) {
        conn.peerConnection.addEventListener('connectionstatechange', () => {
          console.log('[useHostMap] Connection state changed:', {
            peer: conn.peer,
            state: conn.peerConnection.connectionState,
          });
        });

        conn.peerConnection.addEventListener('iceconnectionstatechange', () => {
          console.log('[useHostMap] ICE connection state changed:', {
            peer: conn.peer,
            state: conn.peerConnection.iceConnectionState,
          });
        });

        conn.peerConnection.addEventListener('icegatheringstatechange', () => {
          console.log('[useHostMap] ICE gathering state changed:', {
            peer: conn.peer,
            state: conn.peerConnection.iceGatheringState,
          });
        });
      }

      // Wait for connection to be fully established
      conn.on('open', () => {
        console.log(
          '[useHostMap] ✅ Connection fully established with:',
          conn.peer
        );

        // send the current game state immediately upon connection
        const snap = getCurrentGameState();
        console.log('[useHostMap] Sending current game state to', conn.peer);
        console.log(
          '[useHostMap] Game state snapshot:',
          snap ? 'Available' : 'Not available'
        );

        if (snap) {
          setTimeout(() => {
            try {
              conn.send({ type: 'snapshot', snapShot: snap } as SnapshotUpdate);
              console.log(
                '[useHostMap] ✅ Game state sent successfully to',
                conn.peer
              );
            } catch (error) {
              console.error(
                '[useHostMap] ❌ Failed to send game state to',
                conn.peer,
                error
              );
            }
          }, 1000);
        }
      });

      conn.on('data', (data) => {
        console.log('[useHostMap] 📨 Received data from', conn.peer, ':', data);

        if (data && typeof data === 'object' && 'type' in data) {
          switch (data.type) {
            case 'moveCharacter': {
              const { characterId, x, y } = data as MoveCharacterMessage;
              console.log('[useHostMap] Processing move character:', {
                characterId,
                x,
                y,
              });
              moveCharacterCallback?.(characterId, x, y);
              break;
            }
            case 'updateHp': {
              const { characterId, newHp } = data as UpdateHpMessage;
              console.log(`HP update for ${characterId} to ${newHp}`);
              updateHpCallback?.(characterId, newHp);
              break;
            }

            case 'addCondition': {
              const { characterId, condition } = data as AddConditionMessage;
              console.log(`Add condition "${condition}" to ${characterId}`);
              addConditionCallback?.(characterId, condition);
              break;
            }

            case 'removeCondition': {
              const { characterId, condition } = data as RemoveConditionMessage;
              console.log(
                `Remove condition "${condition}" from ${characterId}`
              );
              removeConditionCallback?.(characterId, condition);
              break;
            }

            case 'toggleStatus': {
              const { characterId, statusType, value } =
                data as ToggleStatusMessage;
              console.log(
                `Toggle ${statusType} to ${value} for ${characterId}`
              );
              toggleStatusCallback?.(characterId, statusType, value);
              break;
            }

            case 'undoAction': {
              console.log('Undo requested');
              undoCallback?.();
              break;
            }

            default:
              console.warn(
                `[useHostMap] ⚠️ Unknown data type received from ${conn.peer}:`,
                data
              );
          }
        } else {
          console.warn(
            '[useHostMap] ⚠️ Invalid data format received from',
            conn.peer,
            ':',
            data
          );
        }
      });

      // this is what happens when a peer disconnects nicely
      conn.on('close', () => {
        console.log(
          '[useHostMap] 🔌 Connection closed gracefully with:',
          conn.peer
        );
        setConnections((prev) => {
          const updated = prev.filter((c) => c.peer !== conn.peer);
          connectionsRef.current = updated;
          console.log('[useHostMap] Remaining connections:', updated.length);
          return updated;
        });
      });

      conn.on('iceStateChanged', () => {
        const connectionState = conn.peerConnection?.connectionState;
        const iceState = conn.peerConnection?.iceConnectionState;

        console.log('[useHostMap] ICE state changed for', conn.peer, {
          connectionState,
          iceState,
          connectionOpen: conn.open,
        });

        // Handle connection state changes more precisely
        if (
          connectionState === 'failed' ||
          connectionState === 'disconnected' ||
          iceState === 'failed'
        ) {
          console.log(
            '[useHostMap] 💥 Connection failed/disconnected with:',
            conn.peer
          );
          setConnections((prev) => {
            const updated = prev.filter((c) => c.peer !== conn.peer);
            connectionsRef.current = updated;
            console.log(
              '[useHostMap] Removed failed connection. Remaining:',
              updated.length
            );
            return updated;
          });
        } else if (
          connectionState === 'connected' &&
          iceState === 'connected'
        ) {
          console.log(
            '[useHostMap] ✅ Connection fully established with:',
            conn.peer
          );
        }
      });

      conn.on('error', (err) => {
        console.error(
          '[useHostMap] ❌ Connection error with',
          conn.peer,
          ':',
          err
        );
        console.error('[useHostMap] Error details:', {
          name: err.name,
          message: err.message,
          type: err.type,
          stack: err.stack,
        });

        // Remove errored connection
        setConnections((prev) => {
          const updated = prev.filter((c) => c.peer !== conn.peer);
          connectionsRef.current = updated;
          console.log(
            '[useHostMap] Removed errored connection. Remaining:',
            updated.length
          );
          return updated;
        });
      });
    });

    p.on('disconnected', () => {
      console.warn(
        '[useHostMap] 🔌 Host peer disconnected from signaling server'
      );
      console.log('[useHostMap] Attempting to reconnect...');
      if (!p.destroyed) {
        p.reconnect();
      }
    });

    p.on('error', (error) => {
      console.error('[useHostMap] ❌ Host peer error:', error);
      console.error('[useHostMap] Peer error details:', {
        name: error.name,
        message: error.message,
        type: error.type,
        destroyed: p.destroyed,
        disconnected: p.disconnected,
        id: p.id,
      });

      // Clear timeout on error
      clearTimeout(openTimeout);
    });

    p.on('close', () => {
      console.log('[useHostMap] 🔌 Host peer closed');
      clearTimeout(openTimeout);
    });

    return () => {
      console.log('[useHostMap] 🧹 Cleaning up host peer');
      clearTimeout(openTimeout);
      if (p && !p.destroyed) {
        console.log(
          '[useHostMap] Destroying peer with',
          connectionsRef.current.length,
          'connections'
        );
        p.destroy();
      }
      setConnections([]);
      connectionsRef.current = [];
    };
  }, [peerId]);

  // Broadcast data to all connected peers
  const broadcastData = (data: unknown) => {
    const activeConnections = connectionsRef.current.filter(
      (conn) => conn.open
    );

    if (
      typeof data === 'object' &&
      data !== null &&
      'type' in data &&
      (data as { type: string }).type === 'snapshot'
    ) {
      setMessageCount((c) => c + 1);
    }

    let successCount = 0;
    let failCount = 0;

    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(data);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(
            '[useHostMap] ❌ Failed to send data to',
            conn.peer,
            ':',
            error
          );
        }
      } else {
        console.warn('[useHostMap] ⚠️ Skipping closed connection to', conn.peer);
      }
    });
  };

  // Send data to a specific peer
  const sendDataToPeer = (peerId: string, data: unknown) => {
    console.log('[useHostMap] 📤 Sending data to specific peer:', peerId, data);
    const conn = connectionsRef.current.find((c) => c.peer === peerId);

    if (conn?.open) {
      try {
        conn.send(data);
        console.log('[useHostMap] ✅ Data sent successfully to', peerId);
      } catch (error) {
        console.error(
          '[useHostMap] ❌ Failed to send data to',
          peerId,
          ':',
          error
        );
      }
    } else {
      console.warn(
        '[useHostMap] ⚠️ Cannot send to',
        peerId,
        '- connection not open or not found'
      );
      console.log(
        '[useHostMap] Available connections:',
        connectionsRef.current.map((c) => ({ peer: c.peer, open: c.open }))
      );
    }
  };

  // Get all connected peer IDs
  const connectedPeerIds = connections.map((c) => c.peer);

  // Debug information
  const debugInfo = {
    browserInfo: getBrowserInfo(),
    peerId,
    peerOpen: peer?.open || false,
    peerDestroyed: peer?.destroyed || false,
    totalConnections: connections.length,
    openConnections: connections.filter((c) => c.open).length,
    connectionDetails: connections.map((c) => ({
      peer: c.peer,
      open: c.open,
      reliable: c.reliable,
      metadata: c.metadata,
    })),
  };

  return {
    peer,
    connections,
    connectedPeerIds,
    broadcastData,
    sendDataToPeer,
    peerId,
    debugInfo,
  };
}
