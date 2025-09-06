import { Suspense } from 'react';
import Map from './Map';
import './index.css';

export default async function Page() {
  return (
    <Suspense fallback={<div>Loading map...</div>}>
      <Map />
    </Suspense>
  );
}
