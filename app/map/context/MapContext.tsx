import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// import { useSearchParams } from 'next/navigation';
// import { demoCharacters, demoTerrain } from '../utils/demo';
import type {
  Character,
  DistanceRule,
  Measurement,
  Terrain,
  AppSnapshot,
  InitiativeMode,
  RollPreset,
  CustomObj,
  // RollScope,
} from '../types';
import { demoCharacters, demoTerrain } from '../utils/demo';
// import { useHostPeerSession } from '../../hooks/rtc/useHostMap';
// import Peer, { DataConnection } from 'peerjs';
import { DEFAULT_PARTY } from '../utils/partyPresets';
// import { rollInitiativeOnce, capInit } from '../utils/dice';
// import { getId } from '../utils/id';
// import { BUILTIN_TERRAIN } from '../utils/terrain';

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
      setRound,
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
      setUndoStack,
      setRedoStack,
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
    },
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

export const useMapContext = () => {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used within a MapProvider');
  return ctx;
};
