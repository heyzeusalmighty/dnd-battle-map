// terrain.ts — tiny helpers (root-level file)

import type { CustomObj, Terrain } from '../types';

export const BUILTIN_TERRAIN = new Set([
  'wall',
  'door',
  'difficult',
  'water',
  'furniture',
]);

export const getTerrainColor = (type: string) => {
  switch (type) {
    case 'wall':
      return '#8B7355';
    case 'difficult':
      return '#D2691E';
    case 'water':
      return '#4682B4';
    case 'pit':
      return '#2F2F2F';
    case 'door':
      return '#8B4513';
    case 'window':
      return '#87CEEB';
    case 'furniture':
      return '#654321';
    case 'trap':
      return '#FF4500';
    case 'border':
      return '#000000';
    // Custom objects
    case 'chest':
      return '#8B4513';
    case 'altar':
      return '#D4AF37';
    case 'statue':
      return '#708090';
    case 'pillar':
      return '#A9A9A9';
    case 'torch':
      return '#FF6347';
    case 'barrel':
      return '#8B4513';
    case 'table':
      return '#654321';
    case 'bed':
      return '#DDA0DD';
    case 'bookshelf':
      return '#8B4513';
    case 'anvil':
      return '#2F4F4F';
    default:
      return 'transparent';
  }
};

export const textColorOn = (hex: string) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.replace(/(.)/g, '$1$1') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000' : '#fff';
};

export const getObjectLetter = (obj: CustomObj) => {
  const s = (obj.label?.trim() || obj.id).trim();
  return s ? s[0].toUpperCase() : '?';
};

// helper to detect walls (your terrain tiles use lowercase types)
export const isWallAt = (x: number, y: number, terrain: Terrain[]) => {
  // fast lookup map (optional but cheap)
  // if you already have a map/set elsewhere, reuse it and delete this loop.
  for (let i = 0; i < terrain.length; i++) {
    const t = terrain[i];
    if (t.x === x && t.y === y) {
      const tt = (t as Terrain).type;
      const tag = (typeof tt === 'string' ? tt : String(tt)).toLowerCase();
      return tag === 'wall';
      // If you track doors later:
      // return tag === "wall" || (tag === "door" && !t.open);
    }
  }
  return false;
};
