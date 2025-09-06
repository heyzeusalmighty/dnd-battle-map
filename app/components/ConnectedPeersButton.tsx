import Peer from 'peerjs';
import { Button } from './ui/button';
import { ClipboardCopyIcon } from 'lucide-react';

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
  const handlePeerButtonClick = () => {
    sendData({ type: 'request-peers', payload: { pop: 'wow' } });
  };

  const copyToClipboard = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        const url = `${window.location.origin}/map-view?connectionId=${peer?.id}&mapName=${mapName}`;
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
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
    <div className="absolute top-4 right-4 z-10 flex gap-2 items-center`">
      <Button onClick={copyToClipboard} title="Copy Link to Clipboard" variant="outline">
        <ClipboardCopyIcon />
      </Button>
      <Button className="" onClick={handlePeerButtonClick} title={users.join(', ')}>
        {buttonMessage}
      </Button>
    </div>
  );
};

export default ConnectedPeersButton;
