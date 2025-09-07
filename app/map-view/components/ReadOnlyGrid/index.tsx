import { FC } from 'react';
import Terrain_Layer from '@/app/components/Terrain_Layer';
import Tokens_Layer from '@/app/components/Tokens_Layer';
import { Character, CustomObj, Terrain } from '@/app/map/types';
import { Card } from '@/app/components/ui/card';
import { BUILTIN_TERRAIN } from '@/app/map/utils/terrain';
import { GRID_SIZE } from '@/app/map/utils/constants';
import Map_GridLines from '@/app/components/Map_GridLines';
import Measurement_Overlay from '@/app/components/Measurement_Overlay';
import { Measurement } from '@/app/map/types';
import style from './style.module.css';

interface ReadOnlyGridProps {
  mapWidth: number;
  mapHeight: number;
  handleCellClick: (x: number, y: number) => void;
  handleCellMouseDown: (e: React.MouseEvent, x: number, y: number) => void;
  handleCellMouseEnter: (e: React.MouseEvent, x: number, y: number) => void;
  setHoveredCell: (cell: { x: number; y: number } | null) => void;
  terrain: Terrain[];
  getCustomObject: (type: string) => CustomObj;
  characters: Character[];
  selectedCharacter: string | null;
  handleCharacterClick: (characterId: string) => void;
  customObjects: CustomObj[];
  measurements: Measurement[];
}

const ReadOnlyGrid: FC<ReadOnlyGridProps> = ({
  mapWidth,
  mapHeight,
  handleCellClick,
  handleCellMouseDown,
  handleCellMouseEnter,
  setHoveredCell,
  terrain,
  getCustomObject,
  characters,
  selectedCharacter,
  handleCharacterClick,
  customObjects,
  measurements,
}) => {
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

  const isCustomObjectType = (t: string) =>
    !BUILTIN_TERRAIN.has(t) && customObjects.some((o) => o.id === t);

  const handleTerrainRightClick = () => {};

  // bg-card text-card-foreground flex flex-col gap-6 rounded-xl border p-4 w-full h-full

  return (
    <div className={style.gridContainer}>
      {/* <Card className="p-4 w-full h-full">       */}
      <Card className={style.card}>
        <Map_GridLines width={mapWidth} height={mapHeight} size={GRID_SIZE} />
        <Measurement_Overlay
          measurements={measurements}
          gridSize={GRID_SIZE}
          width={mapWidth}
          height={mapHeight}
        />
        {Array.from({ length: mapHeight }).map((_, y) =>
          Array.from({ length: mapWidth }).map((_, x) => (
            <div
              key={`${x}-${y}`}
              className={style.gridCell}
              // className={`absolute cursor-pointer hover:bg-accent/30 ${
              //   measurementStart?.x === x && measurementStart?.y === y ? 'bg-orange-200' : ''
              // }`}
              style={{
                left: x * GRID_SIZE,
                top: y * GRID_SIZE,
                width: GRID_SIZE,
                height: GRID_SIZE,
              }}
              // Only let onClick handle MEASURE and SELECT moves.
              // Terrain tools are handled by mouse down/drag (below).
              onClick={() => {
                handleCellClick(x, y);
                // if (selectedTool === 'measure' || selectedTool === 'select') {
                //   handleCellClick(x, y);
                // }
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
              // onContextMenu={(e) => {
              //   e.preventDefault(); // no browser/Figma menu
              //   if (!isDragging && selectedTool !== 'select') {
              //     handleCellMouseDown(Object.assign(e, { button: 2 }), x, y);
              //   }
              // }}
            />
          ))
        )}

        <Terrain_Layer
          tiles={terrain}
          cellPx={GRID_SIZE}
          isCustomObjectType={isCustomObjectType}
          getCustomObject={getCustomObject}
          canInteract={false}
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
      </Card>
    </div>
  );
};

export default ReadOnlyGrid;
