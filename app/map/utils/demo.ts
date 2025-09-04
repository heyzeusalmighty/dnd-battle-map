// demo.ts — development/demo seed data
import type { Character, Terrain } from "../types";
import { DEFAULT_PARTY } from "./partyPresets";

const sid = (k: string) => `seed:${k}`;

// tiny helper
const presetByName = (name: string) =>
  DEFAULT_PARTY.find((p) => p.name === name);

export function demoCharacters(): Character[] {
  const mae = presetByName("Maelin");

  const maelin: Character = {
    id: sid("maelin"),
    name: "Maelin",
    x: 2,
    y: 2,
    hp: 7,
    maxHp: mae?.hp ?? 31,
    initiative: 1,
    // ✅ pull the default bonus from presets
    initiativeMod: mae?.initiativeMod ?? 0,
    isPlayer: true,
    // keep color in sync with presets but fall back to old value
    color: mae?.color ?? "#3B82F6",
    // include AC if your Character type supports it
    ...(mae?.ac ? ({ ac: mae.ac } as any) : {}),
  };

  const zombie: Character = {
    id: sid("zombie"),
    name: "V Rude Zombie",
    x: 8,
    y: 6,
    hp: 22,
    maxHp: 22,
    initiative: 20,
    isPlayer: false,
    npcType: "standard",
    color: "#EF4444",
  };

  return [maelin, zombie];
}

export function demoTerrain(): Terrain[] {
  return [
    { id: sid("t1"), x: 4, y: 4, type: "wall" },
    { id: sid("t2"), x: 5, y: 4, type: "wall" },
    { id: sid("t3"), x: 6, y: 4, type: "wall" },
    // "chest" isn't in TerrainType; use a custom-labeled object:
    { id: sid("chest"), x: 10, y: 8, type: "chest", label: "chest" },
  ];
}
