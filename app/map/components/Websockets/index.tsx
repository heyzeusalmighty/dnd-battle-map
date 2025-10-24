import { type FC, useMemo, useRef, useState } from 'react';
import { waitFor, waitForOpen } from './helpers';

type WebSocketMessage =
  | { type: 'status'; text: string; connectionId: string }
  | { type: 'chat_message'; message: string; playerName: string }
  | { type: 'connected'; connectionId: string }
  | {
      type: 'audio' | 'assistant';
      text?: string;
      audio?: string | { audio: string };
    };

type ChatMsg = { playerName: string; content: string };

interface WebsocketsProps {
  mapName?: string;
}

const Websockets: FC<WebsocketsProps> = ({ mapName }) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const serverReadyRef = useRef(false);

  const serverUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${process.env.NEXT_PUBLIC_WS_HOST}?mapName=${mapName || 'default'}`;
  }, [mapName]);

  const connect = () => {
    if (!serverUrl) return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const ws = new WebSocket(serverUrl);
    // ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      setConnected(true);
      setStatus('Connected');
    };
    ws.onclose = () => {
      setConnected(false);
      setStatus('');
    };
    ws.onerror = () => setStatus('WebSocket error');

    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      let msg: WebSocketMessage;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }

      console.log('received ws message:', msg);

      // ✅ handle server status — including the initial "ready" ping
      if (msg.type === 'status') {
        if (msg.text === 'ready') {
          serverReadyRef.current = true;
          setConnectionId(msg.connectionId);
          setStatus('Connected (server ready)');
        } else {
          setStatus(String(msg.text ?? ''));
        }
        return;
      }

      if (msg.type === 'connected') {
        console.log(`Connection established with ID: ${msg.connectionId}`);
        setConnectionId(msg.connectionId);
        return;
      }

      // show *your* words (server sends {type:"chat_message"})
      if (msg.type === 'chat_message') {
        console.log('Received chat message:', msg.message);
        setMessages((m) => [
          ...m,
          { playerName: msg.playerName, content: msg.message },
        ]);
        return;
      }
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const onStart = async () => {
    connect(); // creates wsRef.current
    await waitForOpen(wsRef.current!); // 1) socket OPEN
    try {
      await waitFor(() => serverReadyRef.current, 'server ready', 2500); // 2) DO ready ping
    } catch {
      console.warn("No 'ready' ping seen; proceeding after open()");
      serverReadyRef.current = true; // soft fallback
    }

    setStatus('Listening…');
  };

  const sendMessage = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setStatus('WebSocket not connected');
      return;
    }
    const msg: WebSocketMessage = {
      type: 'chat_message',
      message: 'Hello from client',
      playerName: 'DM',
    };
    wsRef.current.send(JSON.stringify(msg));
  };

  return (
    <div>
      {connected && (
        <button
          onClick={disconnect}
          style={{
            backgroundColor: 'red',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '8px',
          }}
        >
          Disconnect
        </button>
      )}

      {!connected && (
        <button
          onClick={onStart}
          style={{
            backgroundColor: connected ? 'gray' : 'blue',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: connected ? 'not-allowed' : 'pointer',
          }}
        >
          Connect to Server
        </button>
      )}

      <div>{connected ? 'WS connected' : 'WS disconnected'}</div>
      <div>Status: {status}</div>
      <div>Connection ID: {connectionId || 'N/A'}</div>

      <button
        onClick={sendMessage}
        style={{
          backgroundColor: !connected ? 'gray' : 'blue',
          color: 'white',
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          cursor: !connected ? 'not-allowed' : 'pointer',
        }}
      >
        Send Message
      </button>

      <div>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ margin: '8px 0' }}>
            <strong>{msg.playerName}:</strong> {msg.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Websockets;
