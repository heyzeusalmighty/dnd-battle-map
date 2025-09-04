"use client";

import React, { useMemo, useState } from "react";
import type { Character, InitiativeMode } from "../map/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import {
  nextNpcIndex,
  pickNpcShade,
  findOpenSpawnSlots,
} from "../map/utils/bulk";
import { getId } from "../map/utils/id";
import { d20, capInit } from "../map/utils/dice";

type Props = {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;

  mapWidth: number;
  mapHeight: number;

  isWallAt: (x: number, y: number) => boolean;

  initiativeMode: InitiativeMode; // "auto" | "manual"
  setInitiativeOrder: React.Dispatch<React.SetStateAction<string[]>>;

  setSelectedCharacter: (id: string) => void;

  saveSnapshot: () => void;

  baseX?: number;
  baseY?: number;
};

export default function BulkNpcForm({
  characters,
  setCharacters,
  mapWidth,
  mapHeight,
  isWallAt,
  initiativeMode,
  setInitiativeOrder,
  setSelectedCharacter,
  saveSnapshot,
  baseX = 1,
  baseY = 1,
}: Props) {
  const [baseName, setBaseName] = useState("Zombie");
  const [count, setCount] = useState(3);
  const [initMod, setInitMod] = useState(0);
  const [rollOnCreate, setRollOnCreate] = useState(true);

  const occupied = useMemo(() => {
    const occ = new Set<string>();
    for (const c of characters) occ.add(`${c.x},${c.y}`);
    return occ;
  }, [characters]);

  const isBlocked = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return true;
    if (isWallAt(x, y)) return true;
    if (occupied.has(`${x},${y}`)) return true;
    return false;
  };

  function onCreate() {
    const name = baseName.trim();
    if (!name || count < 1) return;

    saveSnapshot();

    const startIndex = nextNpcIndex(name, characters);
    const batchShade = pickNpcShade(name, characters);
    const spawns = findOpenSpawnSlots(
      count,
      baseX,
      baseY,
      mapWidth,
      mapHeight,
      isBlocked
    );

    // Build the new characters once
    const toAdd: Character[] = Array.from({ length: count }, (_, i) => {
      const id = getId();
      const spawn = spawns[i] ?? {
        x: (baseX + i) % mapWidth,
        y: baseY,
      };
      return {
        id,
        name: `${name} ${startIndex + i}`,
        x: spawn.x,
        y: spawn.y,
        isPlayer: false,
        color: batchShade, // all members of this batch share the shade
        hp: 0,
        maxHp: 0,
        initiative: 0,
        initiativeMod: initMod,
        damage: 0,
      };
    });

    // Single state update: append, then (optionally) set initiative for just-created IDs
    setCharacters((prev) => {
      const createdIds = new Set(toAdd.map((n) => n.id));
      const appended = [...prev, ...toAdd];

      if (!rollOnCreate) return appended;

      return appended.map((c) => {
        if (!createdIds.has(c.id)) return c;
        const die = d20();
        const mod = c.initiativeMod ?? 0;
        const total = die + mod;
        const capped = capInit(total);
        return {
          ...c,
          initiative: capped,
          lastInitRoll: {
            die,
            mod,
            total,
            capped,
            flags: null,
          }, // matches your types
        };
      });
    });

    if (initiativeMode === "manual") {
      setInitiativeOrder((prev) => [...prev, ...toAdd.map((n) => n.id)]);
    }

    setSelectedCharacter(toAdd[toAdd.length - 1].id);
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Type / Name</label>
        <Input
          value={baseName}
          onChange={(e) => setBaseName(e.target.value)}
          placeholder="e.g., Zombie"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Count</label>
          <Input
            type="number"
            min={1}
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, parseInt(e.target.value || "1", 10)))
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Initiative mod</label>
          <Input
            type="number"
            value={initMod}
            onChange={(e) => setInitMod(parseInt(e.target.value || "0", 10))}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="rollOnCreate"
          checked={rollOnCreate}
          onCheckedChange={(v) => setRollOnCreate(!!v)}
        />
        <label htmlFor="rollOnCreate" className="text-sm select-none">
          Roll initiative on create
        </label>
      </div>

      <Button
        className="w-full bg-black text-white hover:bg-black/80"
        onClick={onCreate}
      >
        Create {count}
      </Button>
    </div>
  );
}
