import Map_GridLines from '@/app/components/Map_GridLines';
import Measurement_Overlay from '@/app/components/Measurement_Overlay';
import Movement_Overlay from '@/app/components/Movement_Overlay';
import Terrain_Layer from '@/app/components/Terrain_Layer';
import Tokens_Layer from '@/app/components/Tokens_Layer';
import { Card } from '@/app/components/ui/card';
import { GRID_SIZE } from '@/app/map/utils/constants';
import { BUILTIN_TERRAIN } from '@/app/map/utils/terrain';
import type { FC } from 'react';
import { useUserMapContext } from '../../context/UserMapContext';
import style from './style.module.css';

interface ReadOnlyGridProps {
  handleCellMouseDown: (e: React.MouseEvent, x: number, y: number) => void;
  handleCellMouseEnter: (e: React.MouseEvent, x: number, y: number) => void;
  broadcastData: (data: unknown) => void;
}

const ReadOnlyGrid: FC<ReadOnlyGridProps> = ({
  handleCellMouseDown,
  handleCellMouseEnter,
  broadcastData,
}) => {
  const { state, actions, handlers } = useUserMapContext();
  const {
    mapWidth,
    mapHeight,
    terrain,
    measurements,
    customObjects,
    characters,
  } = state.gameState;
  const { selectedCharacterId, hoveredCell } = state;
  const { setHoveredCell } = actions;
  const { handleCellClick, handleCharacterClick } = handlers;

  const selectedCharacter =
    characters.find((c) => c.id === selectedCharacterId) || null;

  const getCustomObject = (typeId: string) =>
    customObjects.find((o) => o.id === typeId);

  const isCustomObjectType = (t: string) =>
    !BUILTIN_TERRAIN.has(t) && customObjects.some((o) => o.id === t);

  const onCellClick = (x: number, y: number) => {
    handleCellClick(x, y);
    if (selectedCharacterId) {
      broadcastData({
        type: 'moveCharacter',
        characterId: selectedCharacterId,
        x,
        y,
      });
    }
  };

  const handleTerrainRightClick = () => {};
  // biome-ignore lint/correctness/noUnusedFunctionParameters: later
  const isDifficultAt = (x: number, y: number) => {
    return false;
  };

  return (
    <div className={style.gridContainer}>
      <Card className={style.card}>
        <Map_GridLines width={mapWidth} height={mapHeight} size={GRID_SIZE} />
        <Measurement_Overlay
          measurements={measurements}
          gridSize={GRID_SIZE}
          width={mapWidth}
          height={mapHeight}
        />

        {selectedCharacter &&
          hoveredCell &&
          (() => {
            if (!selectedCharacter || !hoveredCell) return null;
            return (
              <Movement_Overlay
                start={{ x: selectedCharacter.x, y: selectedCharacter.y }}
                end={hoveredCell}
                cellPx={GRID_SIZE}
                rule={'5e'}
                gridScale={5}
                isDifficultAt={isDifficultAt}
                terrain={terrain}
              />
            );
          })()}

        {Array.from({ length: mapHeight }).map((_, y) =>
          Array.from({ length: mapWidth }).map((_, x) => (
            <div
              key={`${x}-${y}`}
              className={style.gridCell}
              style={{
                left: x * GRID_SIZE,
                top: y * GRID_SIZE,
                width: GRID_SIZE,
                height: GRID_SIZE,
              }}
              onClick={() => {
                onCellClick(x, y);
              }}
              onMouseDown={(e) => handleCellMouseDown(e, x, y)}
              onMouseEnter={(e) => {
                setHoveredCell({ x, y });
                handleCellMouseEnter(e, x, y);
              }}
              onMouseLeave={() => setHoveredCell(null)}
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

        <Tokens_Layer
          cellPx={GRID_SIZE}
          characters={characters}
          selectedCharacterId={selectedCharacterId}
          onCharacterClick={handleCharacterClick}
          isDmView={false}
        />
      </Card>
    </div>
  );
};

export default ReadOnlyGrid;
