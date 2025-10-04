'use client';

import { useSearchParams } from 'next/navigation';
import { useGuestMap } from '../../hooks/rtc/useGuestMap';
import ReadOnlyGrid from './ReadOnlyGrid';
import { SnapshotUpdate } from '@/app/map/types';
import ConnectionCard from './ConnectionCard';
import '../../map/index.css';
import { useUserMapContext, UserMapProvider } from '../context/UserMapContext';
import ReadOnlyInitiativePanel from './ReadOnlyInitiativePanel';
import useUserHotkeys from '../useUserHotKeys';
import { CombatLog } from '../../map/components/CombatLog';

const UserMapView = () => {
  const { state, actions } = useUserMapContext();

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
  const guestMap = useGuestMap({ hostId, username, start: ready });

  // Listen for data if connected
  if (guestMap && guestMap.onData) {
    guestMap.onData((data: unknown) => {
      if (
        data &&
        typeof data === 'object' &&
        'type' in data &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any).type === 'snapshot'
      ) {
        setMessageCount((c) => c + 1);
        try {
          const dataObj = data as SnapshotUpdate;
          const newId = dataObj?.snapShot?.id;
          const oldId = gameState?.id;

          if (oldId === 0) {
            // this is the initial state on connection
            setGameState(dataObj.snapShot);
            return;
          }

          if (oldId && oldId !== newId && oldId < newId) {
            console.log(
              `Map ID changed from OLD =>  ${oldId} :::: NEW => ${newId}`
            );
            setGameState((data as SnapshotUpdate).snapShot);
          }
        } catch (e) {
          console.error('Error parsing snapshot data:', e);
        }
      } else {
        console.log('Received unknown data:', data);
      }
    });
  }

  const selectedCharacter =
    gameState?.characters.find((c) => c.id === selectedCharacterId) || null;

  return (
    <main className="flex-1 flex gap-4 p-4">
      <ConnectionCard
        username={username}
        setUsername={setUsername}
        submitted={submitted}
        setSubmitted={setSubmitted}
        guestMap={guestMap}
        mapName={mapName}
      />

      <div style={{ width: '100%', height: '100%' }}>
        <div>
          <h3>Current Map State:</h3>
          <p>Messages received: {messageCount}</p>

          <ReadOnlyGrid
            handleCellMouseDown={() => {}}
            handleCellMouseEnter={() => {}}
            broadcastData={guestMap ? guestMap.send : () => {}}
          />

          <pre>
            MAP: {gameState?.mapWidth}x{gameState?.mapHeight}
          </pre>
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
