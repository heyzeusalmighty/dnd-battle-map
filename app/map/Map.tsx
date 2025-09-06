'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect, MouseEvent, useMemo } from 'react';

import { GRID_SIZE } from './utils/constants';
import { demoCharacters, demoTerrain } from './utils/demo';
import { rollInitiativeOnce, capInit } from './utils/dice';
import { getId } from './utils/id';
import { BUILTIN_TERRAIN } from './utils/terrain';
import type {
  Character,
  CustomObj,
  DistanceRule,
  Measurement,
  Terrain,
  InitiativeMode,
  RollPreset,
  RollScope,
  AppSnapshot,
} from './types';

import { useHostPeerSession } from '../hooks/rtc/useHostMap';

import { DEFAULT_PARTY } from './utils/partyPresets';

import ObjectPanel from './components/ObjectPanel';
import CharacterPanel from './components/CharacterPanel';
import UtilityPanel from './components/UtilityPanel';
import InitiativePanel from './components/InitiativePanel';
import HelpDialog from './components/HelpDialog';
import MapGrid from './components/MapGrid';
import { Button } from '../components/ui/button';

const INITIAL_OBJECTS: CustomObj[] = [
  {
    id: 'chest',
    label: 'Chest',
    icon: '📦',
    color: '#8B4513',
  },
  {
    id: 'pillar',
    label: 'Pillar',
    icon: '🏛️',
    color: '#A9A9A9',
  },
  {
    id: 'table',
    label: 'Table',
    icon: '⛩',
    color: '#654321',
  },
  {
    id: 'shelves',
    label: 'Shelves',
    icon: '🗄️',
    color: '#C19A6B',
  },
];

const Map = () => {
  // Map configuration
  const [mapWidth, setMapWidth] = useState(25);
  const [mapHeight, setMapHeight] = useState(20);
  const [gridScale, setGridScale] = useState(5);
  const [distanceRule, setDistanceRule] = useState<DistanceRule>('5e');

  const mapScrollRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const mapName = searchParams.get('mapName') ?? 'Shadow Over Orlando';

  const { peer, connection, remotePeerId, connectToPeer, sendData } = useHostPeerSession(mapName);

  // console.log(peer, connection, remotePeerId);

  function scrollCellIntoCenter(x: number, y: number, behavior: ScrollBehavior = 'smooth') {
    const el = mapScrollRef.current;
    if (!el) return;
    const cellSize = GRID_SIZE; // your existing constant
    const targetX = x * cellSize + cellSize / 2;
    const targetY = y * cellSize + cellSize / 2;

    const left = Math.max(0, targetX - el.clientWidth / 2);
    const top = Math.max(0, targetY - el.clientHeight / 2);

    el.scrollTo({ left, top, behavior });
  }

  // Game state
  const [characters, setCharacters] = useState<Character[]>(() => demoCharacters());
  const [terrain, setTerrain] = useState<Terrain[]>(() => demoTerrain());

  // O(1) lookups for terrain difficulty
  const difficultKeys = useMemo(() => {
    const s = new Set<string>();
    for (const t of terrain) {
      if (t.type === 'difficult') s.add(`${t.x},${t.y}`);
    }
    return s;
  }, [terrain]);

  // click-and-drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'paint' | 'erase' | null>(null);
  const [lastCell, setLastCell] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!isDragging) return;

    // End the drag even if the mouse is released outside the canvas
    const onUp = () => {
      setIsDragging(false);
      setDragMode(null);
      setLastCell(null);
    };

    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [isDragging, setIsDragging, setDragMode, setLastCell]);

  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  // hotkey guard
  const isTypingTarget = (t: EventTarget | null) => {
    if (!(t instanceof HTMLElement)) return false;
    const tag = t.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
  };

  const clearMeasurements = () => {
    saveSnapshot();
    setMeasurements([]); // remove saved segments
    setMeasurementStart(null); // remove the orange/endpoint start cell
    setHoveredCell(null); // kill preview end cell
    // if you track any other preview state, clear it here too (e.g., setMeasurementPreview?.(null))
  };

  // clear characters
  const pcCount = useMemo(() => characters.filter((c) => c.isPlayer).length, [characters]);
  const npcCount = characters.length - pcCount;

  function clearBy(predicate: (c: Character) => boolean, label: string) {
    const toRemove = characters.filter(predicate);
    if (toRemove.length === 0) return;

    if (!window.confirm(`Delete ${toRemove.length} ${label}?`)) return;

    const removedIds = new Set(toRemove.map((c) => c.id));
    saveSnapshot();

    // Remove characters
    setCharacters((prev) => prev.filter((c) => !removedIds.has(c.id)));

    // Fix selection if it was cleared
    setSelectedCharacter((sel) => (sel && removedIds.has(sel) ? null : sel));

    // Drop from manual order too
    setInitiativeOrder((prev) => prev.filter((id) => !removedIds.has(id)));
  }

  function handleClearNPCs() {
    clearBy((c) => !c.isPlayer, 'NPC(s)');
  }
  function handleClearPCs() {
    clearBy((c) => c.isPlayer, 'PC(s)');
  }

  // UI state
  const [selectedTool, setSelectedTool] = useState('select');
  const [currentTurn, setCurrentTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [measurementStart, setMeasurementStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

  // Derive the high-level mode from your existing selectedTool
  const mode: 'select' | 'measure' | 'paint' =
    selectedTool === 'select' ? 'select' : selectedTool === 'measure' ? 'measure' : 'paint';

  // characters split panel
  const [charTab, setCharTab] = useState<'add' | 'manage'>('add');
  const [charQuery, setCharQuery] = useState('');
  const [charFilter, setCharFilter] = useState<'all' | 'pc' | 'npc'>('all');

  const filteredCharacters = characters.filter((c) => {
    if (charFilter === 'pc' && !c.isPlayer) return false;
    if (charFilter === 'npc' && c.isPlayer) return false;
    if (charQuery.trim()) {
      const q = charQuery.trim().toLowerCase();
      if (!c.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // choose token classes based on PC/NPC and selection
  const tokenClasses = (isPlayer: boolean, isSelected: boolean) =>
    [
      'absolute z-10 flex items-center justify-center',
      isPlayer ? 'rounded-full' : 'rounded-md',

      // Base (subtle) outline via ring; no borders at all
      'ring-1 ring-black/10 dark:ring-white/20',
      'ring-offset-1 ring-offset-white dark:ring-offset-neutral-900',

      // Selection emphasis
      isSelected ? (isPlayer ? 'ring-2 ring-blue-500/70' : 'ring-2 ring-red-600/70') : '',

      // Optional: small polish
      'shadow-sm transition-all duration-150',
      // If you set fill inline via style={{ backgroundColor: c.color }},
      // you can drop bg-background. Keep it only if you rely on a CSS var:
      // "bg-background",
    ].join(' ');

  // move preview for characters
  const [showMovePreview, setShowMovePreview] = useState(true);
  const isDifficultAt = (x: number, y: number) => difficultKeys.has(`${x},${y}`);

  // function commitMove(
  //   charId: string,
  //   from: { x: number; y: number },
  //   drop: { x: number; y: number }
  // ) {
  //   const { lastFree } = clipMovementAtWalls(from, drop, isWallAt);
  //   setCharacters((prev) =>
  //     prev.map((c) => (c.id === charId ? { ...c, x: lastFree.x, y: lastFree.y } : c))
  //   );
  // }

  // Form states
  const [newCharName, setNewCharName] = useState('');
  const [newCharDmg, setNewCharDmg] = useState('');
  const [newCharInit, setNewCharInit] = useState('');
  const [showMapSettings, setShowMapSettings] = useState(false);
  const [showAddChar, setShowAddChar] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [damageDelta, setDamageDelta] = useState<Record<string, string>>({});

  const [presetToAdd, setPresetToAdd] = useState<string>(DEFAULT_PARTY[0]?.name ?? '');

  // ---- undo / redo snapshot
  // snapshot helper
  function commit(mutator: () => void) {
    saveSnapshot();
    mutator();
  }

  const [undoStack, setUndoStack] = useState<AppSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<AppSnapshot[]>([]);
  const MAX_HISTORY = 50;

  // initiative states

  const [initiativeMode, setInitiativeMode] = useState<InitiativeMode>('auto');

  const [rollPreset, setRollPreset] = useState<RollPreset>({
    scope: 'all',
    useMods: true,
  });

  // tiny helper so menu items both save preset and roll
  const setAndRoll = (p: RollPreset) => {
    setRollPreset(p);
    rollInitiativeForScope(p.scope, p);
  };

  // App.tsx (near your roll fns)
  function getInitMod(c: Character): number {
    const raw = c?.initiativeMod ?? 0;
    const n = typeof raw === 'string' ? parseInt(raw, 10) : raw;
    return Number.isFinite(n) ? (n as number) : 0;
  }

  function rollInitiativeForScope(
    scope: RollScope,
    opts?: {
      useMods?: boolean;
      advantage?: boolean;
      disadvantage?: boolean;
    }
  ) {
    if (scope === 'selected' && !selectedCharacter) return;
    const useMods = opts?.useMods ?? true;

    saveSnapshot();
    setCharacters((prev) =>
      prev.map((c) => {
        const inScope =
          scope === 'all' ||
          (scope === 'pcs' && c.isPlayer) ||
          (scope === 'npcs' && !c.isPlayer) ||
          (scope === 'selected' && c.id === selectedCharacter);

        if (!inScope) return c;

        const die = rollInitiativeOnce({
          advantage: opts?.advantage,
          disadvantage: opts?.disadvantage,
        });
        const mod = useMods ? getInitMod(c) : 0;
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
            flags: opts?.advantage ? 'adv' : opts?.disadvantage ? 'dis' : null,
          },
        };
      })
    );
    setInitiativeMode('auto');
    setCurrentTurn(0); // feel free to remove if you prefer keeping the pointer
  }

  const [editInitId, setEditInitId] = useState<string | null>(null);
  const [editInitVal, setEditInitVal] = useState('');

  function startEditInit(c: Character) {
    setEditInitId(c.id);
    setEditInitVal(String(c.initiative ?? 0));
  }

  function commitEditInit() {
    if (!editInitId) return;
    const n = capInit(parseInt(editInitVal, 10) || 0); // keep your 20-cap
    saveSnapshot();
    setCharacters((prev) =>
      prev.map((ch) =>
        ch.id === editInitId ? { ...ch, initiative: n, lastInitRoll: undefined } : ch
      )
    );
    setEditInitId(null);
  }

  // one-click initiative roller
  // function rollAllInitiative(opts?: {
  //   useMods?: boolean;
  //   advantage?: boolean;
  //   disadvantage?: boolean;
  // }) {
  //   const useMods = opts?.useMods ?? true;
  //   saveSnapshot();
  //   setCharacters((prev) =>
  //     prev.map((c) => {
  //       const base = rollInitiativeOnce({
  //         advantage: opts?.advantage,
  //         disadvantage: opts?.disadvantage,
  //       });
  //       const mod = useMods ? getInitMod(c) : 0;
  //       return { ...c, initiative: capInit(base + mod) };
  //     })
  //   );
  //   // show ordered list immediately if you’re using auto mode
  //   setInitiativeMode('auto');
  //   // (optionally) reset pointer:
  //   // setCurrentTurn(0);
  // }

  // list of character IDs in manual order
  const [initiativeOrder, setInitiativeOrder] = useState<string[]>(() =>
    characters.map((c) => c.id)
  );

  // drop removed characters from init order, append new characters at end, preserve manual reordering
  useEffect(() => {
    setInitiativeOrder((prev) => {
      const idsNow = characters.map((c) => c.id);
      const nowSet = new Set(idsNow);

      // keep existing order for ids that still exist
      const kept = prev.filter((id) => nowSet.has(id));

      // append any new ids not already in the order
      const keptSet = new Set(kept);
      const added = idsNow.filter((id) => !keptSet.has(id));

      return [...kept, ...added];
    });
  }, [characters]);

  // custom object states
  const [customObjects, setCustomObjects] = useState<CustomObj[]>(INITIAL_OBJECTS);

  const [newObjLabel, setNewObjLabel] = useState('');
  const [newObjColor, setNewObjColor] = useState('#8B4513');
  const [newObjIcon, setNewObjIcon] = useState('');

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const handleAddCustomObject = () => {
    const label = newObjLabel.trim();
    if (!label) return;
    const id = slugify(label);
    if (customObjects.some((o) => o.id === id)) return;
    setCustomObjects((prev) => [
      ...prev,
      {
        id,
        label,
        icon: newObjIcon.trim(),
        color: newObjColor,
      },
    ]);
    setSelectedTool(id);
    setNewObjLabel('');
    setNewObjIcon('');
    setNewObjColor('#8B4513');
  };

  // delete characters
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCharacter) {
        e.preventDefault();
        handleDeleteCharacter(selectedCharacter);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedCharacter]);

  // cancel measurement
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Cancel active measurement first
        if (measurementStart) {
          e.preventDefault();
          setMeasurementStart(null);
          setHoveredCell(null); // optional: hide preview instantly
          return;
        }
        // Otherwise, deselect any selected character (cancels move preview)
        if (selectedCharacter) {
          e.preventDefault();
          setSelectedCharacter(null);
          setHoveredCell(null); // optional
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [measurementStart, selectedCharacter]);

  // center on character token
  useEffect(() => {
    if (!selectedCharacter) return;
    const c = characters.find((ch) => ch.id === selectedCharacter);
    if (!c) return;

    const cellSize = GRID_SIZE;
    const el = mapScrollRef.current;
    if (!el) return;

    const cx = c.x * cellSize + cellSize / 2;
    const cy = c.y * cellSize + cellSize / 2;

    // optional: only scroll if off-screen
    const inView =
      cx >= el.scrollLeft &&
      cx <= el.scrollLeft + el.clientWidth &&
      cy >= el.scrollTop &&
      cy <= el.scrollTop + el.clientHeight;

    if (!inView) {
      el.scrollTo({
        left: Math.max(0, cx - el.clientWidth / 2),
        top: Math.max(0, cy - el.clientHeight / 2),
        behavior: 'smooth',
      });
    }
  }, [selectedCharacter]);

  // Helper functions

  const isCustomObjectType = (t: string) =>
    !BUILTIN_TERRAIN.has(t) && customObjects.some((o) => o.id === t);

  // find the object meta by id ("chest", "maomao", …)
  const getCustomObject = (typeId: string) => customObjects.find((o) => o.id === typeId);

  const hasTerrainAt = (type: string, x: number, y: number, terrain: Terrain[]) =>
    terrain.some((t) => t.type === type && t.x === x && t.y === y);

  // add exactly one terrain of this type at (x,y), replacing any existing terrain **of any type** at that cell
  const addTerrainAt = (type: string, x: number, y: number) => {
    setTerrain((prev) => {
      // remove any terrain occupying this cell (if you want to replace only same-type, filter by type instead)
      const withoutCell = prev.filter((t) => !(t.x === x && t.y === y));
      return [...withoutCell, { id: getId(), type, x, y }];
    });
  };

  const removeTerrainAt = (type: string, x: number, y: number) => {
    setTerrain((prev) => prev.filter((t) => !(t.type === type && t.x === x && t.y === y)));
  };

  // helper to detect walls (your terrain tiles use lowercase types)
  function isWallAt(x: number, y: number): boolean {
    // fast lookup map (optional but cheap)
    // if you already have a map/set elsewhere, reuse it and delete this loop.
    for (let i = 0; i < terrain.length; i++) {
      const t = terrain[i];
      if (t.x === x && t.y === y) {
        const tt = (t as Terrain).type;
        const tag = (typeof tt === 'string' ? tt : String(tt)).toLowerCase();
        return tag === 'wall';
        // If you track doors later:
        // return tag === "wall" || (tag === "door" && !t.open);
      }
    }
    return false;
  }

  const getTerrainColor = (type: string) => {
    const colors = {
      wall: '#8B7355',
      difficult: '#D2691E',
      door: '#8B4513',
      chest: '#8B4513',
      pillar: '#A9A9A9',
      table: '#654321',
      shelves: '#C19A6B',
    };
    return colors[type as keyof typeof colors] || '#666666';
  };

  // find the currently selected character once
  const getSelectedChar = () => characters.find((c) => c.id === selectedCharacter) || null;

  // help button
  const [showHelp, setShowHelp] = useState(false);

  /**
   * Chebyshev-minimal path from (x1,y1) to (x2,y2):
   * step diagonally until aligned, then straight.
   * Returns the *intermediate* squares you pass through (not including start).
   */
  // const computePathCells = (x1: number, y1: number, x2: number, y2: number) => {
  //   const cells: { x: number; y: number }[] = [];
  //   let cx = x1,
  //     cy = y1;
  //   while (cx !== x2 || cy !== y2) {
  //     if (cx < x2) cx++;
  //     else if (cx > x2) cx--;
  //     if (cy < y2) cy++;
  //     else if (cy > y2) cy--;
  //     cells.push({ x: cx, y: cy });
  //   }
  //   return cells;
  // };

  // undo/redo
  const takeSnapshot = (): AppSnapshot => ({
    characters: JSON.parse(JSON.stringify(characters)),
    terrain: JSON.parse(JSON.stringify(terrain)),
    measurements: JSON.parse(JSON.stringify(measurements)),
    mapWidth,
    mapHeight,
    gridScale,
    round,
    currentTurn,
    selectedTool,
  });

  const saveSnapshot = () => {
    console.log('snapshot', takeSnapshot());
    setUndoStack((prev) => {
      const next = [...prev, takeSnapshot()];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
    setRedoStack([]); // clear redo on any new action
  };

  // manage undo / redo snapshots
  const applySnapshot = (s: AppSnapshot) => {
    setCharacters(s.characters);
    setTerrain(s.terrain);
    setMeasurements(s.measurements);
    setMapWidth(s.mapWidth);
    setMapHeight(s.mapHeight);
    setGridScale(s.gridScale);
    setRound(s.round);
    setCurrentTurn(s.currentTurn);
    setSelectedTool(s.selectedTool);
  };

  const undo = () => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const rest = prev.slice(0, -1);
      setRedoStack((r) => [...r, takeSnapshot()]);
      applySnapshot(last);
      return rest;
    });
  };

  const redo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const rest = prev.slice(0, -1);
      setUndoStack((u) => [...u, takeSnapshot()]);
      applySnapshot(last);
      return rest;
    });
  };

  const handleCharacterClick = (charId: string) => {
    if (selectedTool !== 'select') return;

    // toggle selection; only center when selecting (not when de-selecting)
    setSelectedCharacter((prev) => {
      const next = prev === charId ? null : charId;
      if (next) {
        const c = characters.find((ch) => ch.id === next);
        if (c) scrollCellIntoCenter(c.x, c.y); // uses the helper you added
      }
      return next;
    });
  };

  // Left-down or Right-down on a cell
  const paintSnap = useRef(false);

  const handleCellMouseDown = (e: MouseEvent, x: number, y: number) => {
    if (selectedTool === 'select') return;
    e.preventDefault();
    e.stopPropagation();

    if (!paintSnap.current) {
      saveSnapshot();
      paintSnap.current = true;
    }

    const tool = selectedTool;

    // Decide mode once at drag start:
    // - Right click => erase
    // - Left click => toggle: if cell already has this tool => erase, else paint
    const exists = hasTerrainAt(tool, x, y, terrain);
    const mode: 'paint' | 'erase' = e.button === 2 ? 'erase' : exists ? 'erase' : 'paint';

    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragMode(mode);
    setLastCell({ x, y });

    if (mode === 'paint') addTerrainAt(tool, x, y);
    else removeTerrainAt(tool, x, y);
  };

  // When dragging across cells with the mouse held down
  const handleCellMouseEnter = (_e: MouseEvent, x: number, y: number) => {
    if (!isDragging || !dragMode || selectedTool === 'select') return;

    if (lastCell && lastCell.x === x && lastCell.y === y) return; // skip repeats

    const tool = selectedTool;
    if (dragMode === 'paint') {
      if (!hasTerrainAt(tool, x, y, terrain)) addTerrainAt(tool, x, y);
    } else {
      if (hasTerrainAt(tool, x, y, terrain)) removeTerrainAt(tool, x, y);
    }

    setLastCell({ x, y });
  };

  // const handleCanvasMouseUp = () => {
  //   if (!isDragging) return;
  //   setIsDragging(false);
  //   setDragMode(null);
  //   setLastCell(null);
  // };

  const handleDeleteCharacter = (charId: string) => {
    saveSnapshot();
    setCharacters((prev) => prev.filter((c) => c.id !== charId));
    if (selectedCharacter === charId) setSelectedCharacter(null);
    // If you later add a manual initiative order, remember to also remove the id there.
  };

  // handle moving initiative order
  const moveInInitiative = (charId: string, dir: 'up' | 'down') => {
    setInitiativeOrder((prev) => {
      const idx = prev.indexOf(charId);
      if (idx === -1) return prev;
      const swapWith = dir === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[swapWith]] = [copy[swapWith], copy[idx]];
      return copy;
    });
  };

  const setManualFromCurrentSort = () => {
    const sorted = [...characters].sort((a, b) => b.initiative - a.initiative);
    setInitiativeOrder(sorted.map((c) => c.id));
    setInitiativeMode('manual');
  };

  const addPartyFromPresets = () => {
    const baseX = 1;
    const baseY = 1;

    // Take one snapshot for the batch (optional but nice)
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
        initiative: p.initiative ?? 0,
        initiativeMod: p.initiativeMod ?? 0,
        isPlayer: true,
        color: p.color ?? '#3B82F6',
        ac: p.ac,
      };

      const { added, id } = upsertPlayerByName(incoming);
      if (added) newlyAddedIds.push(id);
    });

    // If you have a manual initiative list, append only truly-new entries
    if (initiativeMode === 'manual' && newlyAddedIds.length) {
      setInitiativeOrder((prev) => [...prev, ...newlyAddedIds]);
    }
  };

  // add individual party member
  const addCharacterFromPreset = (presetName?: string) => {
    const name = presetName ?? presetToAdd;
    const p = DEFAULT_PARTY.find((pp) => pp.name === name);
    if (!p) return;

    // choose a suggested slot; if upserting, existing position is preserved
    const baseX = 1,
      baseY = 1;
    const incoming: Character = {
      id: getId(),
      name: p.name,
      x: baseX,
      y: baseY,
      hp: p.hp,
      maxHp: p.hp,
      initiative: p.initiative ?? 0,
      initiativeMod: p.initiativeMod ?? 0,
      isPlayer: true,
      color: p.color ?? '#3B82F6',
      ac: p.ac,
    };

    const { added, id } = upsertPlayerByName(incoming);
    if (initiativeMode === 'manual' && added) {
      setInitiativeOrder((prev) => [...prev, id]);
    }
  };

  const handleAddCharacter = () => {
    // Name is the only required field
    const name = newCharName.trim();
    if (!name) return;

    // Parse numbers; default to 0 when blank or invalid
    const dmg = Number.isFinite(parseInt(newCharDmg)) ? Math.max(0, parseInt(newCharDmg)) : 0;

    const mod = Number.isFinite(parseInt(newCharInit)) ? parseInt(newCharInit, 10) : 0;

    // If your Character requires hp/maxHp, keep them (hidden in UI)
    const newChar: Character = {
      id: getId(),
      name,
      x: 0,
      y: 0,
      hp: 0,
      maxHp: 0,
      initiativeMod: mod,
      initiative: 0, // <-- rolled later
      isPlayer: false, // NPC
      color: '#EF4444',
      damage: dmg,
    };

    // (Optional) // saveSnapshot(); if you wired undo/redo
    saveSnapshot();
    setCharacters((prev) => [...prev, newChar]);

    // reset the form – leave fields blank again
    setNewCharName('');
    setNewCharDmg(''); // keep input empty so placeholder shows
    setNewCharInit('');
    setShowAddChar(false);
  };

  // Remember the last paint subtool the user picked
  const [lastPaintTool, setLastPaintTool] = useState<'wall' | 'difficult' | 'door'>('wall');

  // add damage to existing NPC damage score
  const applyDamageDelta = (charId: string) => {
    const raw = damageDelta[charId];
    if (raw == null || raw.trim() === '') return;
    const delta = parseInt(raw, 10);
    if (Number.isNaN(delta)) return;

    saveSnapshot();
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === charId
          ? {
              ...c,
              damage: Math.max(0, (c.damage ?? 0) + delta),
            }
          : c
      )
    );
    setDamageDelta((prev) => ({ ...prev, [charId]: '' }));
  };

  const normName = (s: string) => s.trim().toLowerCase();

  /** Upsert a *player* by name; preserves id/x/y if updating.
   *  Returns { added, id } so callers can update initiativeOrder for new entries.
   */
  const upsertPlayerByName = (incoming: Character): { added: boolean; id: string } => {
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
          if ((cur.hp ?? 0) === 0 && (incoming.hp ?? 0) > 0) next.hp = incoming.hp;
        }

        if (
          next.color === cur.color &&
          next.ac === cur.ac &&
          next.initiativeMod === cur.initiativeMod &&
          next.maxHp === cur.maxHp &&
          next.hp === cur.hp
        ) {
          return prev; // no-op
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

  const handleUpdateHp = (charId: string, newHp: number) => {
    const v = Number.isFinite(newHp) ? Math.floor(newHp) : 0;
    saveSnapshot();
    setCharacters((prev) =>
      prev.map((char) =>
        char.id === charId
          ? { ...char, hp: Math.max(0, v) } // ← no upper cap
          : char
      )
    );
  };

  // Small setters
  const setMode = (m: 'select' | 'measure' | 'paint') => {
    if (m === 'paint') setSelectedTool(lastPaintTool);
    else setSelectedTool(m);
  };

  const setPaintTool = (t: 'wall' | 'difficult' | 'door') => {
    setLastPaintTool(t);
    setSelectedTool(t);
  };

  const handleNextTurn = () => {
    const list =
      initiativeMode === 'auto'
        ? [...characters].sort((a, b) => b.initiative - a.initiative)
        : initiativeOrder
            .map((id) => characters.find((c) => c.id === id))
            .filter((c): c is Character => !!c);

    const nextTurn = (currentTurn + 1) % Math.max(1, list.length);
    setCurrentTurn(nextTurn);
    if (nextTurn === 0) setRound((prev) => prev + 1);
  };

  // hotkey enablers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const meta = e.metaKey || e.ctrlKey;

      // don't hijack typing
      if (isTypingTarget(e.target)) return;

      // ---- Undo / Redo (Meta/Ctrl) ----
      if (meta && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (meta && ((key === 'z' && e.shiftKey) || key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // ---- Turn controls (optional; remove if you don't want them) ----
      if (key === ' ' || key === 'enter') {
        // next
        e.preventDefault();
        handleNextTurn();
        return;
      }
      if (key === 'backspace' || (e.shiftKey && key === ' ')) {
        // prev
        e.preventDefault();
        setCurrentTurn((v) => Math.max(0, v - 1));
        return;
      }

      // ---- Mode switching ----
      if (key === 'v') {
        e.preventDefault();
        setMode('select');
        return;
      }
      if (key === 'm') {
        e.preventDefault();
        setMode('measure');
        return;
      }
      if (key === 'b') {
        e.preventDefault();
        setMode('paint');
        return;
      }

      // ---- Paint subtools (only when painting) ----
      if (mode === 'paint') {
        if (key === '1') {
          e.preventDefault();
          setPaintTool('wall');
          return;
        }
        if (key === '2') {
          e.preventDefault();
          setPaintTool('difficult');
          return;
        }
        if (key === '3') {
          e.preventDefault();
          setPaintTool('door');
          return;
        }
        if (key === 'h') {
          e.preventDefault();
          setShowHelp((v) => !v);
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, undo, redo, handleNextTurn, setCurrentTurn, setMode, setPaintTool]);

  const sortedCharacters =
    initiativeMode === 'auto'
      ? [...characters].sort((a, b) => b.initiative - a.initiative)
      : initiativeOrder
          .map((id) => characters.find((c) => c.id === id))
          .filter((c): c is Character => !!c);

  const currentCharacter = sortedCharacters[currentTurn];

  const handlePeerButtonClick = () => {
    sendData({ type: 'request-peers' });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="px-4 pt-3 pb-1">
        <h1 className="text-lg font-semibold">{mapName}</h1>
      </header>

      <main className="flex-1 flex gap-4 p-4">
        {/* Left Panel - Tools */}
        <Button className="absolute top-4 right-4 z-10" onClick={handlePeerButtonClick}>
          Peer Things
        </Button>
        <div className="w-64 flex-shrink-0 space-y-4">
          <ObjectPanel
            customObjects={customObjects}
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            newObjLabel={newObjLabel}
            setNewObjLabel={setNewObjLabel}
            newObjColor={newObjColor}
            setNewObjColor={setNewObjColor}
            handleAddCustomObject={handleAddCustomObject}
          />

          <CharacterPanel
            characters={characters}
            setCharacters={setCharacters}
            selectedCharacter={selectedCharacter}
            setSelectedCharacter={setSelectedCharacter}
            initiativeMode={initiativeMode}
            setInitiativeOrder={setInitiativeOrder}
            mapHeight={mapHeight}
            mapWidth={mapWidth}
            isWallAt={isWallAt}
            saveSnapshot={saveSnapshot}
            charTab={charTab}
            setCharTab={setCharTab}
            handleCharacterClick={handleCharacterClick}
            handleDeleteCharacter={handleDeleteCharacter}
            presetToAdd={presetToAdd}
            setPresetToAdd={setPresetToAdd}
            addCharacterFromPreset={addCharacterFromPreset}
            addPartyFromPresets={addPartyFromPresets}
            showAddChar={showAddChar}
            setShowAddChar={setShowAddChar}
            addMode={addMode}
            setAddMode={setAddMode}
            newCharName={newCharName}
            setNewCharName={setNewCharName}
            newCharInit={newCharInit}
            setNewCharInit={setNewCharInit}
            newCharDmg={newCharDmg}
            setNewCharDmg={setNewCharDmg}
            handleAddCharacter={handleAddCharacter}
            damageDelta={damageDelta}
            setDamageDelta={setDamageDelta}
            applyDamageDelta={applyDamageDelta}
            charQuery={charQuery}
            setCharQuery={setCharQuery}
            charFilter={charFilter}
            setCharFilter={setCharFilter}
            filteredCharacters={filteredCharacters}
            handleUpdateHp={handleUpdateHp}
          />

          <UtilityPanel
            measurements={measurements}
            clearMeasurements={clearMeasurements}
            setTerrain={setTerrain}
            npcCount={npcCount}
            pcCount={pcCount}
            handleClearNPCs={handleClearNPCs}
            handleClearPCs={handleClearPCs}
            showMovePreview={showMovePreview}
            setShowMovePreview={setShowMovePreview}
            saveSnapshot={saveSnapshot}
          />
        </div>

        {/* Center - Map */}
        <MapGrid
          gridScale={gridScale}
          distanceRule={distanceRule}
          mapWidth={mapWidth}
          mapHeight={mapHeight}
          selectedCharacter={selectedCharacter}
          characters={characters}
          terrain={terrain}
          measurements={measurements}
          mode={mode}
          measurementStart={measurementStart}
          setMode={setMode}
          undoStack={undoStack}
          redoStack={redoStack}
          undo={undo}
          redo={redo}
          selectedTool={selectedTool}
          setPaintTool={setPaintTool}
          isWallAt={isWallAt}
          isDifficultAt={isDifficultAt}
          getTerrainColor={getTerrainColor}
          isCustomObjectType={isCustomObjectType}
          getCustomObject={getCustomObject}
          tokenClasses={tokenClasses}
          handleCharacterClick={handleCharacterClick}
          handleCellMouseDown={handleCellMouseDown}
          handleCellMouseEnter={handleCellMouseEnter}
          showMovePreview={showMovePreview}
          saveSnapshot={saveSnapshot}
          showMapSettings={showMapSettings}
          setShowMapSettings={setShowMapSettings}
          mapScrollRef={mapScrollRef}
          setMapWidth={setMapWidth}
          setMapHeight={setMapHeight}
          setGridScale={setGridScale}
          setDistanceRule={setDistanceRule}
          paintSnap={paintSnap}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          setDragMode={setDragMode}
          setLastCell={setLastCell}
          hoveredCell={hoveredCell}
          setHoveredCell={setHoveredCell}
          setMeasurementStart={setMeasurementStart}
          setMeasurements={setMeasurements}
          getId={getId}
          getSelectedChar={getSelectedChar}
          commit={commit}
          setCharacters={setCharacters}
          setTerrain={setTerrain}
        />

        {/* Right Panel - Initiative */}

        <InitiativePanel
          characters={characters}
          selectedCharacter={selectedCharacter}
          sortedCharacters={sortedCharacters}
          currentTurn={currentTurn}
          setCurrentTurn={setCurrentTurn}
          initiativeMode={initiativeMode}
          setInitiativeMode={setInitiativeMode}
          moveInInitiative={moveInInitiative}
          setManualFromCurrentSort={setManualFromCurrentSort}
          round={round}
          handleNextTurn={handleNextTurn}
          rollInitiativeForScope={rollInitiativeForScope}
          rollPreset={rollPreset}
          setAndRoll={setAndRoll}
          currentCharacter={currentCharacter}
          handleCharacterClick={handleCharacterClick}
          editInitId={editInitId}
          setEditInitId={setEditInitId}
          editInitVal={editInitVal}
          setEditInitVal={setEditInitVal}
          startEditInit={startEditInit}
          commitEditInit={commitEditInit}
        />

        {/* Help button + dialog (replaces always-on instructions) */}
        <HelpDialog
          showHelp={showHelp}
          setShowHelp={setShowHelp}
          distanceRule={distanceRule}
          gridScale={gridScale}
        />
      </main>
    </div>
  );
};

export default Map;
