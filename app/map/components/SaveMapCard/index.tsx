import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

import style from './style.module.css';

interface SaveMapCardProps {
  handleSaveMap: () => void;
  handleLoadMap: () => void;
}

const SaveMapCard = ({ handleSaveMap, handleLoadMap }: SaveMapCardProps) => {
  return (
    <Card>
      <div className={style.content}>
        <div className={style.message}>
          Saves map locally in browser (not shared)
        </div>

        <div className={style.buttonGroup}>
          <Button onClick={handleSaveMap}>Save Map</Button>
          <Button onClick={handleLoadMap}>Load Map</Button>
        </div>
      </div>
    </Card>
  );
};

export default SaveMapCard;
