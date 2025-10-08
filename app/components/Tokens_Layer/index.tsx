'use client';

import { clsx } from 'clsx';
import { useEffect } from 'react';
import type { Character } from '../../map/types';
import styles from './styles.module.css';

export type TokenClassesFn = (isPlayer: boolean, isSelected: boolean) => string;

type Props = {
  characters: Character[];
  cellPx: number; // = GRID_SIZE
  selectedCharacterId?: string | null;
  onCharacterClick: (id: string) => void;
  isDmView?: boolean;
};

const characterInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
};

export default function Tokens_Layer({
  characters,
  cellPx,
  selectedCharacterId,
  onCharacterClick,
  isDmView = false,
}: Props) {
  const pad = 3;
  const inner = cellPx - pad * 2;

  const tokenClasses = (isPlayer: boolean) =>
    [
      'absolute z-10 flex items-center justify-center',
      isPlayer ? 'rounded-full' : 'rounded-md',

      // Base (subtle) outline via ring; no borders at all
      'ring-1 ring-black/10 dark:ring-white/20',
      'ring-offset-1 ring-offset-white dark:ring-offset-neutral-900',

      isPlayer ? 'ring-2 ring-blue-500/70' : 'ring-2 ring-red-600/70',

      // Optional: small polish
      'shadow-sm transition-all duration-150',
      // If you set fill inline via style={{ backgroundColor: c.color }},
      // you can drop bg-background. Keep it only if you rely on a CSS var:
      // "bg-background",
    ].join(' ');

  // Scroll the selected token into view (links tracker → map)
  useEffect(() => {
    if (!selectedCharacterId) return;
    document
      .querySelector<HTMLElement>(`[data-token="${selectedCharacterId}"]`)
      ?.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'smooth',
      });
  }, [selectedCharacterId]);

  // Plain tooltip content
  const tooltip = (c: Character): string => {
    const parts: string[] = []; // <- important: tell TS it's an array of strings

    // Name
    parts.push(c.name);

    // Initiative (for both)

    const im = typeof c.initiativeMod === 'number' ? c.initiativeMod : 0;
    const modStr = im !== 0 ? ` (${im >= 0 ? '+' : ''}${im})` : '';

    parts.push(`Init: ${c.initiative}${modStr}`);

    // PCs: show HP only
    if (c.isPlayer) {
      const cur = typeof c.hp === 'number' ? c.hp : 0;
      if (typeof c.maxHp === 'number' && c.maxHp > 0) {
        parts.push(`HP: ${cur} / ${c.maxHp}`);
      } else {
        parts.push(`HP: ${cur}`);
      }
    }
    // NPCs: show DMG only (never HP)
    // NPCs: show HP for DM, DMG for players
    else {
      if (isDmView) {
        // DM sees actual HP
        const cur = typeof c.hp === 'number' ? c.hp : 0;
        if (typeof c.maxHp === 'number' && c.maxHp > 0) {
          parts.push(`HP: ${cur} / ${c.maxHp}`);
        } else {
          parts.push(`HP: ${cur}`);
        }
        // Also show damage for reference
        const dmg = typeof c.totalDamage === 'number' ? c.totalDamage : 0;
        parts.push(`DMG: ${dmg}`);
      } else {
        // Players only see damage
        const dmg = typeof c.totalDamage === 'number' ? c.totalDamage : 0;
        parts.push(`DMG: ${dmg}`);
      }
    }
    return parts.join('\n');
  };

  return (
    <>
      {characters.map((char) => {
        const left = char.x * cellPx + pad;
        const top = char.y * cellPx + pad;
        const selected = selectedCharacterId === char.id;

        return (
          // biome-ignore lint/a11y/useFocusableInteractive: focus on a11y later
          // biome-ignore lint/a11y/useSemanticElements: focus on a11y later
          // biome-ignore lint/a11y/useKeyWithClickEvents: focus on a11y later
          <div
            key={char.id}
            data-token={char.id} // <— link handle
            title={tooltip(char)} // <— quick hover tooltip
            className={clsx(
              tokenClasses(char.isPlayer),
              selected ? styles.selectedPlayer : ''
            )}
            style={{
              left,
              top,
              width: inner,
              height: inner,
              backgroundColor: char.color,
              opacity: char.isDead ? 0.5 : 1,
            }}
            onClick={() => onCharacterClick(char.id)}
            aria-label={char.name}
            role="button"
          >
            <span className="text-xs text-white font-medium">
              {characterInitials(char.name)}
            </span>

            {char.isDead && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-2xl"
                  style={{ textShadow: '0 0 3px black' }}
                >
                  💀
                </span>
              </div>
            )}

            {/* PC-only health bar */}
            {char.isPlayer && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="w-6 h-1 bg-gray-700 rounded">
                  <div
                    className="h-1 rounded transition-all"
                    style={{
                      width: `${Math.min(100, (char.hp / Math.max(1, char.maxHp)) * 100)}%`,
                      backgroundColor:
                        char.hp / char.maxHp > 0.5
                          ? '#10B981'
                          : char.hp / char.maxHp > 0.25
                            ? '#F59E0B'
                            : '#EF4444',
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
