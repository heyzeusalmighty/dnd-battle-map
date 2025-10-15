'use client';

import { useEffect, useState } from 'react';
import { useMapContext } from '../map/context/MapContext';
import type { Character, Monster } from '../map/types';
import { pickNpcShade } from '../map/utils/bulk';
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

export default function SingleNpcForm({
  monsters,
  baseX = 1,
  baseY = 1,
}: Props) {
  const { state, actions, handlers } = useMapContext();
  const { characters, mapHeight, mapWidth, initiativeMode, terrain } = state;
  const { setCharacters, setInitiativeOrder, setSelectedCharacter } = actions;
  const { saveSnapshot } = handlers;

  // form
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);
  const [name, setName] = useState('');
  const [maxHp, setMaxHp] = useState('');
  const [initMod, setInitMod] = useState('');
  const [ac, setAc] = useState('');
  const [rollOnCreate, setRollOnCreate] = useState(false);

  // HP roll
  const [hpMode, setHpMode] = useState<'average' | 'max' | 'roll'>('average');
  const [lastRolledHp, setLastRolledHp] = useState<number | null>(null);

  useEffect(() => {
    if (selectedMonster) {
      setName(selectedMonster.name);
      setMaxHp(String(selectedMonster.hp.average));
      setInitMod(String(selectedMonster.initiative));
      setAc(String(selectedMonster.ac));
      setHpMode('average');
      setLastRolledHp(null);
    }
  }, [selectedMonster]);

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

  const handleRollHP = () => {
    if (!selectedMonster) return;

    const result = rollMonsterHP(selectedMonster.hp);
    setLastRolledHp(result.total);
    setMaxHp(String(result.total));
    setHpMode('roll');
  };

  const handleClearMonster = () => {
    setSelectedMonster(null);
    setName('');
    setMaxHp('');
    setInitMod('');
    setAc('');
    setHpMode('average');
    setLastRolledHp(null);
  };

  const findOpenSpot = (): { x: number; y: number } => {
    // spiral search wut
    for (let radius = 0; radius < Math.max(mapWidth, mapHeight); radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = baseX + dx;
          const y = baseY + dy;

          if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) continue;

          // check if space is occupied
          const occupied = characters.some((c) => c.x === x && c.y === y);
          const isWall = isWallAt(x, y, terrain);

          if (!occupied && !isWall) {
            return { x, y };
          }
        }
      }
    }

    return { x: baseX, y: baseY };
  };

  const onCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName || !maxHp) return;

    const hp = parseInt(maxHp, 10);
    const init = parseInt(initMod, 10) || 0;
    const armorClass = parseInt(ac, 10) || 10;

    if (Number.isNaN(hp) || hp < 1) return;

    saveSnapshot();

    const spot = findOpenSpot();
    const batchShade = pickNpcShade(trimmedName, characters);

    const newChar: Character = {
      id: getId(),
      name: trimmedName,
      x: spot.x,
      y: spot.y,
      isPlayer: false,
      color: batchShade,
      hp: hp,
      maxHp: hp,
      totalDamage: 0,
      initiative: 0,
      initiativeMod: init,
      damage: 0,
      ac: armorClass,
    };

    // Roll initiative if checkbox is checked
    if (rollOnCreate) {
      const die = d20();
      const mod = init;
      const total = die + mod;
      const capped = capInit(total);

      newChar.initiative = capped;
      newChar.lastInitRoll = {
        die,
        mod,
        total,
        capped,
        flags: null,
      };
    }

    setCharacters((prev) => [...prev, newChar]);

    if (initiativeMode === 'manual') {
      setInitiativeOrder((prev) => [...prev, newChar.id]);
    }

    setSelectedCharacter(newChar.id);

    handleClearMonster();
  };

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
        <label className="text-sm font-medium">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Zombie"
        />
      </div>

      {/* HP Section */}
      <div>
        <label className="text-sm font-medium block mb-1">Max HP</label>
        <div className="flex gap-2 items-end">
          <Input
            type="number"
            min={1}
            value={maxHp}
            onChange={(e) => setMaxHp(e.target.value)}
            placeholder="e.g., 22"
            className="flex-1"
          />

          {selectedMonster && (
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

        {selectedMonster && hpMode === 'roll' && lastRolledHp !== null && (
          <p className="text-xs text-gray-500 mt-1">
            Rolled {selectedMonster.hp.formula} = {lastRolledHp}
          </p>
        )}
      </div>

      {/* Initiative & AC */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Initiative mod</label>
          <Input
            type="number"
            value={initMod}
            onChange={(e) => setInitMod(e.target.value)}
            placeholder="e.g., 2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">AC</label>
          <Input
            type="number"
            min={1}
            value={ac}
            onChange={(e) => setAc(e.target.value)}
            placeholder="e.g., 15"
          />
        </div>
      </div>

      {/* Roll Initiative Checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="rollOnCreateSingle"
          checked={rollOnCreate}
          onCheckedChange={(v) => setRollOnCreate(!!v)}
        />
        <label htmlFor="rollOnCreateSingle" className="text-sm select-none">
          Roll initiative on create
        </label>
      </div>

      {/* Create Button */}
      <Button
        className="w-full bg-black text-white hover:bg-black/80"
        onClick={onCreate}
      >
        Add
      </Button>
    </div>
  );
}
