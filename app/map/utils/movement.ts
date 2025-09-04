// movement.ts
import type { DistanceRule } from "../types";

/** Greedy 8-dir raster: take diagonals first until aligned, then straight. */
function rasterize(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): Array<{ x: number; y: number; isDiagonal: boolean }> {
  const steps: Array<{ x: number; y: number; isDiagonal: boolean }> = [];
  let x = x0,
    y = y0;
  const sx = Math.sign(x1 - x0),
    sy = Math.sign(y1 - y0);
  while (x !== x1 || y !== y1) {
    const diag = x !== x1 && y !== y1;
    if (diag) {
      x += sx;
      y += sy;
      steps.push({ x, y, isDiagonal: true });
    } else if (x !== x1) {
      x += sx;
      steps.push({ x, y, isDiagonal: false });
    } else {
      y += sy;
      steps.push({ x, y, isDiagonal: false });
    }
  }
  return steps;
}

/** Base step cost in feet (before difficult doubling), honoring your rule & gridScale. */
function makeBaseCostFn(rule: DistanceRule, gridScale: number) {
  let diagCount = 0; // for the alternating diagonal in "5105"
  return (isDiagonal: boolean): number => {
    switch (rule) {
      case "5e":
        // Every step is one square
        return gridScale;
      case "5105":
        if (!isDiagonal) return gridScale;
        diagCount += 1;
        // 1st diag = 1 square, 2nd diag = 2 squares, then repeat
        return (diagCount % 2 === 1 ? 1 : 2) * gridScale;
      case "euclidean":
      default:
        // Orth = 1 square, diag = sqrt(2) squares
        return (isDiagonal ? Math.SQRT2 : 1) * gridScale;
    }
  };
}

export type MoveStep = {
  x: number;
  y: number;
  isDiagonal: boolean;
  baseCost: number;
  isDifficult: boolean;
  stepCost: number; // after doubling for difficult
};

export function measureMoveCost(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rule: DistanceRule,
  gridScale: number,
  isDifficult: (x: number, y: number) => boolean
): { total: number; steps: MoveStep[] } {
  const steps = rasterize(x0, y0, x1, y1);
  const baseFor = makeBaseCostFn(rule, gridScale);

  let total = 0;
  const detailed: MoveStep[] = [];

  for (const s of steps) {
    const base = baseFor(s.isDiagonal);
    const difficult = isDifficult(s.x, s.y);
    const cost = difficult ? base * 2 : base;
    total += cost;
    detailed.push({
      x: s.x,
      y: s.y,
      isDiagonal: s.isDiagonal,
      baseCost: base,
      isDifficult: difficult,
      stepCost: cost,
    });
  }

  // Round to nearest foot for display parity with your labels
  return { total: Math.round(total), steps: detailed };
}
