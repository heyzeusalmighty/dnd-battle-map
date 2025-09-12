import { redirect } from 'next/navigation';
import HomePage from './components/HomePage';

export default function Page() {
  async function createInvoice(formData: FormData) {
    'use server';

    const mapName = formData.get('mapName');
    if (typeof mapName !== 'string' || mapName.length === 0) {
      throw new Error('Map name is required');
    }

    redirect(`/map?mapName=${mapName}`);
  }

  return <HomePage createInvoice={createInvoice} />;
}
