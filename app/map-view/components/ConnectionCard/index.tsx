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
    debugInfo?: {
      browserInfo: {
        browserName: string;
        isFirefox: boolean;
        userAgent: string;
      };
      firefoxInfo?: {
        firefoxVersion: string | null;
        potentialIssues: string[];
      } | null;
      peerId: string | null;
      peerDestroyed: boolean;
      connectionOpen: boolean;
    };
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

        {/* Debug Information Section */}
        {guestMap?.debugInfo && !guestMap.connected && submitted && (
          <div className="mt-4 p-3 bg-muted border border-border rounded-md text-sm">
            <h4 className="font-semibold mb-2 text-foreground">
              🔍 Debug Information
            </h4>

            <div className="space-y-2 text-muted-foreground">
              <div>
                <strong className="text-foreground">Browser:</strong>{' '}
                {guestMap.debugInfo.browserInfo.browserName}
                {guestMap.debugInfo.browserInfo.isFirefox && (
                  <span className="ml-2 px-2 py-1 bg-destructive/20 text-destructive rounded text-xs font-medium">
                    Firefox Detected
                  </span>
                )}
              </div>

              {guestMap.debugInfo.firefoxInfo?.potentialIssues &&
                guestMap.debugInfo.firefoxInfo.potentialIssues.length > 0 && (
                  <div className="text-destructive">
                    <strong>⚠️ Potential Issues:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      {guestMap.debugInfo.firefoxInfo.potentialIssues.map(
                        (issue, index) => (
                          <li key={index}>{issue}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

              <div>
                <strong className="text-foreground">Peer ID:</strong>{' '}
                {guestMap.debugInfo.peerId || 'Not assigned'}
              </div>

              <div>
                <strong className="text-foreground">Connection Status:</strong>
                <ul className="list-disc list-inside ml-4">
                  <li>
                    Peer Destroyed:{' '}
                    {guestMap.debugInfo.peerDestroyed ? 'Yes' : 'No'}
                  </li>
                  <li>
                    Connection Open:{' '}
                    {guestMap.debugInfo.connectionOpen ? 'Yes' : 'No'}
                  </li>
                </ul>
              </div>

              {guestMap.debugInfo.browserInfo.isFirefox && (
                <div className="mt-3 p-2 bg-accent border border-accent-foreground/20 rounded">
                  <strong className="text-accent-foreground">
                    💡 Firefox Tips:
                  </strong>
                  <ul className="list-disc list-inside ml-4 mt-1 text-xs text-accent-foreground/80">
                    <li>
                      Check browser console (F12) for detailed WebRTC logs
                    </li>
                    <li>Ensure WebRTC is not blocked in privacy settings</li>
                    <li>
                      Try disabling Enhanced Tracking Protection for this site
                    </li>
                    <li>Private browsing may block WebRTC connections</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4">
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
