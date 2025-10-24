import { FC } from 'react';

interface WebsocketsProps {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: any;
  connectionId: string | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (type: string, data: any) => void;
  clearError: () => void;
  players?: string[];
}

const Websockets: FC<WebsocketsProps> = ({
  isConnected,
  isConnecting,
  error,
  lastMessage,
  connectionId,
  connect,
  disconnect,
  sendMessage,
  clearError,
  players,
}) => {
  const sendDummyMessage = () => {
    sendMessage('chat_message', {
      message: 'Hello from client!',
      playerName: 'TestPlayer',
    });
  };

  return (
    <div>
      <div>
        <p>
          Status:{' '}
          {isConnected
            ? 'Connected'
            : isConnecting
              ? 'Connecting...'
              : 'Disconnected'}
        </p>
        {error && <p>Error: {error}</p>}

        {!isConnected && (
          <button
            style={{
              backgroundColor: isConnected ? 'gray' : 'blue',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: isConnected ? 'not-allowed' : 'pointer',
            }}
            onClick={() => connect()}
          >
            Connect
          </button>
        )}

        {isConnected && (
          <button
            style={{
              backgroundColor: 'red',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '8px',
            }}
            onClick={disconnect}
          >
            Disconnect
          </button>
        )}

        {isConnected && (
          <button
            onClick={sendDummyMessage}
            style={{
              backgroundColor: 'blue',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              marginLeft: '8px',
            }}
          >
            Send Message
          </button>
        )}

        <div>
          {players?.map((player, idx) => (
            <div key={idx}>Player: {player}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Websockets;
