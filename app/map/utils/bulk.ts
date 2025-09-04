// src/bulk.ts
import type { Character } from "../types";
import { clamp } from "../../components/ui/utils";

const GRAY = ["#9CA3AF", "#6B7280", "#4B5563", "#374151"]; // neutral
const REDS = ["#FECACA", "#FCA5A5", "#F87171", "#EF4444"]; // light → dark

// --- Name indexing ----------------------------------------------------------
/** Get the next 1-based index for `${baseName} N` among existing NPCs. */
export function nextNpcIndex(baseName: string, existing: Character[]): number {
  const re = new RegExp(`^${escapeRegExp(baseName)}\\s+(\\d+)$`, "i");
  let maxSeen = 0;
  for (const c of existing) {
    if (c.isPlayer) continue;
    const m = c.name.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) maxSeen = Math.max(maxSeen, n);
    }
  }
  return maxSeen + 1;
}
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- Grayscale shade picking -----------------------------------------------
/**
 * Deterministically pick a gray shade for an NPC type by initial bucket,
 * rotating to avoid collisions among types sharing the same initial.
 */
export function pickNpcShade(
  baseName: string,
  existing: Character[],
  palette: string[] = REDS // <-- default to reds now
): string {
  const initial = baseName.trim().charAt(0).toUpperCase() || "?";

  // Shades already used by OTHER types sharing this initial
  const used = new Set<string>();
  for (const c of existing) {
    if (c.isPlayer) continue;
    const ci = c.name.trim().charAt(0).toUpperCase() || "?";
    if (ci !== initial) continue;
    if (c.color) used.add(c.color);
  }

  const baseIdx = positiveHash(`${initial}:${baseName}`) % palette.length;
  for (let i = 0; i < palette.length; i++) {
    const idx = (baseIdx + i) % palette.length;
    const shade = palette[idx];
    if (!used.has(shade)) return shade;
  }
  return palette[baseIdx];
}

export const pickNpcGrayShade = (name: string, existing: Character[]) =>
  pickNpcShade(name, existing, GRAY);

function positiveHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

// --- Spawn slot finder ------------------------------------------------------
/**
 * Find up to `count` open slots scanning rightward from (startX,startY),
 * wrapping to next row, skipping blocked cells.
 */
export function findOpenSpawnSlots(
  count: number,
  startX: number,
  startY: number,
  mapW: number,
  mapH: number,
  isBlocked: (x: number, y: number) => boolean
): Array<{ x: number; y: number }> {
  const result: Array<{ x: number; y: number }> = [];
  let x = clamp(startX, 0, mapW - 1);
  let y = clamp(startY, 0, mapH - 1);

  let scanned = 0;
  const maxScan = mapW * mapH;
  while (result.length < count && scanned < maxScan) {
    if (!isBlocked(x, y)) result.push({ x, y });
    scanned++;
    x++;
    if (x >= mapW) {
      x = 0;
      y++;
      if (y >= mapH) y = 0;
    }
  }
  return result;
}
