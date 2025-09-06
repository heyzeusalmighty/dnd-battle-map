import { redirect } from 'next/navigation';

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
    <div>
      <h1>DND Battle Map</h1>
      <form action={createInvoice}>
        <h2>Create a New Map</h2>
        <div className="grid grid-cols-2 gap-2">
          <input name="mapName" type="text" />
          <button type="submit">Create Map</button>
        </div>
      </form>
    </div>
  );
}
