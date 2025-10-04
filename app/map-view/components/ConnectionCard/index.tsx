import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';

import styles from './style.module.css';

interface ConnectionCardProps {
  username: string;
  setUsername: (name: string) => void;
  submitted: boolean;
  setSubmitted: (submitted: boolean) => void;
  guestMap: {
    connected: boolean;
  } | null;
  mapName: string;
}

const ConnectionCard = ({
  username,
  setUsername,
  submitted,
  setSubmitted,
  guestMap,
  mapName,
}: ConnectionCardProps) => {
  return (
    <Card>
      <div className={styles.connectionCard}>
        <h2>Map: {mapName}</h2>
        {!submitted ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (username.trim()) setSubmitted(true);
            }}
            className={styles.form}
          >
            <Input
              type="text"
              name="name"
              placeholder="Display Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ marginLeft: 8 }}
              required
            />

            <Button type="submit" style={{ marginLeft: 16 }}>
              Connect
            </Button>
          </form>
        ) : (
          <div>
            <p>
              Username: <b>{username}</b>
            </p>
            <p>
              Connection status:{' '}
              <b>{guestMap?.connected ? 'Connected' : 'Connecting...'}</b>
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ConnectionCard;
