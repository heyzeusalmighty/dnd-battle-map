import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

interface UtilityPanelProps {
  measurements: any[];
  clearMeasurements: () => void;
  setTerrain: React.Dispatch<React.SetStateAction<any[]>>;
  npcCount: number;
  pcCount: number;
  handleClearNPCs: () => void;
  handleClearPCs: () => void;
  showMovePreview: boolean;
  setShowMovePreview: React.Dispatch<React.SetStateAction<boolean>>;
  saveSnapshot: () => void;
}

const UtilityPanel = ({
  measurements,
  clearMeasurements,
  setTerrain,
  npcCount,
  pcCount,
  handleClearNPCs,
  handleClearPCs,
  showMovePreview,
  setShowMovePreview,
  saveSnapshot,
}: UtilityPanelProps) => (
  <Card className="p-4">
    <h4 className="mb-2">Utilities</h4>
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          saveSnapshot();
          setTerrain([]);
        }}
        className="w-full"
      >
        Clear Terrain
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={clearMeasurements}
        className="w-full"
      >
        Clear Measurements ({measurements.length})
      </Button>

      <Button variant="outline" className="w-full" onClick={handleClearNPCs}>
        Clear NPCs {npcCount > 0 ? `(${npcCount})` : ""}
      </Button>

      <Button variant="outline" className="w-full" onClick={handleClearPCs}>
        Clear PCs {pcCount > 0 ? `(${pcCount})` : ""}
      </Button>

      <Button
        size="sm"
        variant={showMovePreview ? "default" : "outline"}
        onClick={() => setShowMovePreview((v) => !v)}
        className="w-full"
      >
        {showMovePreview ? "Movement Preview: On" : "Movement Preview: Off"}
      </Button>
    </div>
  </Card>
);

export default UtilityPanel;
