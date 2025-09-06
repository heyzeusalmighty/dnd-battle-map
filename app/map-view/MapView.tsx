'use client';

import { useSearchParams } from 'next/navigation';
import { useGuestMap } from '../hooks/rtc/useGuestMap';

const MapView = () => {
  const searchParams = useSearchParams();
  const mapName = searchParams.get('mapName') ?? 'Shadow Over Orlando';
  const connectionId = searchParams.get('connectionId');

  const { connected, send, onData } = useGuestMap(connectionId || '');

  console.log('Map Name:', mapName);
  console.log('Connection ID:', connectionId);
  console.log('Connected:', connected);
  onData((data) => {
    console.log('Data from host:', data);
  });

  return <div>Map View Placeholder</div>;
};

export default MapView;
