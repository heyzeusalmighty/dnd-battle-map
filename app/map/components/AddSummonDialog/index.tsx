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
import { RadioGroup } from '@/app/components/ui/radio-group';
import { useMapContext } from '../../context/MapContext';
import type { Character } from '../../types';
import { getId } from '../../utils/id';

const AddSummonDialog = () => {
  const { actions, handlers } = useMapContext();
  const { setCharacters } = actions;
  const { saveSnapshot } = handlers;

  const [showAddChar, setShowAddChar] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharInit, setNewCharInit] = useState('');
  const [newCharMaxHp, setNewCharMaxHp] = useState('');
  const [newCharType, setNewCharType] = useState<'summon' | 'spiritual weapon'>(
    'spiritual weapon'
  );

  const handleAddCharacter = () => {
    // Implement the logic to add a character
    console.log('Adding character:', {
      name: newCharName,
      initiativeMod: newCharInit,
      maxHp: newCharMaxHp,
    });

    const name = newCharName.trim();
    if (!name) return;

    const mod = Number.isFinite(parseInt(newCharInit, 10))
      ? parseInt(newCharInit, 10)
      : 0;
    const maxHp = Number.isFinite(parseInt(newCharMaxHp, 10))
      ? Math.max(1, parseInt(newCharMaxHp, 10))
      : 1;

    // If your Character requires hp/maxHp, keep them (hidden in UI)
    const newChar: Character = {
      id: getId(),
      name,
      x: 0,
      y: 0,
      hp: maxHp,
      maxHp: maxHp,
      damage: 0,
      totalDamage: 0,
      initiative: 0,
      initiativeMod: mod,
      isPlayer: false, // NPC
      color: 'transparent',
      npcType: newCharType,
    };

    // (Optional) // saveSnapshot(); if you wired undo/redo
    saveSnapshot();
    setCharacters((prev) => [...prev, newChar]);

    // Reset fields after adding
    setNewCharName('');
    setNewCharInit('');
    setNewCharMaxHp('');

    // Close the dialog
    setShowAddChar(false);
  };

  return (
    <Dialog open={showAddChar} onOpenChange={setShowAddChar}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          Add Summon
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Summon/Spiritual Weapon</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium" htmlFor="newCharName">
              Name
            </label>
            <Input
              name="newCharName"
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
              placeholder="e.g., Zombie"
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="newCharName">
              Summon Type
            </label>
            <RadioGroup value={newCharType} className="mt-1">
              <div className="flex gap-4">
                <div>
                  <input
                    type="radio"
                    id="spiritualWeapon"
                    name="summonType"
                    value="spiritual weapon"
                    checked={newCharType === 'spiritual weapon'}
                    onChange={() => setNewCharType('spiritual weapon')}
                    className="mr-2"
                  />
                  <label htmlFor="spiritualWeapon">Spiritual Weapon</label>
                </div>
                <div>
                  <input
                    type="radio"
                    id="summon"
                    name="summonType"
                    value="summon"
                    checked={newCharType === 'summon'}
                    onChange={() => setNewCharType('summon')}
                    className="mr-2"
                  />
                  <label htmlFor="summon">Summon</label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium" htmlFor="newCharInit">
                Initiative mod
              </label>
              <Input
                name="newCharInit"
                value={newCharInit}
                onChange={(e) => setNewCharInit(e.target.value)}
                placeholder="e.g., 2"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="newCharMaxHp">
                Max HP
              </label>
              <Input
                name="newCharMaxHp"
                value={newCharMaxHp}
                onChange={(e) => setNewCharMaxHp(e.target.value)}
                placeholder="e.g., 22 for zombie"
                inputMode="numeric"
              />
            </div>
          </div>

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
