'use client';

import { Heart, Minus, Plus, Shield } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import type { Character } from '@/app/map/types';
import { QuickStatusToggles } from './QuickStatusToggles';

interface PlayerHPControlsProps {
  character: Character;
  onUpdateHp: (newHp: number) => void;
  onAddCondition: (condition: string) => void;
  onRemoveCondition: (condition: string) => void;
  onToggleAdvantage: () => void;
  onToggleDisadvantage: () => void;
  onToggleConcentration: () => void;
}

const COMMON_CONDITIONS = [
  'Prone',
  'Restrained',
  'Grappled',
  'Stunned',
  'Paralyzed',
  'Unconscious',
  'Incapacitated',
  'Blinded',
  'Deafened',
  'Charmed',
  'Frightened',
  'Invisible',
  'Petrified',
  'Poisoned',
  'Exhaustion 1',
  'Exhaustion 2',
  'Exhaustion 3',
  'Exhaustion 4',
  'Exhaustion 5',
  'Exhaustion 6',
];

export function PlayerHPControls({
  character,
  onUpdateHp,
  onAddCondition,
  onRemoveCondition,
  onToggleAdvantage,
  onToggleDisadvantage,
  onToggleConcentration,
}: PlayerHPControlsProps) {
  const [damageAmount, setDamageAmount] = useState('');
  const [healAmount, setHealAmount] = useState('');
  const [customCondition, setCustomCondition] = useState('');
  const [showDamageDialog, setShowDamageDialog] = useState(false);
  const [showHealDialog, setShowHealDialog] = useState(false);
  const [showConditions, setShowConditions] = useState(false);

  const handleDamage = () => {
    const amount = parseInt(damageAmount, 10);
    if (Number.isFinite(amount) && amount > 0) {
      const newHp = Math.max(0, character.hp - amount);
      onUpdateHp(newHp);
      setDamageAmount('');
      setShowDamageDialog(false);
    }
  };

  const handleHeal = () => {
    const amount = parseInt(healAmount, 10);
    if (Number.isFinite(amount) && amount > 0) {
      const newHp = character.hp + amount;
      onUpdateHp(newHp);
      setHealAmount('');
      setShowHealDialog(false);
    }
  };

  const handleAddCondition = (condition: string) => {
    if (condition && !character.conditions?.includes(condition)) {
      onAddCondition(condition);
    }
  };

  const quickAdjust = (amount: number) => {
    const newHp = Math.max(0, character.hp + amount);
    onUpdateHp(newHp);
  };

  const hpPercentage = (character.hp / character.maxHp) * 100;
  const hpColor =
    hpPercentage > 50
      ? 'text-green-600'
      : hpPercentage > 25
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <Card className="p-4 space-y-4">
      {/* char name */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{character.name}</h3>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span className="text-sm">AC {character.ac || 10}</span>
        </div>
      </div>

      {/* quick status toggle */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Quick Status:</p>
        <QuickStatusToggles
          hasAdvantage={character.hasAdvantage}
          hasDisadvantage={character.hasDisadvantage}
          concentrating={character.concentrating}
          onToggleAdvantage={onToggleAdvantage}
          onToggleDisadvantage={onToggleDisadvantage}
          onToggleConcentration={onToggleConcentration}
        />
      </div>

      {/* HP display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium">Hit Points</span>
          </div>
          <span className={`text-2xl font-bold ${hpColor}`}>
            {character.hp} / {character.maxHp}
          </span>
        </div>

        {/* HP bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${Math.min(100, hpPercentage)}%`,
              backgroundColor:
                hpPercentage > 50
                  ? '#10b981'
                  : hpPercentage > 25
                    ? '#f59e0b'
                    : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* adjustment buttons */}
      <div className="grid grid-cols-4 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => quickAdjust(-5)}
          disabled={character.hp <= 0}
        >
          -5
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => quickAdjust(-1)}
          disabled={character.hp <= 0}
        >
          -1
        </Button>
        <Button size="sm" variant="outline" onClick={() => quickAdjust(1)}>
          +1
        </Button>
        <Button size="sm" variant="outline" onClick={() => quickAdjust(5)}>
          +5
        </Button>
      </div>

      {/* damage and heal buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="destructive"
          onClick={() => setShowDamageDialog(!showDamageDialog)}
          className="flex items-center gap-2"
        >
          <Minus className="w-4 h-4" />
          Take Damage
        </Button>
        <Button
          variant="default"
          onClick={() => setShowHealDialog(!showHealDialog)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Heal
        </Button>
      </div>

      {/* damage dialog */}
      {showDamageDialog && (
        <div className="p-3 border rounded-lg bg-red-50 space-y-2">
          <Input
            type="number"
            placeholder="Damage amount"
            value={damageAmount}
            onChange={(e) => setDamageAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDamage()}
          />
          <div className="flex gap-2">
            <Button onClick={handleDamage} size="sm" className="flex-1">
              Apply Damage
            </Button>
            <Button
              onClick={() => setShowDamageDialog(false)}
              size="sm"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* heal dialog */}
      {showHealDialog && (
        <div className="p-3 border rounded-lg bg-green-50 space-y-2">
          <Input
            type="number"
            placeholder="Heal amount"
            value={healAmount}
            onChange={(e) => setHealAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleHeal()}
          />
          <div className="flex gap-2">
            <Button onClick={handleHeal} size="sm" className="flex-1">
              Apply Healing
            </Button>
            <Button
              onClick={() => setShowHealDialog(false)}
              size="sm"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Conditions */}
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConditions(!showConditions)}
          className="w-full"
        >
          Conditions{' '}
          {character.conditions &&
            character.conditions.length > 0 &&
            `(${character.conditions.length})`}
        </Button>

        {showConditions && (
          <div className="space-y-2 p-3 border rounded-lg">
            {/* active conditions */}
            {character.conditions && character.conditions.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Active:</p>
                <div className="flex flex-wrap gap-1">
                  {character.conditions.map((condition) => (
                    <button
                      key={condition}
                      onClick={() => onRemoveCondition(condition)}
                      className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 rounded-full"
                      title="Click to remove"
                    >
                      {condition} ✕
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* add condition */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Add Condition:</p>
              <div className="flex flex-wrap gap-1">
                {COMMON_CONDITIONS.filter(
                  (c) => !character.conditions?.includes(c)
                ).map((condition) => (
                  <button
                    key={condition}
                    onClick={() => handleAddCondition(condition)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full"
                  >
                    {condition}
                  </button>
                ))}
              </div>

              {/* custom conditions */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Custom condition..."
                  value={customCondition}
                  onChange={(e) => setCustomCondition(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customCondition.trim()) {
                      handleAddCondition(customCondition.trim());
                      setCustomCondition('');
                    }
                  }}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (customCondition.trim()) {
                      handleAddCondition(customCondition.trim());
                      setCustomCondition('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* death indicator */}
      {character.hp === 0 && (
        <div className="p-2 bg-gray-900 text-white rounded text-center font-bold">
          💀 UNCONSCIOUS 💀
        </div>
      )}
    </Card>
  );
}
