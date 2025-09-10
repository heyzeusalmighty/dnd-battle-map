'use client';
import { useState } from 'react';

import { useSearchParams } from 'next/navigation';
import { useGuestMap } from '../../hooks/rtc/useGuestMap';
import ReadOnlyGrid from './ReadOnlyGrid';
import { AppSnapshot, SnapshotUpdate } from '@/app/map/types';
import ConnectionCard from './ConnectionCard';

import '../../map/index.css';

const MapView = () => {
  const [username, setUsername] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  const [mapState, setMapState] = useState<AppSnapshot | null>(null);
  const searchParams = useSearchParams();
  const mapName = searchParams.get('mapName') ?? 'Shadow Over Orlando';
  const hostId = searchParams.get('connectionId');

  // Only connect after username is submitted
  const ready = Boolean(submitted && hostId);
  const guestMap = useGuestMap({ hostId, username, start: ready });

  // Listen for data if connected
  if (guestMap && guestMap.onData) {
    guestMap.onData((data: unknown) => {
      // console.log('data from host:', data);
      setMessageCount((c) => c + 1);

      if (
        data &&
        typeof data === 'object' &&
        'type' in data &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any).type === 'snapshot'
      ) {
        const dataObj = data as SnapshotUpdate;
        const newId = dataObj.snapShot.id;
        const oldId = mapState?.id;

        if (!mapState) {
          setMapState(dataObj.snapShot);

          return;
        }

        if (oldId && oldId !== newId && oldId < newId) {
          console.log(`Map ID changed from OLD =>  ${oldId} :::: NEW => ${newId}`);
          console.log(dataObj.snapShot.terrain);
          setMapState((data as SnapshotUpdate).snapShot);
        }
      }
    });
  }

  // console.log('mapState', mapState);

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

      {/* <div className="w-64 flex-shrink-0 space-y-4"> */}
      <div style={{ width: '100%', height: '100%' }}>
        <div>
          <h3>Current Map State:</h3>
          <p>Messages received: {messageCount}</p>

          <ReadOnlyGrid
            mapWidth={mapState?.mapWidth || 0}
            mapHeight={mapState?.mapHeight || 0}
            // measurementStart={null}
            handleCellClick={() => {}}
            handleCellMouseDown={() => {}}
            handleCellMouseEnter={() => {}}
            setHoveredCell={() => {}}
            terrain={mapState?.terrain || []}
            getCustomObject={() => ({ id: '', label: '', icon: '', color: '' })}
            characters={mapState?.characters || []}
            selectedCharacter={null}
            handleCharacterClick={() => {}}
            customObjects={mapState?.customObjects || []}
            measurements={mapState?.measurements || []}
          />

          <pre>
            MAP: {mapState?.mapWidth}x{mapState?.mapHeight}
          </pre>
        </div>
      </div>
    </main>
  );
};

export default MapView;
