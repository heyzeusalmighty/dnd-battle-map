import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import type { FC } from 'react';
import { useState } from 'react';

interface ConnectionDialogProps {
  showConnectionDialog: boolean;
  setShowConnectionDialog: (show: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const ConnectionDialog: FC<ConnectionDialogProps> = ({
  showConnectionDialog,
  setShowConnectionDialog,
  onSubmit,
}) => {
  const [userName, setUsername] = useState('');

  return (
    <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter your username to join the map</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" autoComplete="off">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Username
              </label>
              <Input
                id="username"
                name="username"
                autoFocus
                autoComplete="off"
                value={userName}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <Button disabled={userName.trim().length === 0}>Join Map</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionDialog;
