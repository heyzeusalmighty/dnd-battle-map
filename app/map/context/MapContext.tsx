import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';

import type {
  Character,
  DistanceRule,
  Measurement,
  Terrain,
  AppSnapshot,
  InitiativeMode,
  RollPreset,
  CustomObj,
} from '../types';
import { demoCharacters, demoTerrain } from '../utils/demo';
import { DEFAULT_PARTY } from '../utils/partyPresets';
import { GRID_SIZE } from '../utils/constants';

import type { MapContextType } from './types';

const MapContext = createContext<MapContextType | undefined>(undefined);

interface MapProviderProps {
  children: ReactNode;
}

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

export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  const [mapWidth, setMapWidth] = useState(25);
  const [mapHeight, setMapHeight] = useState(20);
  const [gridScale, setGridScale] = useState(5);
  const [distanceRule, setDistanceRule] = useState<DistanceRule>('5e');
  const [characters, setCharacters] = useState<Character[]>(() => demoCharacters());
  const [terrain, setTerrain] = useState<Terrain[]>(() => demoTerrain());
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'paint' | 'erase' | null>(null);
  const [lastCell, setLastCell] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('select');
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
  const [charTab, setCharTab] = useState<'add' | 'manage'>('add');
  const [charQuery, setCharQuery] = useState('');
  const [charFilter, setCharFilter] = useState<'all' | 'pc' | 'npc'>('all');
  const [lastPaintTool, setLastPaintTool] = useState<'wall' | 'difficult' | 'door'>('wall');
  const [showMovePreview, setShowMovePreview] = useState(true);
  const [newCharName, setNewCharName] = useState('');
  const [newCharDmg, setNewCharDmg] = useState('');
  const [newCharInit, setNewCharInit] = useState('');
  const [showMapSettings, setShowMapSettings] = useState(false);
  const [showAddChar, setShowAddChar] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [damageDelta, setDamageDelta] = useState<Record<string, string>>({});
  const [presetToAdd, setPresetToAdd] = useState<string>(DEFAULT_PARTY[0]?.name ?? '');
  const [undoStack, setUndoStack] = useState<AppSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<AppSnapshot[]>([]);
  const [initiativeMode, setInitiativeMode] = useState<InitiativeMode>('auto');
  const [rollPreset, setRollPreset] = useState<RollPreset>({
    scope: 'all',
    useMods: true,
  });
  const [editInitId, setEditInitId] = useState<string | null>(null);
  const [editInitVal, setEditInitVal] = useState('');
  const [initiativeOrder, setInitiativeOrder] = useState<string[]>(() =>
    characters.map((c) => c.id)
  );
  const [customObjects, setCustomObjects] = useState<CustomObj[]>(INITIAL_OBJECTS);
  const [newObjLabel, setNewObjLabel] = useState('');
  const [newObjColor, setNewObjColor] = useState('#8B4513');
  const [newObjIcon, setNewObjIcon] = useState('');
  const [showHelp, setShowHelp] = useState(false);

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

  // Derive the high-level mode from your existing selectedTool
  const mode: 'select' | 'measure' | 'paint' =
    selectedTool === 'select' ? 'select' : selectedTool === 'measure' ? 'measure' : 'paint';

  const filteredCharacters = characters.filter((c) => {
    if (charFilter === 'pc' && !c.isPlayer) return false;
    if (charFilter === 'npc' && c.isPlayer) return false;
    if (charQuery.trim()) {
      const q = charQuery.trim().toLowerCase();
      if (!c.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const mapScrollRef = useRef<HTMLDivElement | null>(null);

  // UNDO/REDO stacks
  const MAX_HISTORY = 50;
  const takeSnapshot = (): AppSnapshot => ({
    characters: JSON.parse(JSON.stringify(characters)),
    terrain: JSON.parse(JSON.stringify(terrain)),
    measurements: JSON.parse(JSON.stringify(measurements)),
    mapWidth,
    mapHeight,
    gridScale,
    round,
    currentTurn,
    selectedTool: selectedTool ?? 'select',
    customObjects: JSON.parse(JSON.stringify(customObjects)),
    id: Date.now(), // simple unique ID for debugging
  });

  const saveSnapshot = () => {
    const snapShot = takeSnapshot();
    setUndoStack((prev) => {
      const next = [...prev, snapShot];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
    setRedoStack([]); // clear redo on any new action
  };

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

  const restoreSnapshot = (s: AppSnapshot) => {
    saveSnapshot();
    setCharacters(s.characters);
    setTerrain(s.terrain);
    setMapWidth(s.mapWidth);
    setMapHeight(s.mapHeight);
    setGridScale(s.gridScale);
    setCustomObjects(s.customObjects ?? []);
    setSelectedTool('select');
    setMeasurements(s.measurements);
    setRound(s.round);
    setCurrentTurn(s.currentTurn);
    setInitiativeMode('auto');
  };

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

  const clearMeasurements = () => {
    saveSnapshot();
    setMeasurements([]); // remove saved segments
    setMeasurementStart(null); // remove the orange/endpoint start cell
    setHoveredCell(null); // kill preview end cell
    // if you track any other preview state, clear it here too (e.g., setMeasurementPreview?.(null))
  };

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

  const handleDeleteCharacter = (charId: string) => {
    saveSnapshot();
    setCharacters((prev) => prev.filter((c) => c.id !== charId));
    if (selectedCharacter === charId) setSelectedCharacter(null);
    // If you later add a manual initiative order, remember to also remove the id there.
  };

  const handleRemoteCharacterMove = (charId: string, x: number, y: number) => {
    // saveSnapshot();
    console.log('handleRemoteCharacterMove', charId, x, y);
    console.log(
      'Before move:',
      characters.find((c) => c.id === charId)
    );
    setCharacters((prev) => prev.map((c) => (c.id === charId ? { ...c, x, y } : c)));
  };

  // useEffects
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

  const value = {
    state: {
      mapWidth,
      mapHeight,
      gridScale,
      distanceRule,
      characters,
      terrain,
      isDragging,
      dragMode,
      lastCell,
      measurements,
      selectedTool,
      currentTurn,
      round,
      measurementStart,
      hoveredCell,
      selectedCharacter,
      charTab,
      charQuery,
      charFilter,
      lastPaintTool,
      showMovePreview,
      newCharName,
      newCharDmg,
      newCharInit,
      showMapSettings,
      showAddChar,
      addMode,
      damageDelta,
      presetToAdd,
      undoStack,
      redoStack,
      initiativeMode,
      rollPreset,
      editInitId,
      editInitVal,
      initiativeOrder,
      customObjects,
      newObjLabel,
      newObjColor,
      newObjIcon,
      showHelp,
      mode,
      filteredCharacters,
    },
    actions: {
      setMapWidth,
      setMapHeight,
      setGridScale,
      setDistanceRule,
      setCharacters,
      setTerrain,
      setIsDragging,
      setDragMode,
      setLastCell,
      setMeasurements,
      setCurrentTurn,
      setSelectedTool,
      setMeasurementStart,
      setHoveredCell,
      setSelectedCharacter,
      setCharTab,
      setCharQuery,
      setCharFilter,
      setLastPaintTool,
      setShowMovePreview,
      setNewCharName,
      setNewCharDmg,
      setNewCharInit,
      setShowMapSettings,
      setShowAddChar,
      setAddMode,
      setDamageDelta,
      setPresetToAdd,
      setInitiativeMode,
      setRollPreset,
      setEditInitId,
      setEditInitVal,
      setInitiativeOrder,
      setCustomObjects,
      setNewObjLabel,
      setNewObjColor,
      setNewObjIcon,
      setShowHelp,
      setMode,
      setPaintTool,
    },
    handlers: {
      handleNextTurn,
      undo,
      redo,
      saveSnapshot,
      takeSnapshot,
      restoreSnapshot,
      clearMeasurements,
      handleCharacterClick,
      handleClearNPCs,
      handleClearPCs,
      handleDeleteCharacter,
      handleRemoteCharacterMove,
    },
    mapScrollRef,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

export const useMapContext = () => {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used within a MapProvider');
  return ctx;
};
