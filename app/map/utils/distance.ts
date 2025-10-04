// distance.ts — pure distance calculator
import type { DistanceRule, Terrain } from '../types';
import { isWallAt } from './terrain';

/**
 * Returns distance in feet (or your feet-per-cell unit)
 * given grid coords and the feet per cell.
 */
export function measureFeet(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rule: DistanceRule,
  feetPerCell: number
): number {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  if (rule === '5e') return Math.max(dx, dy) * feetPerCell;

  if (rule === '5105') {
    const diag = Math.min(dx, dy);
    const straight = Math.abs(dx - dy);
    // 5-10-5 pattern: every second diagonal "costs" 10 ft
    const diagFeet =
      Math.floor(diag / 2) * (feetPerCell * 3) + (diag % 2) * feetPerCell;
    return diagFeet + straight * feetPerCell;
  }

  // "euclidean"
  return Math.round(Math.hypot(dx, dy) * feetPerCell);
}

export type Cell = { x: number; y: number };

/** Cells a straight line from (x0,y0) to (x1,y1) passes through (excludes start). */
export function traceLineCells(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): Cell[] {
  const cells: Cell[] = [];
  const dx = Math.abs(x1 - x0),
    sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0),
    sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  let x = x0,
    y = y0;
  while (!(x === x1 && y === y1)) {
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
    cells.push({ x, y });
  }
  return cells;
}

/** Clip grid movement at walls (no corner-cutting). */
export function clipMovementAtWalls(
  start: Cell,
  end: Cell,
  terrain: Terrain[]
): {
  lastFree: Cell;
  blocked: boolean;
  blockedAt?: Cell;
  reason?: 'wall' | 'corner';
} {
  let x = start.x,
    y = start.y;
  let last = { x, y };

  // Greedy 8-dir: take a diagonal when both deltas remain
  const sx = Math.sign(end.x - start.x);
  const sy = Math.sign(end.y - start.y);

  while (x !== end.x || y !== end.y) {
    const nx = x + (x !== end.x ? sx : 0);
    const ny = y + (y !== end.y ? sy : 0);
    const diag = nx !== x && ny !== y;

    // Corner-cut rule: allow sliding past a single corner.
    // Block the diagonal only if BOTH adjacent orthogonal cells are walls.
    if (diag) {
      const sideA = isWallAt(nx, y, terrain);
      const sideB = isWallAt(x, ny, terrain);
      if (sideA && sideB) {
        return {
          lastFree: last,
          blocked: true,
          blockedAt: { x: nx, y: ny },
          reason: 'corner',
        };
      }
    }

    // Entering a wall cell is blocked.
    if (isWallAt(nx, ny, terrain)) {
      return {
        lastFree: last,
        blocked: true,
        blockedAt: { x: nx, y: ny },
        reason: 'wall',
      };
    }

    x = nx;
    y = ny;
    last = { x, y };
  }

  return { lastFree: end, blocked: false };
}
