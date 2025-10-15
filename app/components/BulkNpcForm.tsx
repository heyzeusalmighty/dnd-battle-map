// app/components/BulkNpcForm.tsx
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useMapContext } from '../map/context/MapContext';
import type { Character, Monster } from '../map/types';
import {
  findOpenSpawnSlots,
  nextNpcIndex,
  pickNpcShade,
} from '../map/utils/bulk';
import { capInit, d20 } from '../map/utils/dice';
import { getId } from '../map/utils/id';
import { isWallAt } from '../map/utils/terrain';
import { rollMonsterHP } from '../utils/diceRoller';
import { MonsterTypeahead } from './MonsterTypeahead';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';

type Props = {
  monsters: Monster[];
  baseX?: number;
  baseY?: number;
};

export default function BulkNpcForm({ monsters, baseX = 1, baseY = 1 }: Props) {
  const { state, actions, handlers } = useMapContext();
  const { characters, mapHeight, mapWidth, initiativeMode, terrain } = state;
  const { setCharacters, setInitiativeOrder, setSelectedCharacter } = actions;
  const { saveSnapshot } = handlers;

  // form
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);
  const [baseName, setBaseName] = useState('Zombie');
  const [count, setCount] = useState(3);
  const [initMod, setInitMod] = useState(0);
  const [rollOnCreate, setRollOnCreate] = useState(true);
  const [maxHp, setMaxHp] = useState(1);

  // HP roll
  const [lastRolledHp, setLastRolledHp] = useState<number | null>(null);
  const [showRollButton, setShowRollButton] = useState(false);

  // When monster is selected, populate defaults
  useEffect(() => {
    if (selectedMonster) {
      setBaseName(selectedMonster.name);
      setMaxHp(selectedMonster.hp.average);
      setInitMod(selectedMonster.initiative);
      setShowRollButton(true);
    }
  }, [selectedMonster]);

  const handleClearMonster = () => {
    setSelectedMonster(null);
    setBaseName('Zombie');
    setMaxHp(1);
    setInitMod(0);
    setLastRolledHp(null);
    setShowRollButton(false);
  };

  const handleRollHP = () => {
    if (!selectedMonster) return;

    const result = rollMonsterHP(selectedMonster.hp);
    setLastRolledHp(result.total);
    setMaxHp(result.total);
  };

  const occupied = useMemo(() => {
    const occ = new Set<string>();
    for (const c of characters) occ.add(`${c.x},${c.y}`);
    return occ;
  }, [characters]);

  const isBlocked = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return true;
    if (isWallAt(x, y, terrain)) return true;
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
        color: batchShade,
        hp: maxHp,
        maxHp: maxHp,
        totalDamage: 0,
        initiative: 0,
        initiativeMod: initMod,
        damage: 0,
      };
    });

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
          },
        };
      });
    });

    if (initiativeMode === 'manual') {
      setInitiativeOrder((prev) => [...prev, ...toAdd.map((n) => n.id)]);
    }

    setSelectedCharacter(toAdd[toAdd.length - 1].id);

    // Reset after creation
    handleClearMonster();
  }

  return (
    <div className="space-y-3">
      {/* Monster Search */}
      <div>
        <label className="text-sm font-medium mb-1 block">Search Monster</label>
        <MonsterTypeahead
          monsters={monsters}
          onSelect={setSelectedMonster}
          onClear={handleClearMonster}
          selectedMonster={selectedMonster}
        />
      </div>

      {/* Type / Name */}
      <div>
        <label className="text-sm font-medium">Type / Name</label>
        <Input
          value={baseName}
          onChange={(e) => setBaseName(e.target.value)}
          placeholder="e.g., Zombie"
        />
      </div>

      {/* Count, HP, Initiative */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Count</label>
          <Input
            type="number"
            min={1}
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, parseInt(e.target.value || '1', 10)))
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium">Initiative mod</label>
          <Input
            type="number"
            value={initMod}
            onChange={(e) => setInitMod(parseInt(e.target.value || '0', 10))}
          />
        </div>
      </div>

      {/* Max HP with Roll button */}
      <div>
        <label className="text-sm font-medium">Max HP</label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            value={maxHp}
            onChange={(e) =>
              setMaxHp(Math.max(1, parseInt(e.target.value || '1', 10)))
            }
            placeholder="e.g., 22"
            className="flex-1"
          />
          {showRollButton && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRollHP}
              className="text-xs px-3"
            >
              Roll
            </Button>
          )}
        </div>
        {showRollButton && lastRolledHp !== null && (
          <p className="text-xs text-gray-500 mt-1">
            Rolled {selectedMonster?.hp.formula} = {lastRolledHp} (applied to
            all)
          </p>
        )}
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
