import { Suspense } from 'react';
import UserMapView from './components/MapView';
import '../map/index.css';

export default async function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserMapView />
    </Suspense>
  );
}
