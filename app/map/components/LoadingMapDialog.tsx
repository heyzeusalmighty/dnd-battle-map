import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

interface LoadingMapDialogProps {
  isOpen: boolean;
  title: string;
  body: string;
}

const LoadingMapDialog = ({ isOpen, title, body }: LoadingMapDialogProps) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">{body}</div>
      </DialogContent>
    </Dialog>
  );
};

export default LoadingMapDialog;
