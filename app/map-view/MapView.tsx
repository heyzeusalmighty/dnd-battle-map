'use client';
import { useState } from 'react';

import { useSearchParams } from 'next/navigation';
import { useGuestMap } from '../hooks/rtc/useGuestMap';

const MapView = () => {
  const [username, setUsername] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sentData, setSentData] = useState<unknown[]>([]);
  const searchParams = useSearchParams();
  const mapName = searchParams.get('mapName') ?? 'Shadow Over Orlando';
  const hostId = searchParams.get('connectionId');

  // Only connect after username is submitted
  const ready = Boolean(submitted && hostId);
  const guestMap = useGuestMap({ hostId, username, start: ready });

  // Listen for data if connected
  if (guestMap && guestMap.onData) {
    guestMap.onData((data: unknown) => {
      console.log('data from host:', data);
      setSentData((prev) => [...prev, data]);
    });
  }

  return (
    <div style={{ padding: 32 }}>
      <h2>Join Map: {mapName}</h2>
      {!submitted ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (username.trim()) setSubmitted(true);
          }}
        >
          <label>
            Username:
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ marginLeft: 8 }}
              required
            />
          </label>
          <button type="submit" style={{ marginLeft: 16 }}>
            Connect
          </button>
        </form>
      ) : (
        <div>
          <p>
            Username: <b>{username}</b>
          </p>
          <p>
            Connection status: <b>{guestMap?.connected ? 'Connected' : 'Connecting...'}</b>
          </p>
        </div>
      )}
      <div style={{ marginTop: 24 }}>
        <h3>Data from Host:</h3>
        {sentData && sentData.length > 0 ? (
          <ul>
            {sentData.map((data, index) => (
              <li key={index}>{JSON.stringify(data)}</li>
            ))}
          </ul>
        ) : (
          <p>No data received yet.</p>
        )}
      </div>
    </div>
  );
};

export default MapView;
