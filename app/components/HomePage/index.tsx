'use client';

import { getAllLocalStorage } from '@/app/utils/localStorage';
import { useEffect, useState } from 'react';
import Dummy from './dummy';
import styles from './index.module.css';

interface HomePageProps {
  createInvoice: (formData: FormData) => Promise<void>;
}

const HomePage = ({ createInvoice }: HomePageProps) => {
  const [storedMaps, setStoredMaps] = useState<Record<string, string>>({});

  useEffect(() => {
    const maps = getAllLocalStorage();
    setStoredMaps(maps);
  }, []);

  useEffect(() => {
    const handleGameUpdate = (event: CustomEvent) => {
      const data = event.detail;
      console.log('Received game update:', data);
      // Handle the game update data as needed
    };

    window.addEventListener('gameUpdate', handleGameUpdate as EventListener);

    return () => {
      window.removeEventListener(
        'gameUpdate',
        handleGameUpdate as EventListener
      );
    };
  }, []);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.glassCard}>
        <h1 className={styles.title}>DND Battle Map</h1>
        <form action={createInvoice} className={styles.form}>
          <h2 className={styles.subtitle}>Create a New Map</h2>
          <div className={styles.inputGroup}>
            <input
              name="mapName"
              type="text"
              placeholder="Enter your map name..."
              className={styles.input}
              required
              autoFocus
              autoComplete="off"
            />
            <button type="submit" className={styles.button}>
              Create Map
            </button>
          </div>
        </form>
      </div>

      <div className={styles.glassCard}>
        <h2 className={styles.subtitle}>Load a Saved Map</h2>
        {Object.keys(storedMaps).length === 0 ? (
          <p className={styles.noMapsMessage}>
            No saved maps found in local storage.
          </p>
        ) : (
          <div className={styles.mapLinksContainer}>
            {Object.keys(storedMaps).map((key) => (
              <a
                href={`/map?mapName=${encodeURIComponent(key)}`}
                key={key}
                className={styles.mapLink}
              >
                {key}
              </a>
            ))}
          </div>
        )}
      </div>
      <Dummy />
    </div>
  );
};

export default HomePage;
