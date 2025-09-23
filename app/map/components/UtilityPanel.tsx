import { useMemo } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useMapContext } from "../context/MapContext";

const UtilityPanel = () => {
	const { state, handlers, actions } = useMapContext();
	const { measurements, showMovePreview, characters } = state;
	const { clearMeasurements, handleClearNPCs, handleClearPCs, saveSnapshot } =
		handlers;
	const { setTerrain, setShowMovePreview } = actions;

	// clear characters
	const pcCount = useMemo(
		() => characters.filter((c) => c.isPlayer).length,
		[characters],
	);
	const npcCount = characters.length - pcCount;

	return (
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
};
export default UtilityPanel;
