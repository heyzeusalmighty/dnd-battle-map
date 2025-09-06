'use client';

import { useSearchParams } from 'next/navigation';

const MapView = () => {
  const searchParams = useSearchParams();
  const mapName = searchParams.get('mapName') ?? 'Shadow Over Orlando';
  const connectionId = searchParams.get('connectionId');

  console.log('Map Name:', mapName);
  console.log('Connection ID:', connectionId);

  return <div>Map View Placeholder</div>;
};

export default MapView;
