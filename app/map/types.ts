// Movement / measurement
export type DistanceRule = '5e' | '5105' | 'euclidean';

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
export type TerrainType = 'wall' | 'door' | 'water' | 'furniture' | 'custom';

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
export type NPCType =
  | 'standard'
  | 'boss'
  | 'ally'
  | 'summon'
  | 'spiritual weapon';
export type InitiativeMode = 'auto' | 'manual';

export interface Character {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage?: number;
  totalDamage: number;
  ac?: number;
  initiative: number;
  initiativeMod?: number;
  lastInitRoll?: LastInitRoll;
  isPlayer: boolean;
  color: string; // token border/fill
  npcType?: NPCType; // optional flavor
  resistances?: string[];
  notes?: string;
  isDead?: boolean;
  conditions?: string[];
  hasAdvantage?: boolean;
  hasDisadvantage?: boolean;
  concentrating?: boolean;
}

export interface DamageEvent {
  id: string;
  characterId: string;
  characterName: string;
  amount: number; // positive = damage taken, negative = healed
  timestamp: number; // Date.now()
  round: number; // current combat round
  newHp: number; // HP after this event
  newTotalDamage: number; // total damage after this event
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
  flags?: 'adv' | 'dis' | null; // optional
};

export type RollScope = 'all' | 'pcs' | 'npcs' | 'selected';

export type RollPreset = {
  scope: RollScope;
  useMods?: boolean;
  advantage?: boolean;
  disadvantage?: boolean;
};

export type AppSnapshot = {
  characters: Character[];
  terrain: Terrain[];
  measurements: Measurement[];
  mapWidth: number;
  mapHeight: number;
  gridScale: number;
  round: number;
  currentTurn: number;
  selectedTool: string;
  customObjects: CustomObj[];
  damageLog: DamageEvent[];
  id: number;
};

export interface SnapshotUpdate {
  type: 'snapshot';
  snapShot: AppSnapshot;
}

// player --> DM messages for status/conditions updates
export interface UpdateHpMessage {
  type: 'updateHp';
  characterId: string;
  newHp: number;
  username: string;
}

export interface AddConditionMessage {
  type: 'addCondition';
  characterId: string;
  condition: string;
  username: string;
}

export interface RemoveConditionMessage {
  type: 'removeCondition';
  characterId: string;
  condition: string;
  username: string;
}

export interface ToggleStatusMessage {
  type: 'toggleStatus';
  characterId: string;
  statusType: 'advantage' | 'disadvantage' | 'concentration';
  value: boolean;
  username: string;
}

export interface UndoActionMessage {
  type: 'undoAction';
  username: string;
}
