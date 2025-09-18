'use client';

import { useSearchParams } from 'next/navigation';
import { useRef, useEffect, MouseEvent, useMemo } from 'react';
import { GRID_SIZE } from './utils/constants';
import { rollInitiativeOnce, capInit } from './utils/dice';
import { getId } from './utils/id';
import { BUILTIN_TERRAIN } from './utils/terrain';
import type {
  Character,
  Terrain,
  RollPreset,
  RollScope,
  AppSnapshot,
  // CustomObj,
  // DistanceRule,
  // Measurement,
  // InitiativeMode,
} from './types';

import { useHostPeerSession } from '../hooks/rtc/useHostMap';

import { DEFAULT_PARTY } from './utils/partyPresets';
import { saveToLocalStorage, getFromLocalStorage } from '../utils/localStorage';

import ObjectPanel from './components/ObjectPanel';
import CharacterPanel from './components/CharacterPanel';
import UtilityPanel from './components/UtilityPanel';
import InitiativePanel from './components/InitiativePanel';
import HelpDialog from './components/HelpDialog';
import MapGrid from './components/MapGrid';
import ConnectedPeersButton from '../components/ConnectedPeersButton';
import SaveMapCard from './components/SaveMapCard';
import { MapProvider } from './context/MapContext';

import { useMapContext } from './context/MapContext';
import useHotkeys from './hooks/useHotKeys';

const Map = () => {
  // Map configuration
  const { state, actions, mapScrollRef, handlers } = useMapContext();
  const {
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
  } = state;

  const {
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
  } = actions;

  const { handleNextTurn, undo, redo, saveSnapshot, takeSnapshot } = handlers;

  const searchParams = useSearchParams();
  const mapName = searchParams.get('mapName') ?? 'Shadow Over Orlando';
  useHotkeys({
    mode,
    setMode,
    setPaintTool,
    undo,
    redo,
    handleNextTurn,
    setCurrentTurn,
    setShowHelp,
  });

  const { peer, connections, broadcastData } = useHostPeerSession(mapName);

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

  // // hotkey guard
  // const isTypingTarget = (t: EventTarget | null) => {
  //   if (!(t instanceof HTMLElement)) return false;
  //   const tag = t.tagName.toLowerCase();
  //   return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
  // };

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

  // ---- undo / redo snapshot
  // snapshot helper
  function commit(mutator: () => void) {
    saveSnapshot();
    mutator();
  }

  // initiative states

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

  // broadcast snapshots on every state change
  useEffect(() => {
    const snapShot = takeSnapshot();
    broadcastData({ type: 'snapshot', snapShot });
  }, [
    characters,
    terrain,
    measurements,
    mapWidth,
    mapHeight,
    gridScale,
    round,
    currentTurn,
    selectedTool,
    customObjects,
  ]);

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

  // find the currently selected character once
  const getSelectedChar = () => characters.find((c) => c.id === selectedCharacter) || null;

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

  const sortedCharacters =
    initiativeMode === 'auto'
      ? [...characters].sort((a, b) => b.initiative - a.initiative)
      : initiativeOrder
          .map((id) => characters.find((c) => c.id === id))
          .filter((c): c is Character => !!c);

  const currentCharacter = sortedCharacters[currentTurn];

  const handleSaveMap = () => {
    const snapShot = takeSnapshot();
    saveToLocalStorage(mapName, snapShot);
  };

  const handleLoadMap = () => {
    const loadedMap = getFromLocalStorage<AppSnapshot>(mapName);
    if (loadedMap) {
      restoreSnapshot(loadedMap);
    }
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

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="px-4 pt-3 pb-1">
        <h1 className="text-lg font-semibold">{mapName}</h1>
      </header>

      <main className="flex-1 flex gap-4 p-4">
        {/* Left Panel - Tools */}
        <ConnectedPeersButton
          connections={connections}
          sendData={broadcastData}
          peer={peer}
          mapName={mapName}
        />
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
          isCustomObjectType={isCustomObjectType}
          getCustomObject={getCustomObject}
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

        <div className="w-64 flex-shrink-0 flex flex-col gap-4">
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

          <SaveMapCard handleSaveMap={handleSaveMap} handleLoadMap={handleLoadMap} />
        </div>

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

const MapWithContext = () => (
  <MapProvider>
    <Map />
  </MapProvider>
);

export default MapWithContext;
