import { Suspense } from 'react';
import MapView from './MapView';

export default async function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MapView />
    </Suspense>
  );
}
