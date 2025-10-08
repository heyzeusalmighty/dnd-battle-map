import { Suspense } from 'react';
import MapComponent from './Map';
import './index.css';

export default async function Page() {
  return (
    <Suspense fallback={<div>Loading map...</div>}>
      <MapComponent />
    </Suspense>
  );
}
