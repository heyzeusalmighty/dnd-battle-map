import { Suspense } from 'react';
import MapView from './components/MapView';
import '../map/index.css';

export default async function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MapView />
    </Suspense>
  );
}
