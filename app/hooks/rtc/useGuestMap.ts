import { useEffect, useRef, useState } from 'react';
import Peer, { DataConnection } from 'peerjs';

export function useGuestMap(hostId: string) {
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    if (!hostId) return;

    // Create a new Peer instance with a random ID
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      // Connect to the host
      const conn = peer.connect(hostId);

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
  }, [hostId]);

  // Send data to host
  const send = (data: any) => {
    if (connection && connected) {
      connection.send(data);
    }
  };

  // Listen for data from host
  const onData = (callback: (data: any) => void) => {
    if (connection) {
      connection.on('data', callback);
    }
  };

  return { connected, send, onData };
}
