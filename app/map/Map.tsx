"use client";

import { useSearchParams } from "next/navigation";
import { type MouseEvent, useEffect, useRef } from "react";
import ConnectedPeersButton from "../components/ConnectedPeersButton";
import { useHostPeerSession } from "../hooks/rtc/useHostMap";
import { getFromLocalStorage, saveToLocalStorage } from "../utils/localStorage";
import CharacterPanel from "./components/CharacterPanel";
import HelpDialog from "./components/HelpDialog";
import InitiativePanel from "./components/InitiativePanel";
import MapGrid from "./components/MapGrid";

import ObjectPanel from "./components/ObjectPanel";
import SaveMapCard from "./components/SaveMapCard";
import UtilityPanel from "./components/UtilityPanel";
import { MapProvider, useMapContext } from "./context/MapContext";
import useHotkeys from "./hooks/useHotKeys";
import type { AppSnapshot, Character, Terrain } from "./types";
import { getId } from "./utils/id";
import { DEFAULT_PARTY } from "./utils/partyPresets";
import { BUILTIN_TERRAIN } from "./utils/terrain";

const MapContainer = () => {
	// Map configuration
	const { state, actions, handlers } = useMapContext();
	const {
		mapWidth,
		mapHeight,
		gridScale,
		characters,
		terrain,
		isDragging,
		dragMode,
		lastCell,
		measurements,
		selectedTool,
		currentTurn,
		round,
		selectedCharacter,
		newCharName,
		newCharDmg,
		newCharInit,
		damageDelta,
		presetToAdd,
		initiativeMode,
		customObjects,
		mode,
	} = state;

	const {
		setCharacters,
		setTerrain,
		setIsDragging,
		setDragMode,
		setLastCell,
		setCurrentTurn,
		setNewCharName,
		setNewCharDmg,
		setNewCharInit,
		setShowAddChar,
		setDamageDelta,
		setInitiativeOrder,
		setShowHelp,
		setMode,
		setPaintTool,
	} = actions;

	const {
		handleNextTurn,
		undo,
		redo,
		saveSnapshot,
		takeSnapshot,
		restoreSnapshot,
	} = handlers;

	const searchParams = useSearchParams();
	const mapName = searchParams.get("mapName") ?? "Shadow Over Orlando";
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

	// ---- undo / redo snapshot
	// snapshot helper
	function commit(mutator: () => void) {
		saveSnapshot();
		mutator();
	}

	// broadcast snapshots on every state change
	useEffect(() => {
		const snapShot = takeSnapshot();
		broadcastData({ type: "snapshot", snapShot });
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
	const getCustomObject = (typeId: string) =>
		customObjects.find((o) => o.id === typeId);

	const hasTerrainAt = (
		type: string,
		x: number,
		y: number,
		terrain: Terrain[],
	) => terrain.some((t) => t.type === type && t.x === x && t.y === y);

	// add exactly one terrain of this type at (x,y), replacing any existing terrain **of any type** at that cell
	const addTerrainAt = (type: string, x: number, y: number) => {
		setTerrain((prev) => {
			// remove any terrain occupying this cell (if you want to replace only same-type, filter by type instead)
			const withoutCell = prev.filter((t) => !(t.x === x && t.y === y));
			return [...withoutCell, { id: getId(), type, x, y }];
		});
	};

	const removeTerrainAt = (type: string, x: number, y: number) => {
		setTerrain((prev) =>
			prev.filter((t) => !(t.type === type && t.x === x && t.y === y)),
		);
	};

	// helper to detect walls (your terrain tiles use lowercase types)
	function isWallAt(x: number, y: number): boolean {
		// fast lookup map (optional but cheap)
		// if you already have a map/set elsewhere, reuse it and delete this loop.
		for (let i = 0; i < terrain.length; i++) {
			const t = terrain[i];
			if (t.x === x && t.y === y) {
				const tt = (t as Terrain).type;
				const tag = (typeof tt === "string" ? tt : String(tt)).toLowerCase();
				return tag === "wall";
				// If you track doors later:
				// return tag === "wall" || (tag === "door" && !t.open);
			}
		}
		return false;
	}

	// find the currently selected character once
	const getSelectedChar = () =>
		characters.find((c) => c.id === selectedCharacter) || null;

	// Left-down or Right-down on a cell
	const paintSnap = useRef(false);

	const handleCellMouseDown = (e: MouseEvent, x: number, y: number) => {
		if (selectedTool === "select") return;
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
		const mode: "paint" | "erase" =
			e.button === 2 ? "erase" : exists ? "erase" : "paint";

		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
		setDragMode(mode);
		setLastCell({ x, y });

		if (mode === "paint") addTerrainAt(tool, x, y);
		else removeTerrainAt(tool, x, y);
	};

	// When dragging across cells with the mouse held down
	const handleCellMouseEnter = (_e: MouseEvent, x: number, y: number) => {
		if (!isDragging || !dragMode || selectedTool === "select") return;

		if (lastCell && lastCell.x === x && lastCell.y === y) return; // skip repeats

		const tool = selectedTool;
		if (dragMode === "paint") {
			if (!hasTerrainAt(tool, x, y, terrain)) addTerrainAt(tool, x, y);
		} else {
			if (hasTerrainAt(tool, x, y, terrain)) removeTerrainAt(tool, x, y);
		}

		setLastCell({ x, y });
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
				color: p.color ?? "#3B82F6",
				ac: p.ac,
			};

			const { added, id } = upsertPlayerByName(incoming);
			if (added) newlyAddedIds.push(id);
		});

		// If you have a manual initiative list, append only truly-new entries
		if (initiativeMode === "manual" && newlyAddedIds.length) {
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
			color: p.color ?? "#3B82F6",
			ac: p.ac,
		};

		const { added, id } = upsertPlayerByName(incoming);
		if (initiativeMode === "manual" && added) {
			setInitiativeOrder((prev) => [...prev, id]);
		}
	};

	const handleAddCharacter = () => {
		// Name is the only required field
		const name = newCharName.trim();
		if (!name) return;

		// Parse numbers; default to 0 when blank or invalid
		const dmg = Number.isFinite(parseInt(newCharDmg))
			? Math.max(0, parseInt(newCharDmg))
			: 0;

		const mod = Number.isFinite(parseInt(newCharInit))
			? parseInt(newCharInit, 10)
			: 0;

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
			color: "#EF4444",
			damage: dmg,
		};

		// (Optional) // saveSnapshot(); if you wired undo/redo
		saveSnapshot();
		setCharacters((prev) => [...prev, newChar]);

		// reset the form – leave fields blank again
		setNewCharName("");
		setNewCharDmg(""); // keep input empty so placeholder shows
		setNewCharInit("");
		setShowAddChar(false);
	};

	// Remember the last paint subtool the user picked

	// add damage to existing NPC damage score
	const applyDamageDelta = (charId: string) => {
		const raw = damageDelta[charId];
		if (raw == null || raw.trim() === "") return;
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
					: c,
			),
		);
		setDamageDelta((prev) => ({ ...prev, [charId]: "" }));
	};

	const normName = (s: string) => s.trim().toLowerCase();

	/** Upsert a *player* by name; preserves id/x/y if updating.
	 *  Returns { added, id } so callers can update initiativeOrder for new entries.
	 */
	const upsertPlayerByName = (
		incoming: Character,
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
					: char,
			),
		);
	};

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
					<ObjectPanel />

					<CharacterPanel
						isWallAt={isWallAt}
						addCharacterFromPreset={addCharacterFromPreset}
						addPartyFromPresets={addPartyFromPresets}
						handleAddCharacter={handleAddCharacter}
						applyDamageDelta={applyDamageDelta}
						handleUpdateHp={handleUpdateHp}
					/>

					<UtilityPanel />
				</div>

				{/* Center - Map */}
				<MapGrid
					isWallAt={isWallAt}
					isCustomObjectType={isCustomObjectType}
					getCustomObject={getCustomObject}
					handleCellMouseDown={handleCellMouseDown}
					handleCellMouseEnter={handleCellMouseEnter}
					getSelectedChar={getSelectedChar}
					commit={commit}
					paintSnap={paintSnap}
				/>

				{/* Right Panel - Initiative */}

				<div className="w-64 flex-shrink-0 flex flex-col gap-4">
					<InitiativePanel />

					<SaveMapCard
						handleSaveMap={handleSaveMap}
						handleLoadMap={handleLoadMap}
					/>
				</div>

				{/* Help button + dialog (replaces always-on instructions) */}
				<HelpDialog />
			</main>
		</div>
	);
};

const MapWithContext = () => (
	<MapProvider>
		<MapContainer />
	</MapProvider>
);

export default MapWithContext;
