// src/types.ts

// Movement / measurement
export type DistanceRule = "5e" | "5105" | "euclidean";

export interface Measurement {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  distance: number; // feet (or your feet-per-cell unit)
}

// Map config (the editable map settings dialog)
export interface MapConfig {
  width: number;
  height: number;
  gridScale: number; // feet per cell (e.g., 5)
  distanceRule: DistanceRule; // "5e" | "5105" | "euclidean"
}

// Terrain / objects on the grid
export type TerrainType = "wall" | "door" | "water" | "furniture" | "custom";

export interface Terrain {
  id: string;
  type: string;
  x: number;
  y: number;
  // Some items are multi-cell or labeled; keep these optional to avoid compile pain.
  w?: number;
  h?: number;
  label?: string;
  color?: string;
}

// Characters (PCs/NPCs)
export type NPCType = "standard" | "boss" | "ally";
export type InitiativeMode = "auto" | "manual";

export interface Character {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  initiative: number;
  initiativeMod?: number; // per-character modifier
  isPlayer: boolean; // true for PCs
  color: string; // token border/fill
  ac?: number;
  damage?: number;
  npcType?: NPCType; // optional flavor
  resistances?: string[];
  notes?: string;
  lastInitRoll?: LastInitRoll;
}

// (Optional) Tool names, for later if you want stronger typing.
// Using this union now is optional—keep your `string` state if you prefer.
// export type Tool = "select" | "measure" | "wall" | "door" | "water" | "furniture" | "custom";

export type CustomObj = {
  id: string;
  label: string;
  icon: string;
  color: string;
  emoji?: string;
};

// initiative roll tooltip
export type LastInitRoll = {
  die: number; // raw d20
  mod: number; // initiativeMod used
  total: number; // die + mod (before cap)
  capped: number; // after capInit()
  flags?: "adv" | "dis" | null; // optional
};
