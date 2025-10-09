import Peer, { type DataConnection } from 'peerjs';
import { useEffect, useRef, useState } from 'react';

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

    // biome-ignore lint/correctness/useExhaustiveDependencies: start is only set once
    useEffect(() => {
    if (!hostId || !start) return;

    // Create a new Peer instance with a random ID
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      // Connect to the host
      const conn = peer.connect(hostId, {
        metadata: { username },
      });

      conn.on('open', () => {
        setConnected(true);
        setConnection(conn);
      });

      conn.on('close', () => {
        setConnected(false);
        setConnection(null);
      });

      conn.on('error', () => {
        setConnected(false);
        setConnection(null);
      });
    });

    return () => {
      peer.destroy();
      setConnected(false);
      setConnection(null);
    };
  }, [hostId, start]);

  // Send data to host
  const send = (data: unknown) => {
    if (connection && connected) {
      connection.send(data);
    }
  };

  // Listen for data from host
  const onData = (callback: (data: unknown) => void) => {
    if (connection) {
      connection.on('data', callback);
    }
  };

  return { connected, send, onData };
}
