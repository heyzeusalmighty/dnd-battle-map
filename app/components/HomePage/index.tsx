'use client';

import { useState, useEffect } from 'react';
import { getAllLocalStorage } from '@/app/utils/localStorage';
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

  console.log('storedMaps', storedMaps);

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
          <p className={styles.noMapsMessage}>No saved maps found in local storage.</p>
        ) : (
          <ul className={styles.mapList}>
            {Object.entries(storedMaps).map(([key, value]) => (
              <li key={key} className={styles.mapListItem}>
                <span>{key}</span>
                <button
                  onClick={() => {
                    window.location.href = `/map?mapName=${encodeURIComponent(key)}`;
                  }}
                  className={styles.loadButton}
                >
                  Load Map
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HomePage;
