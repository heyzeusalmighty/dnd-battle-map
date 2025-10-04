// components/Terrain_Layer.tsx
import React from 'react';
import type { Terrain, CustomObj } from '../map/types';

import {
  getTerrainColor,
  textColorOn,
  getObjectLetter,
} from '@/app/map/utils/terrain';

type Props = {
  tiles: Terrain[];
  cellPx: number;
  isCustomObjectType: (type: string) => boolean;
  getCustomObject: (id: string) => CustomObj | undefined;
  canInteract: boolean; // selectedTool === "select"
  onTerrainRightClick?: (e: React.MouseEvent, tileId: string) => void;
};

export default function Terrain_Layer({
  tiles,
  cellPx,
  isCustomObjectType,
  getCustomObject,
  canInteract,
  onTerrainRightClick,
}: Props) {
  return (
    <>
      {tiles.map((tile) => {
        const isCustom = isCustomObjectType(tile.type);
        const left = tile.x * cellPx;
        const top = tile.y * cellPx;

        const baseClass = `absolute ${canInteract ? 'cursor-context-menu' : 'pointer-events-none'}`;

        const bg = isCustom ? 'transparent' : getTerrainColor(tile.type);
        const opacity = !isCustom && tile.type === 'difficult' ? 0.6 : 1;

        return (
          <div
            key={tile.id}
            className={baseClass}
            style={{
              left,
              top,
              width: cellPx,
              height: cellPx,
              backgroundColor: bg,
              opacity,
            }}
            onContextMenu={(e) => onTerrainRightClick?.(e, tile.id)}
            title={canInteract ? 'Right-click to delete' : undefined}
          >
            {isCustom ? (
              (() => {
                const obj = getCustomObject(tile.type);
                if (!obj) return null;

                // prefer emoji, then icon; else badge
                const icon = (obj.emoji ?? obj.icon)?.trim();
                if (icon && icon.length > 0) {
                  return (
                    <div className="w-full h-full flex items-center justify-center">
                      <span
                        className="leading-none"
                        style={{
                          fontSize: Math.floor(cellPx * 0.7),
                        }}
                      >
                        {icon}
                      </span>
                    </div>
                  );
                }

                // user-added object: colored badge with first letter
                const badgeBg = obj.color || '#6b7280';
                const fg = textColorOn(badgeBg);
                const size = Math.floor(cellPx * 0.78);

                return (
                  <div className="w-full h-full flex items-center justify-center">
                    <div
                      className="flex items-center justify-center font-semibold"
                      style={{
                        width: size,
                        height: size,
                        borderRadius: Math.floor(cellPx * 0.2),
                        backgroundColor: badgeBg,
                        color: fg,
                        lineHeight: 1,
                      }}
                      title={obj.label}
                    >
                      {getObjectLetter(obj)}
                    </div>
                  </div>
                );
              })()
            ) : tile.type === 'door' ? (
              // keep your door label
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">D</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
