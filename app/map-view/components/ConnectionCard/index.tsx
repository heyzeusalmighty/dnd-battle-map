import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { useEffect, useState } from 'react';
import ConnectionDialog from './ConnectionDialog';
import styles from './style.module.css';

interface ConnectionCardProps {
  username: string;
  setUsername: (name: string) => void;
  submitted: boolean;
  setSubmitted: (submitted: boolean) => void;
  mapName: string;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => void;
  disconnect: () => void;
}

const ConnectionCard = ({
  username,
  setUsername,
  submitted,
  setSubmitted,
  mapName,
  isConnected,
  isConnecting,
  connect,
  disconnect,
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

  const handleDisconnect = () => {
    setSubmitted(false);
    setIsDisconnected(true);
    disconnect();
  };

  const reconnect = () => {
    setIsDisconnected(false);
    setSubmitted(true);
  };

  useEffect(() => {
    if (submitted && username.trim() !== '') {
      connect();
    }
  }, [submitted, username, connect]);

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
          Connection status: {isDisconnected && <b>Disconnected</b>}
          {isConnecting && <b>Connecting...</b>}
          {isConnected && <b>Connected</b>}
          {!isConnected && !isConnecting && <b>Disconnected</b>}
        </p>

        <div className="mt-4">
          {isConnected && (
            <Button onClick={handleDisconnect}>Disconnect</Button>
          )}

          {!isConnected && <Button onClick={reconnect}>Connect</Button>}
        </div>
      </div>
    </Card>
  );
};

export default ConnectionCard;
