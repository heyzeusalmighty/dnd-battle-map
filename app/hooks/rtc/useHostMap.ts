import { useEffect, useState } from 'react';
import Peer, { DataConnection } from 'peerjs';

import { getCookie, setCookie } from '@/app/utils/cookie';

export function useHostPeerSession(mapName: string) {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);
  const [peerId, setPeerId] = useState<string>('');

  useEffect(() => {
    let id = getCookie(`peerId-${mapName}`);
    if (!id) {
      id = `${mapName}-${Math.random().toString(36).substring(2, 15)}`;
      setCookie(`peerId-${mapName}`, id);
    }
    setPeerId(id);
  }, [mapName]);

  useEffect(() => {
    const p = new Peer(peerId);
    setPeer(p);

    p.on('open', (id) => {
      console.log('My peer ID is: ' + id);
    });

    p.on('connection', (conn) => {
      setConnection(conn);
      setRemotePeerId(conn.peer);

      console.log('Connected to', conn);

      conn.on('data', (data) => {
        console.log('Received', data);
      });
    });

    return () => {
      p.destroy();
    };
  }, [peerId]);

  // Connect to another peer
  const connectToPeer = (id: string) => {
    if (peer) {
      const conn = peer.connect(id);
      setConnection(conn);
      setRemotePeerId(id);
      conn.on('data', (data) => {
        console.log('Received', data);
      });
    }
  };

  // Send data to the connected peer
  const sendData = (data: any) => {
    if (connection) {
      connection.send(data);
    }
  };

  return { peer, connection, remotePeerId, connectToPeer, sendData };
}
