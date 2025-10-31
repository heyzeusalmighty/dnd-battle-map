import type { ConnectedPlayer } from '@/app/hooks/websockets.types';
import LoadingMapDialog from '@/app/map/components/LoadingMapDialog';
import { ClipboardCopyIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import styles from './index.module.css';

interface ConnectedPeersButtonProps {
  players: ConnectedPlayer[];
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => void;
  mapName: string;
}

const ConnectedPeersButton = ({
  players,
  isConnected,
  isConnecting,
  connect,
  mapName,
}: ConnectedPeersButtonProps) => {
  const [showClipboardMessage, setShowClipboardMessage] = useState(false);
  const [connectOnMount, setConnectOnMount] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showClipboardMessage) {
        setShowClipboardMessage(false);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [showClipboardMessage]);

  useEffect(() => {
    if (!isConnected && !isConnecting && !connectOnMount) {
      connect();
      setConnectOnMount(true);
    }
  }, [isConnected, isConnecting, connectOnMount, connect]);

  const handlePeerButtonClick = () => {};

  const copyToClipboard = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        const url = `${window.location.origin}/map-view?mapName=${mapName}`;
        await navigator.clipboard.writeText(url);
        setShowClipboardMessage(true);
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    } else {
      alert('Clipboard API not supported');
    }
  };

  const buttonMessage = isConnecting
    ? 'Reconnecting...'
    : players.length > 0
      ? `${players.length} peer(s) connected`
      : 'No peers connected';

  return (
    <div className="absolute top-4 right-4 z-20 flex gap-2 items-center">
      <Button
        onClick={copyToClipboard}
        title="Copy Link to Clipboard"
        variant="outline"
      >
        <ClipboardCopyIcon />
      </Button>
      <div className={styles.statusWrapper}>
        <Button
          id="connection-status"
          onClick={handlePeerButtonClick}
          title={players.join(', ')}
          className={styles.statusButton}
        >
          {buttonMessage}
          {!isConnected && <span className={styles.redDot} />}
        </Button>
        {players.length > 0 && (
          <div className={styles.peerList}>
            <div className={styles.peerListTitle}>Connected Peers:</div>
            <ul>
              {players.map((p) => (
                <li key={p.connectionId} className={styles.peerListItem}>
                  {p.playerId}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <LoadingMapDialog
        isOpen={showClipboardMessage}
        title="Copied Link..."
        body="The connection link has been copied to your clipboard."
      />
    </div>
  );
};

export default ConnectedPeersButton;
