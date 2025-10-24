'use client';

import { ThemeToggleSimple } from '@/app/components/theme-toggle';
import useWebhooks from '@/app/hooks/useWebhooks';
import Websockets from '@/app/map/components/Websockets/Test';
import { useSearchParams } from 'next/navigation';
import { CombatLog } from '../../map/components/CombatLog';
import '../../map/index.css';
import { UserMapProvider, useUserMapContext } from '../context/UserMapContext';
import useUserHotkeys from '../useUserHotKeys';
import ConnectionCard from './ConnectionCard';
import { PlayerHPControls } from './PlayerHPControls';
import ReadOnlyGrid from './ReadOnlyGrid';
import ReadOnlyInitiativePanel from './ReadOnlyInitiativePanel';

const UserMapView = () => {
  const { state, actions, handlers } = useUserMapContext();

  const { gameState, username, submitted, messageCount, selectedCharacterId } =
    state;
  const {
    setGameState,
    setUsername,
    setSubmitted,
    setMessageCount,
    setSelectedCharacterId,
  } = actions;

  const searchParams = useSearchParams();
  const mapName = searchParams.get('mapName') ?? 'Shadow Over Orlando';
  const hostId = searchParams.get('connectionId');

  useUserHotkeys({ setSelectedCharacterId });

  // Only connect after username is submitted
  const ready = Boolean(submitted && hostId);

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
    sendMessage,
    clearError,
  } = useWebhooks({ mapName, playerId: username });

  const selectedCharacter = gameState?.characters.find(
    (c) => c.id === selectedCharacterId && c.isPlayer
  );

  const handleUpdateHp = (newHp: number) => {
    // if (!selectedCharacter || !guestMap?.send) return;
    // guestMap.send({
    //   type: 'updateHp',
    //   characterId: selectedCharacter.id,
    //   newHp,
    // });
  };

  const handleAddCondition = (condition: string) => {
    // if (!selectedCharacter || !guestMap?.send) return;
    // guestMap.send({
    //   type: 'addCondition',
    //   characterId: selectedCharacter.id,
    //   condition,
    // });
  };

  const handleRemoveCondition = (condition: string) => {
    // if (!selectedCharacter || !guestMap?.send) return;
    // guestMap.send({
    //   type: 'removeCondition',
    //   characterId: selectedCharacter.id,
    //   condition,
    // });
  };

  const handleToggleStatus = (
    statusType: 'advantage' | 'disadvantage' | 'concentration'
  ) => {
    // if (!selectedCharacter || !guestMap?.send) return;
    // const currentValue =
    //   statusType === 'advantage'
    //     ? selectedCharacter.hasAdvantage
    //     : statusType === 'disadvantage'
    //       ? selectedCharacter.hasDisadvantage
    //       : selectedCharacter.concentrating;
    // guestMap.send({
    //   type: 'toggleStatus',
    //   characterId: selectedCharacter.id,
    //   statusType,
    //   value: !currentValue,
    // });
  };

  return (
    <main className="flex-1 flex gap-4 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center text-sm gap-2">
          <ThemeToggleSimple />
          <span> Toggle Dark/Light Theme</span>
        </div>
        <ConnectionCard
          username={username}
          setUsername={setUsername}
          submitted={submitted}
          setSubmitted={setSubmitted}
          guestMap={null}
          mapName={mapName}
        />
        <Websockets
          isConnected={isConnected}
          isConnecting={isConnecting}
          error={error}
          lastMessage={lastMessage}
          connectionId={connectionId}
          connect={connect}
          disconnect={disconnect}
          sendMessage={sendMessage}
          clearError={clearError}
        />
      </div>

      <div style={{ width: '100%', height: '100%' }}>
        <div>
          <h3>Current Map State:</h3>
          <p>Messages received: {messageCount}</p>

          <ReadOnlyGrid
            handleCellMouseDown={() => {}}
            handleCellMouseEnter={() => {}}
            broadcastData={() => {}}
          />

          <pre>
            MAP: {gameState?.mapWidth}x{gameState?.mapHeight}
          </pre>

          {selectedCharacter && (
            <div className="mt-4">
              <PlayerHPControls
                character={selectedCharacter}
                onUpdateHp={handleUpdateHp}
                onAddCondition={handleAddCondition}
                onRemoveCondition={handleRemoveCondition}
                onToggleAdvantage={() => handleToggleStatus('advantage')}
                onToggleDisadvantage={() => handleToggleStatus('disadvantage')}
                onToggleConcentration={() =>
                  handleToggleStatus('concentration')
                }
              />
            </div>
          )}

          {selectedCharacter && (
            <div className="mb-2 p-2 border rounded bg-gray-50">
              <h4 className="font-bold">Selected Character:</h4>
              <p>Name: {selectedCharacter.name}</p>
              <p>Type: {selectedCharacter.isPlayer ? 'PC' : 'NPC'}</p>
              <p>
                Position: ({selectedCharacter.x}, {selectedCharacter.y})
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="w-64 flex-shrink-0 flex flex-col gap-4">
        <ReadOnlyInitiativePanel />
        <CombatLog damageLog={gameState?.damageLog || []} />
      </div>
    </main>
  );
};

const MapWithContext = () => (
  <UserMapProvider>
    <UserMapView />
  </UserMapProvider>
);

export default MapWithContext;
