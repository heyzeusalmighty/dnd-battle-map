import { redirect } from 'next/navigation';
import styles from './index.module.css';

export default function Page() {
  async function createInvoice(formData: FormData) {
    'use server';

    const mapName = formData.get('mapName');
    if (typeof mapName !== 'string' || mapName.length === 0) {
      throw new Error('Map name is required');
    }

    redirect(`/map?mapName=${mapName}`);
  }

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
    </div>
  );
}
