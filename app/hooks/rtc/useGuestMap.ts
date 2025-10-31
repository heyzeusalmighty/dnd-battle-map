import Peer, { type DataConnection } from 'peerjs';
import { useEffect, useRef, useState } from 'react';

// Utility function to detect browser
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

// Check for Firefox-specific WebRTC issues
const checkFirefoxWebRTCSupport = () => {
  const info = {
    hasRTCPeerConnection: typeof RTCPeerConnection !== 'undefined',
    hasDataChannel: typeof RTCDataChannel !== 'undefined',
    firefoxVersion: null as string | null,
    potentialIssues: [] as string[],
  };

  if (getBrowserInfo().isFirefox) {
    // Extract Firefox version
    const match = navigator.userAgent.match(/Firefox\/(\d+)/);
    if (match) {
      info.firefoxVersion = match[1];
      const version = parseInt(match[1], 10);

      // Check for known Firefox WebRTC issues
      if (version < 38) {
        info.potentialIssues.push(
          'Firefox version too old for reliable WebRTC support'
        );
      }
      if (version >= 72 && version < 78) {
        info.potentialIssues.push(
          'Known WebRTC reliability issues in Firefox 72-77'
        );
      }
      if (version < 60) {
        info.potentialIssues.push(
          'Firefox versions below 60 have limited WebRTC data channel support'
        );
      }
    }

    // Check for Firefox-specific settings that might affect WebRTC
    if (typeof navigator.mediaDevices === 'undefined') {
      info.potentialIssues.push(
        'MediaDevices not available - might indicate privacy settings blocking WebRTC'
      );
    }

    // Check WebRTC configuration support
    try {
      // Test if Firefox supports the required WebRTC configuration
      const testConfig = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      };
      const testPeer = new RTCPeerConnection(testConfig);
      testPeer.close();
    } catch {
      info.potentialIssues.push(
        'WebRTC configuration test failed - check browser settings'
      );
    }

    // Check Firefox privacy settings
    if (navigator.doNotTrack === '1') {
      info.potentialIssues.push(
        'Do Not Track is enabled - may affect WebRTC connections'
      );
    }

    // Check if running in private browsing (affects WebRTC in Firefox)
    try {
      // Check for IndexedDB to detect private browsing
      if (!('indexedDB' in window)) {
        info.potentialIssues.push(
          'Private browsing mode detected - WebRTC may be limited'
        );
      }
    } catch {
      // Ignore errors in detection
    }

    // Check if WebRTC is disabled in Firefox
    try {
      const testDataChannel = new RTCPeerConnection().createDataChannel('test');
      testDataChannel.close();
    } catch {
      info.potentialIssues.push('WebRTC data channels appear to be disabled');
    }
  }

  return info;
};

export function useGuestMap({
  hostId,
  username,
  start,
}: {
  hostId: string | null;
  username: string | null;
  start: boolean;
}) {
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: start is only set once
  useEffect(() => {
    if (!hostId || !start) {
      console.log('[useGuestMap] Not starting connection:', { hostId, start });
      return;
    }

    const browserInfo = getBrowserInfo();
    const firefoxInfo = checkFirefoxWebRTCSupport();

    console.log('[useGuestMap] Browser Info:', browserInfo);
    console.log('[useGuestMap] Starting connection attempt to host:', hostId);
    console.log('[useGuestMap] Username:', username);
    console.log('[useGuestMap] WebRTC Support:', {
      RTCPeerConnection: typeof RTCPeerConnection !== 'undefined',
      RTCDataChannel: typeof RTCDataChannel !== 'undefined',
      getUserMedia: typeof navigator.mediaDevices?.getUserMedia !== 'undefined',
    });

    if (browserInfo.isFirefox) {
      console.log('[useGuestMap] Firefox-specific info:', firefoxInfo);
      if (firefoxInfo.potentialIssues.length > 0) {
        console.warn(
          '[useGuestMap] Potential Firefox WebRTC issues detected:',
          firefoxInfo.potentialIssues
        );
      }
    }

    // Create a new Peer instance with a random ID
    // Firefox-friendly configuration
    const peerConfig = {
      debug: 2, // Enable debug logging for PeerJS
      // Use default PeerJS cloud server for better Firefox compatibility
      // Custom servers often cause issues with Firefox
      // Add Firefox-specific ICE server configuration
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          // Firefox-specific STUN servers
          { urls: 'stun:stun.mozilla.org:3478' },
          ...(browserInfo.isFirefox
            ? [
                // Additional STUN servers that work better with Firefox
                { urls: 'stun:stun.services.mozilla.com:3478' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
              ]
            : []),
        ],
        // Firefox-specific optimizations
        iceTransportPolicy: 'all' as RTCIceTransportPolicy,
        bundlePolicy: browserInfo.isFirefox
          ? ('max-bundle' as RTCBundlePolicy)
          : ('balanced' as RTCBundlePolicy),
        rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
        // Firefox-specific ICE candidate pooling
        ...(browserInfo.isFirefox && {
          iceCandidatePoolSize: 10,
        }),
      },
    };

    console.log('[useGuestMap] Creating peer with config:', peerConfig);
    const peer = new Peer(peerConfig);
    peerRef.current = peer;

    // Set up connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      console.error('[useGuestMap] Connection timeout after 30 seconds');
      if (peer && !peer.destroyed) {
        peer.destroy();
      }
    }, 30000);

    peer.on('open', (id) => {
      console.log('[useGuestMap] Peer opened with ID:', id);
      console.log('[useGuestMap] Attempting to connect to host:', hostId);

      // Firefox-specific connection setup with retry logic
      const connectToHost = (attempt = 1) => {
        console.log(`[useGuestMap] Connection attempt ${attempt}`);

        // Connect to the host with Firefox-specific options
        const connectionOptions = {
          metadata: { username },
          reliable: true, // Ensure reliable data channel
          ...(browserInfo.isFirefox && {
            // Firefox-specific data channel options
            serialization: 'json' as const,
          }),
        };

        const conn = peer.connect(hostId, connectionOptions);

        console.log('[useGuestMap] Connection object created:', {
          peer: conn.peer,
          connectionId: conn.connectionId,
          metadata: conn.metadata,
          attempt,
        });

        // Firefox-specific connection timeout per attempt
        const attemptTimeout = setTimeout(() => {
          console.warn(`[useGuestMap] Connection attempt ${attempt} timed out`);
          if (conn && !conn.open) {
            conn.close();

            // Retry logic for Firefox
            if (attempt < 3 && browserInfo.isFirefox) {
              console.log(
                `[useGuestMap] Retrying connection (attempt ${attempt + 1}/3)`
              );
              setTimeout(() => connectToHost(attempt + 1), 2000 * attempt); // Exponential backoff
            }
          }
        }, 15000); // 15 second timeout per attempt

        // Monitor connection state changes
        if (conn.peerConnection) {
          conn.peerConnection.addEventListener('connectionstatechange', () => {
            console.log(
              '[useGuestMap] Connection state changed:',
              conn.peerConnection.connectionState
            );
          });

          conn.peerConnection.addEventListener(
            'iceconnectionstatechange',
            () => {
              console.log(
                '[useGuestMap] ICE connection state changed:',
                conn.peerConnection.iceConnectionState
              );
            }
          );

          conn.peerConnection.addEventListener(
            'icegatheringstatechange',
            () => {
              console.log(
                '[useGuestMap] ICE gathering state changed:',
                conn.peerConnection.iceGatheringState
              );
            }
          );

          conn.peerConnection.addEventListener('signalingstatechange', () => {
            console.log(
              '[useGuestMap] Signaling state changed:',
              conn.peerConnection.signalingState
            );
          });
        }

        conn.on('open', () => {
          console.log('[useGuestMap] Connection opened successfully!');
          clearTimeout(attemptTimeout); // Clear the attempt timeout
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          setConnected(true);
          setConnection(conn);
        });

        conn.on('close', () => {
          console.log('[useGuestMap] Connection closed');
          clearTimeout(attemptTimeout);
          setConnected(false);
          setConnection(null);
        });

        conn.on('error', (error) => {
          console.error('[useGuestMap] Connection error:', error);
          console.error('[useGuestMap] Error details:', {
            name: error.name,
            message: error.message,
            type: error.type,
            stack: error.stack,
          });

          clearTimeout(attemptTimeout);
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }

          setConnected(false);
          setConnection(null);

          // Retry for Firefox on specific errors
          if (browserInfo.isFirefox && attempt < 3) {
            const shouldRetry =
              error.name === 'peer-unavailable' ||
              error.name === 'network' ||
              error.message.includes('connection failed') ||
              error.message.includes('timeout');

            if (shouldRetry) {
              console.log(
                `[useGuestMap] Retrying due to Firefox error (attempt ${attempt + 1}/3)`
              );
              setTimeout(() => connectToHost(attempt + 1), 3000 * attempt);
            }
          }
        });

        conn.on('data', (data) => {
          console.log('[useGuestMap] Received data:', data);
        });
      };

      // Start the first connection attempt
      connectToHost(1);
    });
    peer.on('error', (error) => {
      console.error('[useGuestMap] Peer error:', error);
      console.error('[useGuestMap] Peer error details:', {
        name: error.name,
        message: error.message,
        type: error.type,
        destroyed: peer.destroyed,
        disconnected: peer.disconnected,
      });

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    });

    peer.on('disconnected', () => {
      console.log('[useGuestMap] Peer disconnected');
    });

    peer.on('close', () => {
      console.log('[useGuestMap] Peer closed');
    });

    return () => {
      console.log('[useGuestMap] Cleaning up peer connection');

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      if (peer && !peer.destroyed) {
        peer.destroy();
      }
      setConnected(false);
      setConnection(null);
    };
  }, [hostId, start]); // Send data to host

  const send = (data: unknown) => {
    console.log('[useGuestMap] Attempting to send data:', data);
    console.log('[useGuestMap] Connection state:', {
      hasConnection: !!connection,
      connected,
      connectionOpen: connection?.open,
    });

    if (connection && connected && connection.open) {
      try {
        connection.send(data);
        console.log('[useGuestMap] Data sent successfully');
      } catch (error) {
        console.error('[useGuestMap] Error sending data:', error);
      }
    } else {
      console.warn('[useGuestMap] Cannot send data - connection not ready');
    }
  };

  // Listen for data from host
  const onData = (callback: (data: unknown) => void) => {
    console.log('[useGuestMap] Setting up data listener');

    if (connection) {
      connection.on('data', (data) => {
        console.log('[useGuestMap] Data received from host:', data);
        callback(data);
      });
    } else {
      console.warn('[useGuestMap] Cannot set up data listener - no connection');
    }
  };

  // Return debugging info along with the main functionality
  const debugInfo = {
    browserInfo: getBrowserInfo(),
    firefoxInfo: getBrowserInfo().isFirefox
      ? checkFirefoxWebRTCSupport()
      : null,
    peerId: peerRef.current?.id || null,
    peerDestroyed: peerRef.current?.destroyed || false,
    connectionOpen: connection?.open || false,
  };

  return {
    connected,
    send,
    onData,
    debugInfo,
  };
}
