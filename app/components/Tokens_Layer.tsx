"use client";

import React, { useEffect } from "react";
import type { Character } from "../map/types";

export type TokenClassesFn = (isPlayer: boolean, isSelected: boolean) => string;

type Props = {
  characters: Character[];
  cellPx: number; // = GRID_SIZE
  tokenClasses: TokenClassesFn;
  selectedCharacterId?: string | null;
  onCharacterClick: (id: string) => void;
};

export default function Tokens_Layer({
  characters,
  cellPx,
  tokenClasses,
  selectedCharacterId,
  onCharacterClick,
}: Props) {
  const pad = 3;
  const inner = cellPx - pad * 2;

  // Scroll the selected token into view (links tracker → map)
  useEffect(() => {
    if (!selectedCharacterId) return;
    document
      .querySelector<HTMLElement>(`[data-token="${selectedCharacterId}"]`)
      ?.scrollIntoView({
        block: "center",
        inline: "center",
        behavior: "smooth",
      });
  }, [selectedCharacterId]);

  // Plain tooltip content
  const tooltip = (c: Character): string => {
    const parts: string[] = []; // <- important: tell TS it's an array of strings

    // Name
    parts.push(c.name);

    // Initiative (for both)

    const im = typeof c.initiativeMod === "number" ? c.initiativeMod : 0;
    const modStr = im !== 0 ? ` (${im >= 0 ? "+" : ""}${im})` : "";

    parts.push(`Init: ${c.initiative}${modStr}`);

    // PCs: show HP only
    if (c.isPlayer) {
      const cur = typeof c.hp === "number" ? c.hp : 0;
      if (typeof c.maxHp === "number" && c.maxHp > 0) {
        parts.push(`HP: ${cur} / ${c.maxHp}`);
      } else {
        parts.push(`HP: ${cur}`);
      }
    }
    // NPCs: show DMG only (never HP)
    else {
      const dmg = typeof c.damage === "number" ? c.damage : 0;
      parts.push(`DMG: ${dmg}`);
    }

    return parts.join("\n");
  };

  return (
    <>
      {characters.map((char) => {
        const left = char.x * cellPx + pad;
        const top = char.y * cellPx + pad;
        const selected = selectedCharacterId === char.id;

        return (
          <div
            key={char.id}
            data-token={char.id} // <— link handle
            title={tooltip(char)} // <— quick hover tooltip
            className={tokenClasses(char.isPlayer, selected)}
            style={{
              left,
              top,
              width: inner,
              height: inner,
              backgroundColor: char.color,
              // NOTE: no borderColor here anymore; rings come from tokenClasses
            }}
            onClick={() => onCharacterClick(char.id)}
            aria-label={char.name}
            role="button"
          >
            <span className="text-xs text-white font-medium">
              {char.name.charAt(0)}
            </span>

            {/* PC-only health bar */}
            {char.isPlayer && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="w-6 h-1 bg-gray-700 rounded">
                  <div
                    className="h-1 rounded transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (char.hp / Math.max(1, char.maxHp)) * 100
                      )}%`,
                      backgroundColor:
                        char.hp / char.maxHp > 0.5
                          ? "#10B981"
                          : char.hp / char.maxHp > 0.25
                          ? "#F59E0B"
                          : "#EF4444",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
