import { useEffect, useState, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';

import { getCookie, setCookie } from '@/app/utils/cookie';

export function useHostPeerSession(mapName: string) {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [peerId, setPeerId] = useState<string>('');
  const connectionsRef = useRef<DataConnection[]>([]);

  useEffect(() => {
    let id = getCookie(`peerId-${mapName}`);
    if (!id) {
      id = `${mapName}-${Math.random().toString(36).substring(2, 15)}`;
      setCookie(`peerId-${mapName}`, id);
    }
    setPeerId(id);
  }, [mapName]);

  useEffect(() => {
    if (!peerId) return;
    const p = new Peer(peerId);
    setPeer(p);

    p.on('open', (id) => {
      console.log('Host peer ID:', id);
    });

    p.on('connection', (conn) => {
      setConnections((prev) => {
        const updated = [...prev, conn];
        connectionsRef.current = updated;
        return updated;
      });
      console.log('New connection from', conn.peer);
      conn.on('data', (data) => {
        console.log(`Received from ${conn.peer}:`, data);
        // Handle incoming data per connection here
      });
      conn.on('close', () => {
        setConnections((prev) => {
          const updated = prev.filter((c) => c.peer !== conn.peer);
          connectionsRef.current = updated;
          return updated;
        });
        console.log(`Connection to ${conn.peer} closed.`);
      });
    });

    p.on('disconnected', () => {
      console.log('Host peer disconnected');
    });

    return () => {
      p.destroy();
      setConnections([]);
      connectionsRef.current = [];
    };
  }, [peerId]);

  // Broadcast data to all connected peers
  const broadcastData = (data: unknown) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) conn.send(data);
    });
  };

  // Send data to a specific peer
  const sendDataToPeer = (peerId: string, data: unknown) => {
    const conn = connectionsRef.current.find((c) => c.peer === peerId);
    if (conn && conn.open) {
      conn.send(data);
    }
  };

  // Get all connected peer IDs
  const connectedPeerIds = connections.map((c) => c.peer);

  return {
    peer,
    connections,
    connectedPeerIds,
    broadcastData,
    sendDataToPeer,
    peerId,
  };
}
