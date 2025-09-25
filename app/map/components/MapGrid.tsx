import {
  BrickWall,
  DoorOpen,
  Mountain,
  MousePointer,
  Paintbrush,
  Ruler,
  Settings,
} from 'lucide-react';
import { type FC, type MouseEvent, type MutableRefObject, useMemo } from 'react';
import Map_GridLines from '@/app/components/Map_GridLines';
import Measurement_Overlay from '@/app/components/Measurement_Overlay';
import Movement_Overlay from '@/app/components/Movement_Overlay';
import Terrain_Layer from '@/app/components/Terrain_Layer';
import Tokens_Layer from '@/app/components/Tokens_Layer';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import type { CustomObj, DistanceRule, Measurement } from '@/app/map/types';
import { GRID_SIZE } from '@/app/map/utils/constants';
import { measureFeet } from '@/app/map/utils/distance';
import { useMapContext } from '../context/MapContext';
import { getId } from '../utils/id';

interface MapGridProps {
  isCustomObjectType: (type: string) => boolean;
  getCustomObject: (type: string) => CustomObj | undefined;
  handleCellMouseDown: (e: MouseEvent, x: number, y: number) => void;
  handleCellMouseEnter: (e: MouseEvent, x: number, y: number) => void;
  commit: (fn: () => void) => void;
  paintSnap: MutableRefObject<boolean>;
}

const MapGrid: FC<MapGridProps> = ({
  isCustomObjectType,
  getCustomObject,
  handleCellMouseDown,
  handleCellMouseEnter,
  paintSnap,
  commit,
}) => {
  const { state, handlers, actions, mapScrollRef } = useMapContext();
  const {
    gridScale,
    distanceRule,
    mapHeight,
    mapWidth,
    selectedCharacter,
    characters,
    terrain,
    measurements,
    mode,
    measurementStart,
    undoStack,
    redoStack,
    selectedTool,
    showMovePreview,
    showMapSettings,
    isDragging,
    hoveredCell,
  } = state;

  const {
    setMode,
    setPaintTool,
    setShowMapSettings,
    setMapHeight,
    setMapWidth,
    setGridScale,
    setDistanceRule,
    setIsDragging,
    setDragMode,
    setLastCell,
    setHoveredCell,
    setMeasurementStart,
    setMeasurements,
    setCharacters,
    setTerrain,
  } = actions;
  const { undo, redo, handleCharacterClick, saveSnapshot } = handlers;

  const stageW = mapWidth * GRID_SIZE;
  const stageH = mapHeight * GRID_SIZE;

  // calculating distance
  const calculateDistance = (x1: number, y1: number, x2: number, y2: number) =>
    measureFeet(x1, y1, x2, y2, distanceRule, gridScale);

  // Event handlers
  const handleCellClick = (x: number, y: number) => {
    if (selectedTool === 'measure') {
      if (!measurementStart) {
        setMeasurementStart({ x, y });
      } else {
        const distance = calculateDistance(measurementStart.x, measurementStart.y, x, y);
        const newMeasurement: Measurement = {
          id: getId(),
          startX: measurementStart.x,
          startY: measurementStart.y,
          endX: x,
          endY: y,
          distance,
        };
        saveSnapshot();
        setMeasurements((prev) => [...prev, newMeasurement]);
        setMeasurementStart(null);
      }
      return;
    }

    if (selectedTool === 'select') {
      if (selectedCharacter) {
        const sel = getSelectedChar(); // or however you fetch it
        if (!sel) return;

        // no-op: same cell → skip snapshot & state write
        if (sel.x === x && sel.y === y) return;

        commit(() => {
          setCharacters((prev) =>
            prev.map((c) => (c.id === selectedCharacter ? { ...c, x, y } : c))
          );
        });
      }
      return;
    }
  };

  const handleTerrainRightClick = (e: MouseEvent, terrainId: string) => {
    e.preventDefault();
    if (selectedTool === 'select') {
      saveSnapshot();
      setTerrain((prev) => prev.filter((t) => t.id !== terrainId));
    }
  };

  // choose token classes based on PC/NPC and selection
  const tokenClasses = (isPlayer: boolean, isSelected: boolean) =>
    [
      'absolute z-10 flex items-center justify-center',
      isPlayer ? 'rounded-full' : 'rounded-md',

      // Base (subtle) outline via ring; no borders at all
      'ring-1 ring-black/10 dark:ring-white/20',
      'ring-offset-1 ring-offset-white dark:ring-offset-neutral-900',

      // Selection emphasis
      isSelected ? (isPlayer ? 'ring-2 ring-blue-500/70' : 'ring-2 ring-red-600/70') : '',

      // Optional: small polish
      'shadow-sm transition-all duration-150',
      // If you set fill inline via style={{ backgroundColor: c.color }},
      // you can drop bg-background. Keep it only if you rely on a CSS var:
      // "bg-background",
    ].join(' ');

  // O(1) lookups for terrain difficulty
  const difficultKeys = useMemo(() => {
    const s = new Set<string>();
    for (const t of terrain) {
      if (t.type === 'difficult') s.add(`${t.x},${t.y}`);
    }
    return s;
  }, [terrain]);

  const isDifficultAt = (x: number, y: number) => difficultKeys.has(`${x},${y}`);

  // find the currently selected character once
  const getSelectedChar = () => characters.find((c) => c.id === selectedCharacter) || null;

  return (
    <div className="flex-1 min-w-0 overflow-hidden">
      <Card className="p-4 w-full h-full">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Grid: {gridScale} ft/square | Size: {mapWidth}×{mapHeight}
          </span>
          {selectedCharacter && (
            <Badge variant="outline">
              {characters.find((c) => c.id === selectedCharacter)?.name} selected - click to move
            </Badge>
          )}
          {measurementStart && (
            <Badge variant="outline">Click another cell to measure distance</Badge>
          )}
        </div>

        {/* Top toolbar */}
        <div className="mb-3 flex flex-col gap-2">
          {/* Row 1: modes on the left, Undo/Redo/Settings on the right */}
          <div className="flex items-center justify-between gap-2">
            {/* Modes */}
            <div className="inline-flex rounded-md overflow-hidden border">
              <Button
                size="sm"
                variant={mode === 'select' ? 'default' : 'ghost'}
                className="h-8 px-3 rounded-none"
                onClick={() => setMode('select')}
                title="Select (V)"
              >
                <MousePointer className="w-4 h-4 mr-1" />
                Select
              </Button>
              <Button
                size="sm"
                variant={mode === 'measure' ? 'default' : 'ghost'}
                className="h-8 px-3 rounded-none"
                onClick={() => setMode('measure')}
                title="Measure (M)"
              >
                <Ruler className="w-4 h-4 mr-1" />
                Measure
              </Button>
              <Button
                size="sm"
                variant={mode === 'paint' ? 'default' : 'ghost'}
                className="h-8 px-3 rounded-none"
                onClick={() => setMode('paint')}
                title="Paint terrain (B)"
              >
                <Paintbrush className="w-4 h-4 mr-1" />
                Paint
              </Button>
            </div>

            {/* Undo / Redo / Settings */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={undo}
                disabled={!undoStack.length}
                title="Undo (⌘/Ctrl+Z)"
              >
                Undo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={redo}
                disabled={!redoStack.length}
                title="Redo (⇧+⌘/Ctrl+Z)"
              >
                Redo
              </Button>

              {/* Map Settings dialog (moved from Actions card) */}
              <Dialog open={showMapSettings} onOpenChange={setShowMapSettings}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8">
                    <Settings className="w-4 h-4 mr-2" />
                    Map Settings
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Map Configuration</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm">Width</label>
                        <Input
                          type="number"
                          value={mapWidth}
                          onChange={(e) =>
                            setMapWidth(Math.max(10, Math.min(50, parseInt(e.target.value) || 25)))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm">Height</label>
                        <Input
                          type="number"
                          value={mapHeight}
                          onChange={(e) =>
                            setMapHeight(Math.max(10, Math.min(50, parseInt(e.target.value) || 20)))
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm">Grid Scale</label>
                      <Select
                        value={String(gridScale)}
                        onValueChange={(v) => {
                          const next = parseInt(v, 10);
                          if (!Number.isFinite(next) || next === gridScale) return;
                          saveSnapshot();
                          setGridScale(next);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`${gridScale} feet per square`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 feet (Standard D&D)</SelectItem>
                          <SelectItem value="10">10 feet</SelectItem>
                          <SelectItem value="1">1 foot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <label className="text-sm">Diagonal Calculation</label>
                    <Select
                      value={distanceRule}
                      onValueChange={(v) => {
                        if (v === distanceRule) return;
                        saveSnapshot();
                        setDistanceRule(v as DistanceRule);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={distanceRule} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5e">5e (each square = 5 ft)</SelectItem>
                        <SelectItem value="5105">5-10-5 (every 2nd diagonal 10 ft)</SelectItem>
                        <SelectItem value="euclidean">Euclidean (true distance)</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button onClick={() => setShowMapSettings(false)}>Done</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Row 2: appears only in Paint mode */}
          {mode === 'paint' && (
            <div className="w-fit">
              {' '}
              {/* <- new: shrink-wrap the row */}
              <div className="inline-flex rounded-md overflow-hidden border">
                <Button
                  size="sm"
                  variant={selectedTool === 'wall' ? 'default' : 'ghost'}
                  className="h-8 px-3 rounded-none flex-none" // <- flex-none
                  onClick={() => setPaintTool('wall')}
                  title="Wall (1)"
                >
                  <BrickWall className="w-4 h-4 mr-1" />
                  Wall
                </Button>
                <Button
                  size="sm"
                  variant={selectedTool === 'difficult' ? 'default' : 'ghost'}
                  className="h-8 px-3 rounded-none flex-none"
                  onClick={() => setPaintTool('difficult')}
                  title="Difficult (2)"
                >
                  <Mountain className="w-4 h-4 mr-1" />
                  Difficult
                </Button>
                <Button
                  size="sm"
                  variant={selectedTool === 'door' ? 'default' : 'ghost'}
                  className="h-8 px-3 rounded-none flex-none"
                  onClick={() => setPaintTool('door')}
                  title="Door (3)"
                >
                  <DoorOpen className="w-4 h-4 mr-1" />
                  Door
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Map viewport (gets the scrollbars) */}
        <div
          ref={mapScrollRef}
          className="relative overflow-auto rounded border-2 border-border select-none"
          style={{
            width: '100%',
            maxWidth: '100%',
            maxHeight: 'calc(100vh - 180px)',
          }}
          onContextMenu={(e) => {
            // block the browser/Figma right-click menu anywhere on the map
            e.preventDefault(); // don't stopPropagation (lets per-cell handlers run first)
          }}
          onMouseUp={() => {
            // end a paint/erase drag
            paintSnap.current = false;
            if (isDragging) {
              setIsDragging(false);
              setDragMode(null);
              setLastCell(null);
            }
          }}
          onMouseLeave={() => {
            setHoveredCell(null);
            // if we left while dragging, also end the gesture cleanly
            if (isDragging) {
              paintSnap.current = false;
              setIsDragging(false);
              setDragMode(null);
              setLastCell(null);
            }
          }}
        >
          {/* Stage: sized exactly to the grid in pixels.
      Everything that positions absolutely should be inside this. */}
          <div className="relative" style={{ width: stageW, height: stageH }}>
            <Map_GridLines width={mapWidth} height={mapHeight} size={GRID_SIZE} />
            <Measurement_Overlay
              measurements={measurements}
              gridSize={GRID_SIZE}
              width={mapWidth}
              height={mapHeight}
            />
            {/* Measurement Preview (overlay SVG above gridlines) */}
            {selectedTool === 'measure' && measurementStart && hoveredCell && (
              <svg
                width={mapWidth * GRID_SIZE}
                height={mapHeight * GRID_SIZE}
                className="absolute inset-0 pointer-events-none"
              >
                <title>Movement Measure</title>
                <g opacity={0.7}>
                  <line
                    x1={measurementStart.x * GRID_SIZE + GRID_SIZE / 2}
                    y1={measurementStart.y * GRID_SIZE + GRID_SIZE / 2}
                    x2={hoveredCell.x * GRID_SIZE + GRID_SIZE / 2}
                    y2={hoveredCell.y * GRID_SIZE + GRID_SIZE / 2}
                    stroke="#FF6B35"
                    strokeWidth={2}
                    strokeDasharray="3,3"
                  />
                  <text
                    x={((measurementStart.x + hoveredCell.x) * GRID_SIZE) / 2 + GRID_SIZE / 2}
                    y={((measurementStart.y + hoveredCell.y) * GRID_SIZE) / 2 + GRID_SIZE / 2}
                    fill="#FF6B35"
                    fontSize="12"
                    textAnchor="middle"
                  >
                    {calculateDistance(
                      measurementStart.x,
                      measurementStart.y,
                      hoveredCell.x,
                      hoveredCell.y
                    )}
                    ft
                  </text>
                </g>
              </svg>
            )}

            {/* Movement preview (overlay SVG above gridlines) */}
            {showMovePreview &&
              selectedTool === 'select' &&
              selectedCharacter &&
              hoveredCell &&
              !measurementStart &&
              (() => {
                const sel = getSelectedChar();
                if (!sel) return null;
                return (
                  <Movement_Overlay
                    start={{ x: sel.x, y: sel.y }}
                    end={hoveredCell}
                    cellPx={GRID_SIZE}
                    rule={distanceRule}
                    gridScale={gridScale}
                    isDifficultAt={isDifficultAt}
                  />
                );
              })()}

            {/* Clickable Cells (with paint/erase + drag) */}
            {Array.from({ length: mapHeight }).map((_, y) =>
              Array.from({ length: mapWidth }).map((_, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`absolute cursor-pointer hover:bg-accent/30 ${
                    measurementStart?.x === x && measurementStart?.y === y ? 'bg-orange-200' : ''
                  }`}
                  style={{
                    left: x * GRID_SIZE,
                    top: y * GRID_SIZE,
                    width: GRID_SIZE,
                    height: GRID_SIZE,
                  }}
                  // Only let onClick handle MEASURE and SELECT moves.
                  // Terrain tools are handled by mouse down/drag (below).
                  onClick={() => {
                    if (selectedTool === 'measure' || selectedTool === 'select') {
                      handleCellClick(x, y);
                    }
                  }}
                  // Start paint/erase (left = toggle paint/erase, right = erase)
                  onMouseDown={(e) => handleCellMouseDown(e, x, y)}
                  // Continue paint/erase while dragging over cells
                  onMouseEnter={(e) => {
                    setHoveredCell({ x, y });
                    handleCellMouseEnter(e, x, y);
                  }}
                  onMouseLeave={() => setHoveredCell(null)}
                  // Support single right-click erase without dragging
                  onContextMenu={(e) => {
                    e.preventDefault(); // no browser/Figma menu
                    if (!isDragging && selectedTool !== 'select') {
                      handleCellMouseDown(Object.assign(e, { button: 2 }), x, y);
                    }
                  }}
                />
              ))
            )}

            {/* Terrain */}
            <Terrain_Layer
              tiles={terrain}
              cellPx={GRID_SIZE}
              isCustomObjectType={isCustomObjectType}
              getCustomObject={getCustomObject}
              canInteract={selectedTool === 'select' && !selectedCharacter}
              onTerrainRightClick={handleTerrainRightClick}
            />
            {/* Characters */}
            <Tokens_Layer
              characters={characters}
              cellPx={GRID_SIZE}
              tokenClasses={tokenClasses}
              selectedCharacterId={selectedCharacter}
              onCharacterClick={handleCharacterClick}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MapGrid;
