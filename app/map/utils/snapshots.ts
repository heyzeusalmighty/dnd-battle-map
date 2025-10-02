// snapshots.ts
import type { Character, Terrain, CustomObj, Measurement, DamageEvent } from "../types";

// If you use a stricter union, feel free to replace `string` with it.
export type InitiativeMode = string; // e.g., "manual" | "auto"

export type Snapshot = {
  characters: Character[];
  terrain: Terrain[];
  customObjects: CustomObj[];
  measurements: Measurement[];
  initiativeOrder: string[];
  initiativeMode: InitiativeMode;
  amageLog: DamageEvent[];
};

// ---- internal deep clone helpers (no refs shared with React state) ----
const cloneCharacters = (arr: Character[]) => arr.map((c) => ({ ...c }));
const cloneTerrain = (arr: Terrain[]) => arr.map((t) => ({ ...t }));
const cloneCustom = (arr: CustomObj[]) => arr.map((o) => ({ ...o }));
const cloneMeasurements = (arr: Measurement[]) => arr.map((m) => ({ ...m }));

/**
 * Capture a pure, immutable snapshot of user-facing content/state.
 * Keep UI-only state (selected tool, hovered cell, selection rings, previews) OUT of this.
 */
export function takeSnapshot(model: {
  characters: Character[];
  terrain: Terrain[];
  customObjects: CustomObj[];
  measurements: Measurement[];
  initiativeOrder: string[];
  initiativeMode: InitiativeMode;
  damageLog: DamageEvent[];
}): Snapshot {
  return {
    characters: cloneCharacters(model.characters),
    terrain: cloneTerrain(model.terrain),
    customObjects: cloneCustom(model.customObjects),
    measurements: cloneMeasurements(model.measurements),
    initiativeOrder: [...model.initiativeOrder],
    initiativeMode: model.initiativeMode,
    damageLog: [...model.damageLog],
  };
}

/**
 * Return deep-cloned state ready to feed into your React setters.
 * (Pure: does NOT mutate.)
 */
export function applySnapshot(snap: Snapshot): Snapshot {
  return {
    characters: cloneCharacters(snap.characters),
    terrain: cloneTerrain(snap.terrain),
    customObjects: cloneCustom(snap.customObjects),
    measurements: cloneMeasurements(snap.measurements),
    initiativeOrder: [...snap.initiativeOrder],
    initiativeMode: snap.initiativeMode,
    damageLog: [...snap.damageLog],
  };
}

// -------------------- history helpers (pure) ----------------------------

/** Keep only the most recent `max` snapshots. */
export function capHistory<T>(stack: T[], max = 50): T[] {
  return stack.length > max ? stack.slice(stack.length - max) : stack;
}

/** Push a snapshot onto the undo stack, clearing redo (callers should clear redo). */
export function pushSnapshot(
  undo: Snapshot[],
  snap: Snapshot,
  max = 50
): Snapshot[] {
  return capHistory([...undo, snap], max);
}

/**
 * Pop from UNDO: returns new stacks and the snapshot to apply.
 * Also pushes the current state onto REDO.
 */
export function popUndo(
  undo: Snapshot[],
  redo: Snapshot[],
  current: Snapshot, // current state you’re about to leave
  max = 50
): { undo: Snapshot[]; redo: Snapshot[]; apply?: Snapshot } {
  if (undo.length === 0) return { undo, redo, apply: undefined };
  const apply = undo[undo.length - 1];
  const nextUndo = undo.slice(0, -1);
  const nextRedo = capHistory([...redo, current], max);
  return { undo: nextUndo, redo: nextRedo, apply };
}

/**
 * Pop from REDO: returns new stacks and the snapshot to apply.
 * Also pushes the current state onto UNDO.
 */
export function popRedo(
  undo: Snapshot[],
  redo: Snapshot[],
  current: Snapshot,
  max = 50
): { undo: Snapshot[]; redo: Snapshot[]; apply?: Snapshot } {
  if (redo.length === 0) return { undo, redo, apply: undefined };
  const apply = redo[redo.length - 1];
  const nextRedo = redo.slice(0, -1);
  const nextUndo = capHistory([...undo, current], max);
  return { undo: nextUndo, redo: nextRedo, apply };
}
