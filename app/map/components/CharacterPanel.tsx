import { Ghost, MoreVertical, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import BulkNpcForm from '../../components/BulkNpcForm';
import SingleNpcForm from '../../components/SingleNpcForm';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useMonsterSearch } from '../../hooks/useMonsterSearch';
import { QuickStatusToggles } from '../../map-view/components/QuickStatusToggles';
import { useMapContext } from '../context/MapContext';
import type { CharacterStatus } from '../context/types';
import type { Character, DamageEvent } from '../types';
import { COMMON_CONDITIONS } from '../utils/conditions';
import { capInit, d20 } from '../utils/dice';
import { getId } from '../utils/id';
import { DEFAULT_PARTY } from '../utils/partyPresets';
import AddSummonDialog from './AddSummonDialog';

interface CharacterPanelProps {
  sendPlayerAction: (action: any) => void;
}

const CharacterPanel = ({ sendPlayerAction }: CharacterPanelProps) => {
  const { handlers, state, actions } = useMapContext();
  const {
    setCharacters,
    setInitiativeOrder,
    setCharTab,
    setPresetToAdd,
    setShowAddChar,
    setAddMode,
    setNewCharName,
    setNewCharMaxHp,
    setNewCharInit,
    setCharQuery,
    setCharFilter,
    setDamageLog,
  } = actions;
  const { handleDeleteCharacter, saveSnapshot, handleCharacterClick } =
    handlers;
  const {
    selectedCharacter,
    initiativeMode,
    charTab,
    presetToAdd,
    showAddChar,
    addMode,
    newCharName,
    newCharMaxHp,
    newCharInit,
    charQuery,
    charFilter,
    filteredCharacters,
    characters,
  } = state;

  const { monsters, loading: monstersLoading } = useMonsterSearch();
  const [editingHp, setEditingHp] = useState<Record<string, string>>({});
  const [rollOnCreate, setRollOnCreate] = useState(true);

  const damageEventQueue = useRef<DamageEvent[]>([]);
  const damageEventTimeout = useRef<NodeJS.Timeout | null>(null);

  const addPartyFromPresets = () => {
    const baseX = 1;
    const baseY = 1;

    saveSnapshot?.();

    const newlyAddedIds: string[] = [];

    DEFAULT_PARTY.forEach((p, i) => {
      const incoming: Character = {
        id: getId(),
        name: p.name,
        x: baseX + i,
        y: baseY,
        hp: p.hp,
        maxHp: p.hp,
        totalDamage: 0,
        initiative: 0,
        initiativeMod: p.initiativeMod ?? 0,
        isPlayer: true,
        color: p.color ?? '#3B82F6',
        ac: p.ac,
      };

      if (rollOnCreate) {
        const die = d20();
        const mod = p.initiativeMod ?? 0;
        const total = die + mod;
        const capped = capInit(total);

        incoming.initiative = capped;
        incoming.lastInitRoll = {
          die,
          mod,
          total,
          capped,
          flags: null,
        };
      }

      const { added, id } = upsertPlayerByName(incoming);
      if (added) newlyAddedIds.push(id);
    });

    // If you have a manual initiative list, append only truly-new entries
    if (initiativeMode === 'manual' && newlyAddedIds.length) {
      setInitiativeOrder((prev) => [...prev, ...newlyAddedIds]);
    }
  };

  const normName = (s: string) => s.trim().toLowerCase();

  /** Upsert a *player* by name; preserves id/x/y if updating.
   *  Returns { added, id } so callers can update initiativeOrder for new entries.
   */
  const upsertPlayerByName = (
    incoming: Character
  ): { added: boolean; id: string } => {
    const n = normName(incoming.name);
    let added = false;
    let keptId = incoming.id;

    setCharacters((prev) => {
      const idx = prev.findIndex((c) => c.isPlayer && normName(c.name) === n);
      if (idx !== -1) {
        const cur = prev[idx];

        // Build merged record (preserve id/pos; don’t clobber player-owned fields)
        const next: Character = {
          ...cur,
          color: incoming.color ?? cur.color,
          ac: incoming.ac ?? cur.ac,
          // only set initiativeMod if provided on incoming; otherwise keep current
          initiativeMod: incoming.initiativeMod ?? cur.initiativeMod,
          isPlayer: true,
        };

        // Optional: seed HP/MaxHP once if current is unset
        if ((cur.maxHp ?? 0) === 0 && (incoming.maxHp ?? 0) > 0) {
          next.maxHp = incoming.maxHp;
          if ((cur.hp ?? 0) === 0 && (incoming.hp ?? 0) > 0)
            next.hp = incoming.hp;
        }

        if (
          next.color === cur.color &&
          next.ac === cur.ac &&
          next.initiativeMod === cur.initiativeMod &&
          next.maxHp === cur.maxHp &&
          next.hp === cur.hp
        ) {
          return prev;
        }

        const copy = [...prev];
        copy[idx] = next;
        keptId = cur.id;
        return copy;
      }

      // add new PC
      added = true;
      return [...prev, incoming];
    });

    return { added, id: keptId };
  };

  // Debounced damage event batching
  const logDamageEvent = (char: Character, oldHp: number, newHp: number) => {
    const amount = oldHp - newHp; // positive for damage, negative for healing

    if (amount === 0) return;
    const event: DamageEvent = {
      id: getId(),
      characterId: char.id,
      characterName: char.name,
      amount: amount,
      timestamp: Date.now(),
      round: state.round,
      newHp: newHp,
      newTotalDamage: char.maxHp - newHp,
    };
    damageEventQueue.current.push(event);
    if (damageEventTimeout.current) {
      clearTimeout(damageEventTimeout.current);
    }
    damageEventTimeout.current = setTimeout(() => {
      if (damageEventQueue.current.length > 0) {
        // Combine all events into a single log message
        const combined = damageEventQueue.current;
        const totalAmount = combined.reduce((sum, e) => sum + e.amount, 0);

        const lastEvent = combined[combined.length - 1];
        if (lastEvent) {
          lastEvent.amount = totalAmount;
        }

        setDamageLog((prev) => [...prev, ...(lastEvent ? [lastEvent] : [])]);

        damageEventQueue.current = [];
      }
    }, 2000);
  };

  // handle damage for any character
  const applyDamage = (characterId: string, amount: number) => {
    const damageAmount = Number.isFinite(amount) ? Math.floor(amount) : 0;
    if (damageAmount <= 0) return;

    const char = characters.find((c) => c.id === characterId);
    if (!char) return;

    const oldHp = char.hp;
    const newHp = Math.max(0, oldHp - damageAmount);

    // Check if this damage will kill the character
    const justDied = newHp === 0 && oldHp > 0;

    saveSnapshot();

    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== characterId) return c;

        const calculatedDamage = Math.max(0, c.maxHp - newHp);

        return {
          ...c,
          hp: newHp,
          totalDamage: calculatedDamage,
          isDead: newHp === 0,
        };
      })
    );

    // Log damage and death
    logDamageEvent(char, oldHp, newHp);
    sendPlayerAction({
      actionType: 'updateHp',
      characterId,
      newHp,
    });

    if (justDied) {
      console.log(`${char.name} hit da flo'`);
    }
  };

  // handle healing for any character
  const applyHealing = (characterId: string, amount: number) => {
    const healAmount = Number.isFinite(amount) ? Math.floor(amount) : 0;
    if (healAmount <= 0) return;

    const char = characters.find((c) => c.id === characterId);
    if (!char) return;

    const oldHp = char.hp;
    const newHp = oldHp + healAmount; // Can exceed maxHp

    // Check if this healing revives the character
    const wasRevived = char.isDead && newHp > 0;

    saveSnapshot();

    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== characterId) return c;

        const calculatedDamage = Math.max(0, c.maxHp - newHp);

        return {
          ...c,
          hp: newHp,
          totalDamage: calculatedDamage,
          isDead: newHp === 0,
        };
      })
    );

    logDamageEvent(char, oldHp, newHp);
    sendPlayerAction({
      actionType: 'updateHp',
      characterId,
      newHp,
    });

    if (wasRevived) {
      console.log(`${char.name} has been revived!`);
    }
  };

  // add individual party member
  const addCharacterFromPreset = (presetName?: string) => {
    const name = presetName ?? presetToAdd;
    const p = DEFAULT_PARTY.find((pp) => pp.name === name);
    if (!p) return;

    const baseX = 1,
      baseY = 1;
    const incoming: Character = {
      id: getId(),
      name: p.name,
      x: baseX,
      y: baseY,
      hp: p.hp,
      maxHp: p.hp,
      totalDamage: 0,
      initiative: 0,
      initiativeMod: p.initiativeMod ?? 0,
      isPlayer: true,
      color: p.color ?? '#3B82F6',
      ac: p.ac,
    };

    if (rollOnCreate) {
      const die = d20();
      const mod = p.initiativeMod ?? 0;
      const total = die + mod;
      const capped = capInit(total);

      incoming.initiative = capped;
      incoming.lastInitRoll = {
        die,
        mod,
        total,
        capped,
        flags: null,
      };
    }

    const { added, id } = upsertPlayerByName(incoming);
    if (initiativeMode === 'manual' && added) {
      setInitiativeOrder((prev) => [...prev, id]);
    }
  };

  const toggleStatus = (
    characterId: string,
    statusType: CharacterStatus,
    value: boolean
  ) => {
    sendPlayerAction({
      actionType: 'toggleStatus',
      characterId,
      statusType,
      value,
    });
  };

  const handleAddCondition = (characterId: string, condition: string) => {
    sendPlayerAction({
      actionType: 'addCondition',
      characterId,
      condition,
    });
  };

  const handleRemoveCondition = (characterId: string, condition: string) => {
    sendPlayerAction({
      actionType: 'removeCondition',
      characterId,
      condition,
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Characters</h3>
        <div className="inline-flex rounded-md overflow-hidden border">
          <Button
            size="sm"
            variant={charTab === 'add' ? 'default' : 'ghost'}
            className="h-7 px-3 rounded-none"
            onClick={() => setCharTab('add')}
          >
            Add
          </Button>
          <Button
            size="sm"
            variant={charTab === 'manage' ? 'default' : 'ghost'}
            className="h-7 px-3 rounded-none"
            onClick={() => setCharTab('manage')}
          >
            Manage
          </Button>
        </div>
      </div>

      {charTab === 'add' ? (
        <div className="space-y-4">
          {/* Global Roll Initiative Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="rollOnCreateGlobal"
              checked={rollOnCreate}
              onCheckedChange={(v) => setRollOnCreate(!!v)}
            />
            <label
              htmlFor="rollOnCreateGlobal"
              className="text-sm font-medium select-none"
            >
              Roll initiative on add
            </label>
          </div>

          {/* Two Equal Columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* NPCs Column */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-lg font-semibold">NPCs</h4>

              <Dialog open={showAddChar} onOpenChange={setShowAddChar}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-10 text-sm flex items-center justify-center gap-2"
                  >
                    <Ghost className="w-5 h-5" />
                    Add Monster
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add NPC</DialogTitle>
                  </DialogHeader>

                  {/* Mode toggle */}
                  <div className="mb-3 inline-flex w-fit self-start rounded-md border overflow-hidden">
                    <button
                      type="button"
                      className={`px-3 py-1 text-sm flex-none ${
                        addMode === 'single'
                          ? 'bg-black text-white'
                          : 'bg-transparent'
                      }`}
                      onClick={() => setAddMode('single')}
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 text-sm flex-none ${
                        addMode === 'bulk'
                          ? 'bg-black text-white'
                          : 'bg-transparent'
                      }`}
                      onClick={() => setAddMode('bulk')}
                    >
                      Bulk
                    </button>
                  </div>

                  {monstersLoading ? (
                    <div className="py-4 text-center text-sm text-gray-500">
                      Loading monster data...
                    </div>
                  ) : addMode === 'single' ? (
                    <SingleNpcForm
                      monsters={monsters}
                      rollOnCreate={rollOnCreate}
                    />
                  ) : (
                    <BulkNpcForm
                      monsters={monsters}
                      rollOnCreate={rollOnCreate}
                    />
                  )}
                </DialogContent>
              </Dialog>

              <AddSummonDialog rollOnCreate={rollOnCreate} />
            </div>

            {/* Player Characters Column */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-lg font-semibold">Player Characters</h4>

              {/* PC Preset Row - Fixed alignment */}
              <div className="flex gap-2 items-center">
                <Select value={presetToAdd} onValueChange={setPresetToAdd}>
                  <SelectTrigger className="h-10 flex-1">
                    <SelectValue placeholder="Choose preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_PARTY.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="h-9 text-sm px-4"
                  onClick={() => addCharacterFromPreset()}
                >
                  Add
                </Button>
              </div>

              {/* Add Party Button */}
              <Button
                variant="outline"
                className="w-full h-10 text-sm flex items-center justify-center gap-2"
                onClick={addPartyFromPresets}
              >
                <Users className="w-5 h-5" />
                Add Party ({DEFAULT_PARTY.length})
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // --- Manage tab ---
        <div className="space-y-3">
          {/* Search + filter (stacked to save width) */}
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Search by name…"
              value={charQuery}
              onChange={(e) => setCharQuery(e.target.value)}
              className="h-8 w-full"
            />
            <div className="inline-flex rounded-md overflow-hidden border self-start">
              <Button
                size="sm"
                variant={charFilter === 'all' ? 'default' : 'ghost'}
                className="h-8 px-2 rounded-none"
                onClick={() => setCharFilter('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={charFilter === 'pc' ? 'default' : 'ghost'}
                className="h-8 px-2 rounded-none"
                onClick={() => setCharFilter('pc')}
              >
                PC
              </Button>
              <Button
                size="sm"
                variant={charFilter === 'npc' ? 'default' : 'ghost'}
                className="h-8 px-2 rounded-none"
                onClick={() => setCharFilter('npc')}
              >
                NPC
              </Button>
            </div>
          </div>

          {/* List */}
          <div className="rounded border divide-y max-h-72 overflow-y-auto overflow-x-hidden">
            {filteredCharacters.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                No matches.
              </div>
            ) : (
              filteredCharacters.map((c) => {
                const isSelected = selectedCharacter === c.id;
                return (
                  <div
                    key={c.id}
                    role="button"
                    aria-selected={isSelected}
                    onClick={() => handleCharacterClick(c.id, false)}
                    className={[
                      'group px-3 py-2 grid items-center gap-2 min-w-0',
                      isSelected ? 'bg-primary/5' : '',
                    ].join(' ')}
                    style={{
                      gridTemplateColumns: '1fr auto',
                    }}
                  >
                    {/* Left column: name + controls */}
                    <div className="min-w-0 space-y-2">
                      {/* Row 1: Name + Badge + Menu */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="text-sm font-semibold truncate">
                            {c.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={c.isPlayer ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {c.isPlayer ? 'PC' : 'NPC'}
                          </Badge>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-60 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Delete ${c.name}?`)) {
                                    saveSnapshot?.();
                                    handleDeleteCharacter(c.id);
                                  }
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Row 2: HP controls + Status toggles */}
                      <div className="flex items-center justify-between gap-2">
                        {/* HP controls on the left */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveSnapshot?.();
                              applyDamage(c.id, 1);
                            }}
                            aria-label="HP -1"
                          >
                            –
                          </Button>
                          <Input
                            type="text"
                            inputMode="numeric"
                            className="h-7 w-16 text-center text-xs"
                            value={editingHp[c.id] ?? String(c.hp)}
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => {
                              e.currentTarget.select();
                              e.currentTarget.dataset.originalHp = String(c.hp);
                            }}
                            onChange={(e) => {
                              setEditingHp((prev) => ({
                                ...prev,
                                [c.id]: e.target.value,
                              }));
                            }}
                            onBlur={(e) => {
                              const newValue = parseInt(e.target.value, 10);
                              const originalHp = parseInt(
                                e.currentTarget.dataset.originalHp || '0',
                                10
                              );

                              setEditingHp((prev) => {
                                const copy = { ...prev };
                                delete copy[c.id];
                                return copy;
                              });

                              if (
                                !Number.isFinite(newValue) ||
                                newValue === originalHp
                              )
                                return;

                              if (newValue < originalHp) {
                                const damageAmount = originalHp - newValue;
                                applyDamage(c.id, damageAmount);
                              } else if (newValue > originalHp) {
                                const healingAmount = newValue - originalHp;
                                applyHealing(c.id, healingAmount);
                              }
                            }}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            / {c.maxHp}
                            {c.hp > c.maxHp && (
                              <span className="text-green-600 ml-1">
                                (+{c.hp - c.maxHp})
                              </span>
                            )}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveSnapshot?.();
                              applyHealing(c.id, 1);
                            }}
                            aria-label="HP +1"
                          >
                            +
                          </Button>
                        </div>

                        {/* Status toggles on the right */}
                        <QuickStatusToggles
                          hasAdvantage={c.hasAdvantage}
                          hasDisadvantage={c.hasDisadvantage}
                          concentrating={c.concentrating}
                          onToggleAdvantage={() => {
                            saveSnapshot?.();
                            setCharacters((prev) =>
                              prev.map((ch) =>
                                ch.id === c.id
                                  ? {
                                      ...ch,
                                      hasAdvantage: !ch.hasAdvantage,
                                      hasDisadvantage: ch.hasAdvantage
                                        ? ch.hasDisadvantage
                                        : false,
                                    }
                                  : ch
                              )
                            );
                            toggleStatus(c.id, 'advantage', !c.hasAdvantage);
                          }}
                          onToggleDisadvantage={() => {
                            saveSnapshot?.();
                            setCharacters((prev) =>
                              prev.map((ch) =>
                                ch.id === c.id
                                  ? {
                                      ...ch,
                                      hasDisadvantage: !ch.hasDisadvantage,
                                      hasAdvantage: ch.hasDisadvantage
                                        ? ch.hasAdvantage
                                        : false,
                                    }
                                  : ch
                              )
                            );
                            toggleStatus(
                              c.id,
                              'disadvantage',
                              !c.hasDisadvantage
                            );
                          }}
                          onToggleConcentration={() => {
                            saveSnapshot?.();
                            setCharacters((prev) =>
                              prev.map((ch) =>
                                ch.id === c.id
                                  ? { ...ch, concentrating: !ch.concentrating }
                                  : ch
                              )
                            );
                            toggleStatus(
                              c.id,
                              'concentration',
                              !c.concentrating
                            );
                          }}
                          size="sm"
                        />
                      </div>
                      {/* Quick Status Toggles */}
                      {/* Row 3: Conditions (only if present or selected) */}

                      {(isSelected ||
                        (c.conditions && c.conditions.length > 0)) && (
                        <div className="space-y-2">
                          {c.conditions && c.conditions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {c.conditions.map((condition) => (
                                <button
                                  key={condition}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveSnapshot?.();
                                    setCharacters((prev) =>
                                      prev.map((ch) =>
                                        ch.id === c.id
                                          ? {
                                              ...ch,
                                              conditions: (
                                                ch.conditions || []
                                              ).filter(
                                                (cond) => cond !== condition
                                              ),
                                            }
                                          : ch
                                      )
                                    );
                                    handleRemoveCondition(c.id, condition);
                                  }}
                                  className="px-2 py-0.5 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 rounded-full
      transition-colors"
                                  title="Click to remove"
                                >
                                  {condition} ✕
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {isSelected && (
                        <Select
                          value=""
                          onValueChange={(condition) => {
                            if (
                              condition &&
                              !(c.conditions || []).includes(condition)
                            ) {
                              saveSnapshot?.();
                              setCharacters((prev) =>
                                prev.map((ch) =>
                                  ch.id === c.id
                                    ? {
                                        ...ch,
                                        conditions: [
                                          ...(ch.conditions || []),
                                          condition,
                                        ],
                                      }
                                    : ch
                                )
                              );
                              handleAddCondition(c.id, condition);
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Add condition..." />
                          </SelectTrigger>
                          <SelectContent>
                            {COMMON_CONDITIONS.filter(
                              (cond) => !(c.conditions || []).includes(cond)
                            ).map((condition) => (
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
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default CharacterPanel;
