import { useState, useEffect } from 'react';
import Peer from 'peerjs';
import { Button } from '../ui/button';
import { ClipboardCopyIcon } from 'lucide-react';
import LoadingMapDialog from '@/app/map/components/LoadingMapDialog';

import styles from './index.module.css';

interface Connection {
  peer: string;
  metadata?: {
    username?: string;
  };
  open: boolean;
}

interface ConnectedPeersButtonProps {
  connections: Connection[];
  sendData: (data: unknown) => void;
  peer: Peer | null;
  mapName: string;
}

const ConnectedPeersButton = ({
  connections,
  sendData,
  peer,
  mapName,
}: ConnectedPeersButtonProps) => {
  const [showClipboardMessage, setShowClipboardMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showClipboardMessage) {
        setShowClipboardMessage(false);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [showClipboardMessage]);

  const handlePeerButtonClick = () => {
    sendData({ type: 'request-peers', payload: { pop: 'wow' } });
  };

  const copyToClipboard = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        const url = `${window.location.origin}/map-view?connectionId=${peer?.id}&mapName=${mapName}`;
        await navigator.clipboard.writeText(url);
        setShowClipboardMessage(true);
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    } else {
      alert('Clipboard API not supported');
    }
  };

  const users = connections.map((c) => c.metadata?.username || 'Unknown');

  const buttonMessage = peer?.disconnected
    ? 'Reconnecting...'
    : users.length > 0
      ? `${users.length} peer(s) connected`
      : 'No peers connected';

  return (
    <div className="absolute top-4 right-4 z-20 flex gap-2 items-center">
      <Button onClick={copyToClipboard} title="Copy Link to Clipboard" variant="outline">
        <ClipboardCopyIcon />
      </Button>
      <div className={styles.statusWrapper}>
        <Button
          id="connection-status"
          onClick={handlePeerButtonClick}
          title={users.join(', ')}
          className={styles.statusButton}
        >
          {buttonMessage}
          {peer?.disconnected && <span className={styles.redDot} />}
        </Button>
        {users.length > 0 && (
          <div className={styles.peerList}>
            <div className={styles.peerListTitle}>Connected Peers:</div>
            <ul>
              {connections.map((c) => (
                <li key={c.peer} className={styles.peerListItem}>
                  {c.metadata?.username || c.peer}
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
