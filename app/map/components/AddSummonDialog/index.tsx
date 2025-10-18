import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { useMapContext } from '../../context/MapContext';
import type { Character } from '../../types';
import { capInit, d20 } from '../../utils/dice';
import { getId } from '../../utils/id';

type Props = {
  rollOnCreate: boolean; // ADD THIS
};

const AddSummonDialog = ({ rollOnCreate }: Props) => {
  const { state, actions, handlers } = useMapContext();
  const { initiativeMode } = state;
  const { setCharacters, setInitiativeOrder, setSelectedCharacter } = actions;
  const { saveSnapshot } = handlers;

  const [showAddChar, setShowAddChar] = useState(false);
  const [name, setName] = useState('');
  const [summonType, setSummonType] = useState<'summon' | 'spiritual weapon'>(
    'spiritual weapon'
  );
  const [maxHp, setMaxHp] = useState('');
  const [initMod, setInitMod] = useState('');
  const [ac, setAc] = useState('');

  const handleClear = () => {
    setName('');
    setMaxHp('');
    setInitMod('');
    setAc('');
    setSummonType('spiritual weapon');
  };

  const handleAddCharacter = () => {
    const trimmedName = name.trim();
    if (!trimmedName || !maxHp) return;

    // Parse & clamp (matching other forms)
    const parsed = parseInt(maxHp, 10);
    const hp = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
    const init = parseInt(initMod, 10) || 0;
    const armorClass = parseInt(ac, 10) || 10;

    saveSnapshot();

    const newChar: Character = {
      id: getId(),
      name: trimmedName,
      x: 0,
      y: 0,
      hp: hp,
      maxHp: hp,
      totalDamage: 0,
      initiative: 0,
      initiativeMod: init,
      damage: 0,
      ac: armorClass,
      isPlayer: false,
      color: 'transparent',
      npcType: summonType,
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

    // Reset and close
    handleClear();
    setShowAddChar(false);
  };

  // Determine if AC should be shown
  const showAc = summonType === 'summon';

  return (
    <Dialog open={showAddChar} onOpenChange={setShowAddChar}>
      <DialogTrigger asChild>
        <Button
          className="w-full h-10 text-sm flex items-center justify-center gap-2"
          variant="outline"
        >
          <Sparkles className="w-5 h-5" />
          Add Summon
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Summon/Spiritual Weapon</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Summon Type */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              Summon Type
            </label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="spiritualWeapon"
                  name="summonType"
                  value="spiritual weapon"
                  checked={summonType === 'spiritual weapon'}
                  onChange={() => setSummonType('spiritual weapon')}
                />
                <label htmlFor="spiritualWeapon" className="text-sm">
                  Spiritual Weapon
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="summon"
                  name="summonType"
                  value="summon"
                  checked={summonType === 'summon'}
                  onChange={() => setSummonType('summon')}
                />
                <label htmlFor="summon" className="text-sm">
                  Summon
                </label>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                summonType === 'spiritual weapon' ? 'Greatsword' : 'Fire Mephit'
              }
            />
          </div>

          {/* Starting HP */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              Starting HP
            </label>
            <Input
              type="number"
              min={1}
              value={maxHp}
              onChange={(e) => setMaxHp(e.target.value)}
              placeholder="22"
            />
          </div>

          {/* Initiative & AC (conditionally show AC) */}
          <div
            className={`grid gap-3 ${showAc ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
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
            {showAc && (
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
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAddChar(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCharacter}>Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddSummonDialog;
