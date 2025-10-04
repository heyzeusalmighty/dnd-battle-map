import type { AppSnapshot } from '../types';

/**
 * Creates a player-safe version of the game state.
 * Strips HP information from NPCs while preserving everything else.
 */
export function createPlayerSnapshot(fullSnapshot: AppSnapshot): AppSnapshot {
  return {
    ...fullSnapshot,
    characters: fullSnapshot.characters.map((char) => {
      // PCs: pass through unchanged
      if (char.isPlayer) {
        return char;
      }

      // NPCs: create a filtered version without HP info
      return {
        ...char,
        hp: 0,
        maxHp: 0,
      };
    }),
  };
}
