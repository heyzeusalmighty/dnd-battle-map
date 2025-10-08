import {
  ChevronDown,
  ChevronUp,
  Heart,
  Plus,
  Shield,
  Sword,
  Trash2,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export interface InitiativeEntry {
  id: string;
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  ac: number;
  isPlayer: boolean;
  npcType?: 'minion' | 'elite' | 'boss' | 'ally';
  conditions: string[];
  tempHp?: number;
  damageDealt?: number;
}

interface InitiativeTrackerProps {
  entries: InitiativeEntry[];
  currentTurn: number;
  onNextTurn: () => void;
  onPreviousTurn: () => void;
  onUpdateHp: (id: string, hp: number) => void;
  onUpdateInitiative: (id: string, initiative: number) => void;
  onRemoveEntry: (id: string) => void;
  onAddEntry: (entry: Omit<InitiativeEntry, 'id'>) => void;
  onAddCondition: (id: string, condition: string) => void;
  onRemoveCondition: (id: string, condition: string) => void;
  onUpdateTempHp: (id: string, tempHp: number) => void;
}

const COMMON_CONDITIONS = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
  'Exhaustion',
  'Concentration',
];

const NPC_TYPE_COLORS = {
  minion: '#FFA500',
  elite: '#FF4500',
  boss: '#8B0000',
  ally: '#32CD32',
};

export function InitiativeTracker({
  entries,
  currentTurn,
  onNextTurn,
  onPreviousTurn,
  onUpdateHp,
  onUpdateInitiative,
  onRemoveEntry,
  onAddEntry,
  onAddCondition,
  onRemoveCondition,
  onUpdateTempHp,
}: InitiativeTrackerProps) {
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newCharacterInit, setNewCharacterInit] = useState('');
  const [newCharacterHp, setNewCharacterHp] = useState('');
  const [newCharacterAc, setNewCharacterAc] = useState('');
  const [newCharacterType, setNewCharacterType] = useState<
    'player' | 'minion' | 'elite' | 'boss' | 'ally'
  >('player');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [round, setRound] = useState(1);
  const [showAddCharacter, setShowAddCharacter] = useState(false);

  // Dialog states for damage/heal modals
  const [showDamageDialog, setShowDamageDialog] = useState(false);
  const [showHealDialog, setShowHealDialog] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [damageAmount, setDamageAmount] = useState('');
  const [healAmount, setHealAmount] = useState('');

  const sortedEntries = useMemo(() => {
    return [...(entries || [])]
      .filter((entry) => entry && typeof entry.initiative === 'number')
      .sort((a, b) => b.initiative - a.initiative);
  }, [entries]);

  const handleAddCharacter = useCallback(() => {
    if (newCharacterName && newCharacterInit && newCharacterHp) {
      const hp = parseInt(newCharacterHp, 10) || 1;
      onAddEntry({
        name: newCharacterName,
        initiative: parseInt(newCharacterInit, 10) || 10,
        hp,
        maxHp: hp,
        ac: parseInt(newCharacterAc, 10) || 10,
        isPlayer: newCharacterType === 'player',
        npcType: newCharacterType === 'player' ? undefined : newCharacterType,
        conditions: [],
        tempHp: 0,
        damageDealt: 0,
      });
      setNewCharacterName('');
      setNewCharacterInit('');
      setNewCharacterHp('');
      setNewCharacterAc('');
      setNewCharacterType('player');
    }
  }, [
    newCharacterName,
    newCharacterInit,
    newCharacterHp,
    newCharacterAc,
    newCharacterType,
    onAddEntry,
  ]);

  const handleNextTurnWithRound = useCallback(() => {
    if (currentTurn === Math.max(0, sortedEntries.length - 1)) {
      setRound((prev) => prev + 1);
    }
    onNextTurn();
  }, [currentTurn, sortedEntries.length, onNextTurn]);

  const handleDamage = useCallback(
    (id: string, damage: number) => {
      const entry = (entries || []).find((e) => e && e.id === id);
      if (!entry || damage <= 0) return;

      let newHp = entry.hp;

      // Apply damage to temp HP first
      if (entry.tempHp && entry.tempHp > 0) {
        const tempHpAfterDamage = Math.max(0, entry.tempHp - damage);
        const remainingDamage = Math.max(0, damage - entry.tempHp);
        onUpdateTempHp(id, tempHpAfterDamage);

        if (remainingDamage > 0) {
          newHp = Math.max(0, entry.hp - remainingDamage);
          onUpdateHp(id, newHp);
        }
      } else {
        newHp = Math.max(0, entry.hp - damage);
        onUpdateHp(id, newHp);
      }
    },
    [entries, onUpdateHp, onUpdateTempHp]
  );

  const handleHeal = useCallback(
    (id: string, healing: number) => {
      const entry = (entries || []).find((e) => e && e.id === id);
      if (!entry || healing <= 0) return;

      const newHp = entry.hp + healing; // no cap to allow for healing
      onUpdateHp(id, newHp);
    },
    [entries, onUpdateHp]
  );

  const openDamageDialog = useCallback((entryId: string) => {
    setSelectedEntryId(entryId);
    setDamageAmount('');
    setShowDamageDialog(true);
  }, []);

  const openHealDialog = useCallback((entryId: string) => {
    setSelectedEntryId(entryId);
    setHealAmount('');
    setShowHealDialog(true);
  }, []);

  const confirmDamage = useCallback(() => {
    if (selectedEntryId && damageAmount) {
      const damage = parseInt(damageAmount, 10);
      if (damage > 0) {
        handleDamage(selectedEntryId, damage);
      }
    }
    setShowDamageDialog(false);
    setSelectedEntryId(null);
    setDamageAmount('');
  }, [selectedEntryId, damageAmount, handleDamage]);

  const confirmHeal = useCallback(() => {
    if (selectedEntryId && healAmount) {
      const healing = parseInt(healAmount, 10);
      if (healing > 0) {
        handleHeal(selectedEntryId, healing);
      }
    }
    setShowHealDialog(false);
    setSelectedEntryId(null);
    setHealAmount('');
  }, [selectedEntryId, healAmount, handleHeal]);

  const currentEntry = sortedEntries?.[currentTurn]
    ? sortedEntries[currentTurn]
    : null;

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3>Initiative Tracker</h3>
          <div className="text-sm text-muted-foreground">Round {round}</div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onPreviousTurn}
            disabled={entries.length === 0}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleNextTurnWithRound}
            disabled={entries.length === 0}
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {currentEntry && (
        <div className="mb-4 p-3 bg-primary/10 rounded-lg border-2 border-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{currentEntry.name}'s Turn</span>
              {currentEntry.npcType && (
                <Badge
                  variant="outline"
                  style={{
                    borderColor: NPC_TYPE_COLORS[currentEntry.npcType],
                    color: NPC_TYPE_COLORS[currentEntry.npcType],
                  }}
                >
                  {currentEntry.npcType.charAt(0).toUpperCase() +
                    currentEntry.npcType.slice(1)}
                </Badge>
              )}
            </div>
            <Badge variant="secondary">Round {round}</Badge>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {sortedEntries.map((entry, index) => (
          <div
            key={entry.id}
            className={`p-3 border rounded-lg ${
              index === currentTurn
                ? 'border-primary bg-primary/5'
                : 'border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{entry.name}</span>
                <Badge variant={entry.isPlayer ? 'default' : 'secondary'}>
                  {entry.isPlayer ? 'PC' : 'NPC'}
                </Badge>
                {entry.npcType && (
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: NPC_TYPE_COLORS[entry.npcType],
                      color: NPC_TYPE_COLORS[entry.npcType],
                    }}
                  >
                    {entry.npcType.charAt(0).toUpperCase() +
                      entry.npcType.slice(1)}
                  </Badge>
                )}
                {entry.hp <= 0 && <Badge variant="destructive">KO</Badge>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemoveEntry(entry.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm mb-2">
              <div>
                <label className="text-muted-foreground">Init</label>
                <Input
                  type="number"
                  value={entry.initiative}
                  onChange={(e) =>
                    onUpdateInitiative(
                      entry.id,
                      parseInt(e.target.value, 10) || 0
                    )
                  }
                  className="h-8"
                />
              </div>
              <div>
                <label className="text-muted-foreground">HP</label>
                <Input
                  type="number"
                  value={entry.hp}
                  onChange={(e) =>
                    onUpdateHp(
                      entry.id,
                      Math.max(0, parseInt(e.target.value, 10) || 0)
                    )
                  }
                  className="h-8"
                />
              </div>
              <div>
                <label className="text-muted-foreground">AC</label>
                <div className="h-8 flex items-center justify-center bg-muted rounded text-sm">
                  <Shield className="w-3 h-3 mr-1" />
                  {entry.ac}
                </div>
              </div>
            </div>

            {/* Temporary HP */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <div>
                <label className="text-muted-foreground">Temp HP</label>
                <Input
                  type="number"
                  value={entry.tempHp || 0}
                  onChange={(e) =>
                    onUpdateTempHp(
                      entry.id,
                      Math.max(0, parseInt(e.target.value, 10) || 0)
                    )
                  }
                  className="h-8"
                />
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openDamageDialog(entry.id)}
                  className="flex-1 text-xs"
                >
                  <Sword className="w-3 h-3 mr-1" />
                  Damage
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openHealDialog(entry.id)}
                  className="flex-1 text-xs"
                >
                  <Heart className="w-3 h-3 mr-1" />
                  Heal
                </Button>
              </div>
            </div>

            {/* Health Bar */}
            <div className="flex items-center gap-1 text-xs mb-2">
              <span>HP: </span>
              <div className="flex-1 bg-gray-200 rounded h-2 relative">
                <div
                  className="h-2 rounded transition-all"
                  style={{
                    width: `${Math.min(100, (entry.hp / entry.maxHp) * 100)}%`,
                    backgroundColor:
                      entry.hp / entry.maxHp > 0.75
                        ? '#10B981'
                        : entry.hp / entry.maxHp > 0.5
                          ? '#84CC16'
                          : entry.hp / entry.maxHp > 0.25
                            ? '#F59E0B'
                            : '#EF4444',
                  }}
                />
                {entry.tempHp && entry.tempHp > 0 && (
                  <div
                    className="h-2 rounded-r absolute top-0 bg-blue-400"
                    style={{
                      left: `${Math.min(100, (entry.hp / entry.maxHp) * 100)}%`,
                      width: `${Math.min(25, (entry.tempHp / entry.maxHp) * 100)}%`,
                    }}
                  />
                )}
              </div>
              <span>
                {entry.hp}/{entry.maxHp}
                {entry.hp > entry.maxHp && (
                  <span className="text-green-600">
                    {' '}
                    (+{entry.hp - entry.maxHp})
                  </span>
                )}
                {entry.tempHp && entry.tempHp > 0 && (
                  <span className="text-blue-500"> (+{entry.tempHp})</span>
                )}
              </span>
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              {(entry.conditions || []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(entry.conditions || []).map((condition, conditionIndex) => (
                    <Badge
                      key={`${condition}-${conditionIndex}`}
                      variant="destructive"
                      className="text-xs cursor-pointer"
                      onClick={() => onRemoveCondition(entry.id, condition)}
                    >
                      {condition} ×
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-1">
                <Select
                  value={selectedCondition}
                  onValueChange={setSelectedCondition}
                >
                  <SelectTrigger className="h-6 text-xs">
                    <SelectValue placeholder="Add condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CONDITIONS.map((condition) => (
                      <SelectItem
                        key={condition}
                        value={condition}
                        className="text-xs"
                      >
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedCondition) {
                      onAddCondition(entry.id, selectedCondition);
                      setSelectedCondition('');
                    }
                  }}
                  className="h-6 px-2 text-xs"
                  disabled={!selectedCondition}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Add Character</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddCharacter(!showAddCharacter)}
          >
            <Plus className="w-4 h-4 mr-1" />
            {showAddCharacter ? 'Cancel' : 'Add'}
          </Button>
        </div>

        {showAddCharacter && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Name"
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Initiative"
                type="number"
                value={newCharacterInit}
                onChange={(e) => setNewCharacterInit(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="HP"
                type="number"
                value={newCharacterHp}
                onChange={(e) => setNewCharacterHp(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="AC"
                type="number"
                value={newCharacterAc}
                onChange={(e) => setNewCharacterAc(e.target.value)}
                className="text-sm"
              />
            </div>
            <Select
              value={newCharacterType}
              onValueChange={(
                value: 'player' | 'minion' | 'elite' | 'boss' | 'ally'
              ) => setNewCharacterType(value)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Character Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Player Character</SelectItem>
                <SelectItem value="minion">Minion</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
                <SelectItem value="boss">Boss</SelectItem>
                <SelectItem value="ally">Ally</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAddCharacter} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Character
            </Button>
          </>
        )}
      </div>

      {/* Damage Dialog */}
      <Dialog open={showDamageDialog} onOpenChange={setShowDamageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Damage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Damage Amount</label>
              <Input
                type="number"
                value={damageAmount}
                onChange={(e) => setDamageAmount(e.target.value)}
                placeholder="Enter damage amount"
                min="0"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={confirmDamage}
                className="flex-1"
                disabled={!damageAmount}
              >
                Apply Damage
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDamageDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Heal Dialog */}
      <Dialog open={showHealDialog} onOpenChange={setShowHealDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Healing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Healing Amount</label>
              <Input
                type="number"
                value={healAmount}
                onChange={(e) => setHealAmount(e.target.value)}
                placeholder="Enter healing amount"
                min="0"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={confirmHeal}
                className="flex-1"
                disabled={!healAmount}
              >
                Apply Healing
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowHealDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
