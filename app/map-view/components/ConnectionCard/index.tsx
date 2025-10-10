import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { useState } from 'react';
import ConnectionDialog from './ConnectionDialog';
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
  const [showConnectionDialog, setShowConnectionDialog] = useState(!submitted);
  const [isDisconnected, setIsDisconnected] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    setUsername(
      (form.elements.namedItem('username') as HTMLInputElement).value
    );
    setSubmitted(true);
    setShowConnectionDialog(false);
  };

  const disconnect = () => {
    setSubmitted(false);
    setIsDisconnected(true);
  };

  const reconnect = () => {
    setIsDisconnected(false);
    setSubmitted(true);
  };

  return (
    <Card>
      <div className={styles.connectionCard}>
        <h2>Map: {mapName}</h2>
        {!submitted && (
          <ConnectionDialog
            showConnectionDialog={showConnectionDialog}
            setShowConnectionDialog={setShowConnectionDialog}
            onSubmit={onSubmit}
          />
        )}

        <p>
          Username: <b>{username}</b>
        </p>
        <p>
          Connection status:{' '}
          {isDisconnected ? (
            <b>Disconnected</b>
          ) : (
            <b>{guestMap?.connected ? 'Connected' : 'Connecting...'}</b>
          )}
        </p>
        <div>
          {guestMap?.connected && (
            <Button onClick={disconnect}>Disconnect</Button>
          )}

          {!guestMap?.connected && !submitted && (
            <Button onClick={reconnect}>Connect</Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ConnectionCard;
