'use client';
import useWebhooks from '@/app/hooks/useWebhooks';

function GameComponent() {
  const {
    isConnected,
    isConnecting,
    error,
    lastMessage,
    connectionId,
    connect,
    disconnect,
    sendGameUpdate,
    sendPlayerAction,
    clearError,
  } = useWebhooks();

  // Send game updates
  const handleCharacterMove = (
    characterId: string,
    position: { x: number; y: number }
  ) => {
    sendGameUpdate({
      characterId,
      position,
    });
  };

  // Send player actions
  const handlePlayerAction = (actionType: string, playerId: string) => {
    sendPlayerAction({
      actionType,
      playerId,
      data: { timestamp: Date.now() },
    });
  };

  return (
    <div>
      <p>
        Status:{' '}
        {isConnected
          ? 'Connected'
          : isConnecting
            ? 'Connecting...'
            : 'Disconnected'}
      </p>
      <p>Connection ID: {connectionId}</p>
      {error && <p>Error: {error}</p>}
      <button onClick={() => connect()}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}

export default GameComponent;
