import  {  
  Dispatch,
  SetStateAction,
  RefObject,
} from 'react';
import { useSearchParams } from 'next/navigation';
import Peer, { DataConnection } from 'peerjs';

import type {
  Character,
  CustomObj,
  DistanceRule,
  Measurement,
  Terrain,
  AppSnapshot,
  RollPreset,
  RollScope,
} from '../types';
import { init } from 'next/dist/compiled/webpack/webpack';

// export interface MapContextType {
//   mapWidth: number;
//   mapHeight: number;
//   gridScale: number;
//   distanceRule: DistanceRule;
//   setMapWidth: Dispatch<SetStateAction<number>>;
//   setMapHeight: Dispatch<SetStateAction<number>>;
//   setGridScale: Dispatch<SetStateAction<number>>;
//   setDistanceRule: Dispatch<SetStateAction<DistanceRule>>;
//   mapScrollRef: RefObject<HTMLDivElement | null>;
//   searchParams: ReturnType<typeof useSearchParams>;
//   peer: Peer | null;
//   connections: DataConnection[];
//   broadcastData: (data: unknown) => void;
//   characters: Character[];
//   terrain: Terrain[];
//   setCharacters: Dispatch<SetStateAction<Character[]>>;
//   setTerrain: Dispatch<SetStateAction<Terrain[]>>;
//   difficultKeys: Set<string>;
//   isDragging: boolean;
//   dragMode: 'paint' | 'erase' | null;
//   lastCell: { x: number; y: number } | null;
//   setIsDragging: Dispatch<SetStateAction<boolean>>;
//   setDragMode: Dispatch<SetStateAction<'paint' | 'erase' | null>>;
//   setLastCell: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
//   measurements: Measurement[];
//   setMeasurements: Dispatch<SetStateAction<Measurement[]>>;
//   isTypingTarget: (t: EventTarget | null) => boolean;
//   round: number;
//   setRound: Dispatch<SetStateAction<number>>;
//   currentTurn: number;
//   setCurrentTurn: Dispatch<SetStateAction<number>>;
//   selectedTool: 'move' | 'measure' | 'terrain' | 'character' | 'edit' | null;
//   setSelectedTool: Dispatch<SetStateAction<'move' | 'measure' | 'terrain' | 'character' | 'edit' | null>>;
//   applySnapshot: (s: AppSnapshot) => void;
//   customObjects: CustomObj[];
//   setCustomObjects: Dispatch<SetStateAction<CustomObj[]>>;
//   selectedCharacter: string | null;
//   setSelectedCharacter: Dispatch<SetStateAction<string | null>>;
//   charTab: 'add' | 'manage';
//   setCharTab: Dispatch<SetStateAction<'add' | 'manage'>>;
//   charQuery: string;
//   setCharQuery: Dispatch<SetStateAction<string>>;
//   charFilter: 'all' | 'pc' | 'npc';
//   setCharFilter: Dispatch<SetStateAction<'all' | 'pc' | 'npc'>>;
//   filteredCharacters: Character[];
//   newCharName: string;
//   setNewCharName: Dispatch<SetStateAction<string>>;
//   newCharDmg: string;
//   setNewCharDmg: Dispatch<SetStateAction<string>>;
//   newCharInit: string;
//   setNewCharInit: Dispatch<SetStateAction<string>>;
//   showMapSettings: boolean;
//   setShowMapSettings: Dispatch<SetStateAction<boolean>>;
//   showAddChar: boolean;
//   setShowAddChar: Dispatch<SetStateAction<boolean>>;
//   addMode: 'single' | 'bulk';
//   setAddMode: Dispatch<SetStateAction<'single' | 'bulk'>>;
//   damageDelta: Record<string, string>;
//   setDamageDelta: Dispatch<SetStateAction<Record<string, string>>>;
//   presetToAdd: string;
//   setPresetToAdd: Dispatch<SetStateAction<string>>;
//   editInitId: string | null;
//   setEditInitId: Dispatch<SetStateAction<string | null>>;
//   editInitVal: string;
//   setEditInitVal: Dispatch<SetStateAction<string>>;
//   rollPreset: RollPreset | null;
//   setRollPreset: Dispatch<SetStateAction<RollPreset | null>>;
//   initiativeMode: 'auto' | 'manual';
//   setInitiativeMode: Dispatch<SetStateAction<'auto' | 'manual'>>;
//   addCharacterFromPreset: (presetName?: string) => void;
//   addPartyFromPresets: () => void;
//   setAndRoll: (p: RollPreset) => void;
//   rollInitiativeForScope: (scope: RollScope, opts?: { useMods?: boolean; advantage?: boolean; disadvantage?: boolean }) => void;
//   startEditInit: (c: Character) => void;
//   commitEditInit: () => void;
//   tokenClasses: (isPlayer: boolean, isSelected: boolean) => string;
//   isDifficultAt: (x: number, y: number) => boolean;
// }

export interface MapContextType {
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
    lastPaintTool: 'wall' | 'difficult' | 'door';
    showMovePreview: boolean;
    newCharName: string;
    newCharDmg: string;
    newCharInit: string;
    showMapSettings: boolean;
    showAddChar: boolean;
    addMode: 'single' | 'bulk';
    damageDelta: Record<string, string>;
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
    setRound: Dispatch<SetStateAction<number>>;
    setSelectedTool: Dispatch<SetStateAction<string>>;
    setMeasurementStart: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
    setHoveredCell: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
    setSelectedCharacter: Dispatch<SetStateAction<string | null>>;
    setCharTab: Dispatch<SetStateAction<'add' | 'manage'>>;
    setCharQuery: Dispatch<SetStateAction<string>>;
    setCharFilter: Dispatch<SetStateAction<'all' | 'pc' | 'npc'>>;
    setLastPaintTool: Dispatch<SetStateAction<'wall' | 'difficult' | 'door'>>;
    setShowMovePreview: Dispatch<SetStateAction<boolean>>;
    setNewCharName: Dispatch<SetStateAction<string>>;
    setNewCharDmg: Dispatch<SetStateAction<string>>;
    setNewCharInit: Dispatch<SetStateAction<string>>;
    setShowMapSettings: Dispatch<SetStateAction<boolean>>;
    setShowAddChar: Dispatch<SetStateAction<boolean>>;
    setAddMode: Dispatch<SetStateAction<'single' | 'bulk'>>;
    setDamageDelta: Dispatch<SetStateAction<Record<string, string>>>;
    setPresetToAdd: Dispatch<SetStateAction<string>>;
    setUndoStack: Dispatch<SetStateAction<AppSnapshot[]>>;
    setRedoStack: Dispatch<SetStateAction<AppSnapshot[]>>;
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
  };
}

export type Tool = 'move' | 'measure' | 'terrain' | 'character' | 'edit';