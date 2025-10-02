import  {  
  Dispatch,
  SetStateAction,
  RefObject,
} from 'react';
// import { useSearchParams } from 'next/navigation';
// import Peer, { DataConnection } from 'peerjs';

import type {
  Character,
  CustomObj,
  DistanceRule,
  Measurement,
  Terrain,
  AppSnapshot,
  RollPreset,
  DamageEvent,
  // RollScope,
} from '../types';


export interface MapContextType {
  mapScrollRef: RefObject<HTMLDivElement | null>;
  state: {    
    mapWidth: number;
    mapHeight: number;
    gridScale: number;
    distanceRule: DistanceRule;
    characters: Character[];
    terrain: Terrain[];
    isDragging: boolean;
    dragMode: 'paint' | 'erase' | null;
    lastCell: { x: number; y: number } | null;
    measurements: Measurement[];
    selectedTool: string;
    currentTurn: number;
    round: number;
    measurementStart: { x: number; y: number } | null;
    hoveredCell: { x: number; y: number } | null;
    selectedCharacter: string | null;
    charTab: 'add' | 'manage';
    charQuery: string;
    charFilter: 'all' | 'pc' | 'npc';
    // lastPaintTool: 'wall' | 'difficult' | 'door';
    showMovePreview: boolean;
    newCharName: string;
    newCharMaxHp: string;
    newCharInit: string;
    showMapSettings: boolean;
    showAddChar: boolean;
    addMode: 'single' | 'bulk';
    presetToAdd: string;
    undoStack: AppSnapshot[];
    redoStack: AppSnapshot[];
    initiativeMode: 'auto' | 'manual';
    rollPreset: RollPreset;
    editInitId: string | null;
    editInitVal: string;
    initiativeOrder: string[];
    customObjects: CustomObj[];
    newObjLabel: string;
    newObjColor: string;
    newObjIcon: string;
    showHelp: boolean;
    mode: 'select' | 'measure' | 'paint';
    filteredCharacters: Character[];
    damageLog: DamageEvent[];
  };
  actions: {    
    setMapWidth: Dispatch<SetStateAction<number>>;
    setMapHeight: Dispatch<SetStateAction<number>>;
    setGridScale: Dispatch<SetStateAction<number>>;
    setDistanceRule: Dispatch<SetStateAction<DistanceRule>>;
    setCharacters: Dispatch<SetStateAction<Character[]>>;
    setTerrain: Dispatch<SetStateAction<Terrain[]>>;
    setIsDragging: Dispatch<SetStateAction<boolean>>;
    setDragMode: Dispatch<SetStateAction<'paint' | 'erase' | null>>;
    setLastCell: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
    setMeasurements: Dispatch<SetStateAction<Measurement[]>>;
    setCurrentTurn: Dispatch<SetStateAction<number>>;    
    setSelectedTool: Dispatch<SetStateAction<string>>;
    setMeasurementStart: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
    setHoveredCell: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
    setSelectedCharacter: Dispatch<SetStateAction<string | null>>;
    setCharTab: Dispatch<SetStateAction<'add' | 'manage'>>;
    setCharQuery: Dispatch<SetStateAction<string>>;
    setCharFilter: Dispatch<SetStateAction<'all' | 'pc' | 'npc'>>;    
    setShowMovePreview: Dispatch<SetStateAction<boolean>>;
    setNewCharName: Dispatch<SetStateAction<string>>;
    setNewCharMaxHp: Dispatch<SetStateAction<string>>;
    setNewCharInit: Dispatch<SetStateAction<string>>;
    setShowMapSettings: Dispatch<SetStateAction<boolean>>;
    setShowAddChar: Dispatch<SetStateAction<boolean>>;
    setAddMode: Dispatch<SetStateAction<'single' | 'bulk'>>;
    setPresetToAdd: Dispatch<SetStateAction<string>>;    
    setInitiativeMode: Dispatch<SetStateAction<'auto' | 'manual'>>;
    setRollPreset: Dispatch<SetStateAction<RollPreset>>;    
    setEditInitId: Dispatch<SetStateAction<string | null>>;
    setEditInitVal: Dispatch<SetStateAction<string>>;
    setInitiativeOrder: Dispatch<SetStateAction<string[]>>;
    setCustomObjects: Dispatch<SetStateAction<CustomObj[]>>;
    setNewObjLabel: Dispatch<SetStateAction<string>>;
    setNewObjColor: Dispatch<SetStateAction<string>>;
    setNewObjIcon: Dispatch<SetStateAction<string>>;
    setShowHelp: Dispatch<SetStateAction<boolean>>;
    setMode: (mode: 'select' | 'measure' | 'paint') => void;
    setPaintTool: (tool: 'wall' | 'difficult' | 'door') => void;
    setDamageLog: Dispatch<SetStateAction<DamageEvent[]>>;
  };
  handlers: {
    handleNextTurn: () => void;
    undo: () => void;
    redo: () => void;
    saveSnapshot: () => void;
    takeSnapshot: () => AppSnapshot;
    restoreSnapshot: (s: AppSnapshot) => void;    
    clearMeasurements: () => void;
    handleCharacterClick: (charId: string) => void;
    handleClearNPCs: () => void;
    handleClearPCs: () => void;
    handleDeleteCharacter: (charId: string) => void;
    handleRemoteCharacterMove: (charId: string, x: number, y: number) => void;
  }
}

export type Tool = 'move' | 'measure' | 'terrain' | 'character' | 'edit';