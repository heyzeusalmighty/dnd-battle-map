// app/components/BulkNpcForm.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Input } from './ui/input';

type Props = {
  monsters: Monster[];
  baseX?: number;
  baseY?: number;
  rollOnCreate: boolean;
};

export default function BulkNpcForm({
  monsters,
  baseX = 1,
  baseY = 1,
  rollOnCreate,
}: Props) {
  const { state, actions, handlers } = useMapContext();
  const { characters, mapHeight, mapWidth, initiativeMode, terrain } = state;
  const { setCharacters, setInitiativeOrder, setSelectedCharacter } = actions;
  const { saveSnapshot } = handlers;

  // --- form state
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);
  const [baseName, setBaseName] = useState('Zombie');
  const [count, setCount] = useState(3);
  const [initMod, setInitMod] = useState('');
  const [ac, setAc] = useState('');

  // Keep HP as a string for placeholder UX
  const [maxHp, setMaxHp] = useState<string>(''); // ← empty shows placeholder

  // HP mode/roll
  const [hpMode, setHpMode] = useState<'average' | 'max' | 'roll'>('average');
  const [lastRolledHp, setLastRolledHp] = useState<number | null>(null);
  const [showRollButton, setShowRollButton] = useState(false);

  // Populate defaults when a monster is selected
  useEffect(() => {
    if (!selectedMonster) return;
    setBaseName(selectedMonster.name);
    setMaxHp(String(selectedMonster.hp.average));
    setInitMod(String(selectedMonster.initiative));
    setHpMode('average');
    setLastRolledHp(null);
    setShowRollButton(true);
    setAc(String(selectedMonster.ac));
  }, [selectedMonster]);

  // Update HP when the HP mode changes
  useEffect(() => {
    if (!selectedMonster) return;

    if (hpMode === 'average') {
      setMaxHp(String(selectedMonster.hp.average));
    } else if (hpMode === 'max') {
      setMaxHp(String(selectedMonster.hp.max));
    } else if (hpMode === 'roll' && lastRolledHp !== null) {
      setMaxHp(String(lastRolledHp));
    }
  }, [hpMode, selectedMonster, lastRolledHp]);

  const handleClearMonster = () => {
    setSelectedMonster(null);
    setBaseName('Zombie');
    setMaxHp(''); // back to empty so placeholder shows
    setInitMod('');
    setAc('');
    setHpMode('average');
    setLastRolledHp(null);
    setShowRollButton(false);
  };

  const handleRollHP = () => {
    if (!selectedMonster) return;
    const result = rollMonsterHP(selectedMonster.hp);
    setLastRolledHp(result.total);
    setMaxHp(String(result.total)); // string
    setHpMode('roll');
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

    // Parse & clamp HP here (commit time)
    const parsed = parseInt(maxHp, 10);
    const hp = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
    const init = parseInt(initMod, 10) || 0;
    const armorClass = parseInt(ac, 10) || 10;

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
        hp,
        maxHp: hp,
        totalDamage: 0,
        initiative: 0,
        initiativeMod: init,
        damage: 0,
        ac: armorClass,
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

      {/* Name */}
      <div>
        <label className="text-sm font-medium mb-1 block">Name</label>
        <Input
          value={baseName}
          onChange={(e) => setBaseName(e.target.value)}
          placeholder="Zombie"
        />
      </div>

      {/* HP Section */}
      <div>
        <label className="text-sm font-medium block mb-1">Starting HP</label>
        <div className="flex gap-2 items-end">
          <Input
            type="number"
            min={1}
            value={maxHp} // string
            onChange={(e) => setMaxHp(e.target.value)} // don't coerce while typing
            placeholder="22"
            className="flex-1"
            onBlur={() => {
              // optional: gentle clamp on blur, but still allow clearing to show placeholder
              if (maxHp !== '') {
                const n = Math.max(1, parseInt(maxHp, 10) || 1);
                setMaxHp(String(n));
              }
            }}
          />

          {showRollButton && (
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={hpMode === 'average' ? 'default' : 'outline'}
                onClick={() => setHpMode('average')}
                className="text-xs px-2"
              >
                Avg
              </Button>
              <Button
                type="button"
                size="sm"
                variant={hpMode === 'max' ? 'default' : 'outline'}
                onClick={() => setHpMode('max')}
                className="text-xs px-2"
              >
                Max
              </Button>
              <Button
                type="button"
                size="sm"
                variant={hpMode === 'roll' ? 'default' : 'outline'}
                onClick={handleRollHP}
                className="text-xs px-2"
              >
                Roll
              </Button>
            </div>
          )}
        </div>

        {showRollButton && hpMode === 'roll' && lastRolledHp !== null && (
          <p className="text-xs text-gray-500 mt-1">
            Rolled {selectedMonster?.hp.formula} = {lastRolledHp} (applied to
            all)
          </p>
        )}
      </div>

      {/* Count & Initiative */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Count</label>
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
          <label className="text-sm font-medium mb-1 block">
            Initiative mod
          </label>
          <Input
            type="number"
            value={initMod}
            onChange={(e) => setInitMod(e.target.value)}
            placeholder="2"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">AC</label>
          <Input
            type="number"
            min={1}
            value={ac}
            onChange={(e) => setAc(e.target.value)}
            placeholder="15"
          />
        </div>
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
