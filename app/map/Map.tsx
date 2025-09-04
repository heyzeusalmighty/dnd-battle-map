"use client";

import React, { useState, useRef, useEffect } from "react";

// import { Card } from "../components/
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { clamp } from "../components/ui/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

import BulkNpcForm from "../components/BulkNpcForm";
import Map_GridLines from "../components/Map_GridLines";
import Measurement_Overlay from "../components/Measurement_Overlay";
import Movement_Overlay from "../components/Movement_Overlay";
import Terrain_Layer from "../components/Terrain_Layer";
import Tokens_Layer from "../components/Tokens_Layer";

import { GRID_SIZE } from "./utils/constants";
import { demoCharacters, demoTerrain } from "./utils/demo";
import { rollInitiativeOnce, capInit, INITIATIVE_CAP } from "./utils/dice";
import {
  clipMovementAtWalls,
  measureFeet,
  traceLineCells,
} from "./utils/distance";
import { getId } from "./utils/id";
import { measureMoveCost } from "./utils/movement";
import { BUILTIN_TERRAIN, getTerrainColor } from "./utils/terrain";

import {
  takeSnapshot,
  applySnapshot,
  pushSnapshot,
  popUndo,
  popRedo,
  capHistory,
  type Snapshot,
} from "./utils/snapshots";

import type {
  Character,
  CustomObj,
  DistanceRule,
  Measurement,
  Terrain,
} from "./types";

import { DEFAULT_PARTY } from "./utils/partyPresets";

import {
  MousePointer,
  BrickWall,
  DoorOpen,
  Dice5,
  Mountain,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Shield,
  Paintbrush,
  Heart,
  Sword,
  Settings,
  Ruler,
  Expand,
  HelpCircle,
  MoreVertical,
} from "lucide-react";

const INITIAL_OBJECTS: CustomObj[] = [
  {
    id: "chest",
    label: "Chest",
    icon: "📦",
    color: "#8B4513",
  },
  {
    id: "pillar",
    label: "Pillar",
    icon: "🏛️",
    color: "#A9A9A9",
  },
  {
    id: "table",
    label: "Table",
    icon: "⛩",
    color: "#654321",
  },
  {
    id: "shelves",
    label: "Shelves",
    icon: "🗄️",
    color: "#C19A6B",
  },
];

export default function App() {
  // Map configuration
  const [mapWidth, setMapWidth] = useState(25);
  const [mapHeight, setMapHeight] = useState(20);
  const [gridScale, setGridScale] = useState(5);
  const [distanceRule, setDistanceRule] = useState<DistanceRule>("5e");

  const mapRef = useRef<HTMLDivElement>(null);
  const mapScrollRef = useRef<HTMLDivElement>(null);
  const stageW = mapWidth * GRID_SIZE;
  const stageH = mapHeight * GRID_SIZE;

  function scrollCellIntoCenter(
    x: number,
    y: number,
    behavior: ScrollBehavior = "smooth"
  ) {
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
  const [characters, setCharacters] = useState<Character[]>(() =>
    demoCharacters()
  );
  const [terrain, setTerrain] = useState<Terrain[]>(() => demoTerrain());

  // O(1) lookups for terrain difficulty
  const difficultKeys = React.useMemo(() => {
    const s = new Set<string>();
    for (const t of terrain) {
      if (t.type === "difficult") s.add(`${t.x},${t.y}`);
    }
    return s;
  }, [terrain]);

  // click-and-drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"paint" | "erase" | null>(null);
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

    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [isDragging, setIsDragging, setDragMode, setLastCell]);

  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  // hotkey guard
  const isTypingTarget = (t: EventTarget | null) => {
    if (!(t instanceof HTMLElement)) return false;
    const tag = t.tagName.toLowerCase();
    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      t.isContentEditable
    );
  };

  const clearMeasurements = () => {
    saveSnapshot();
    setMeasurements([]); // remove saved segments
    setMeasurementStart(null); // remove the orange/endpoint start cell
    setHoveredCell(null); // kill preview end cell
    // if you track any other preview state, clear it here too (e.g., setMeasurementPreview?.(null))
  };

  // clear characters
  const pcCount = React.useMemo(
    () => characters.filter((c) => c.isPlayer).length,
    [characters]
  );
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
    clearBy((c) => !c.isPlayer, "NPC(s)");
  }
  function handleClearPCs() {
    clearBy((c) => c.isPlayer, "PC(s)");
  }

  // UI state
  const [selectedTool, setSelectedTool] = useState("select");
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
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null
  );

  // Remember the last paint subtool the user picked
  const [lastPaintTool, setLastPaintTool] = useState<
    "wall" | "difficult" | "door"
  >("wall");

  // Derive the high-level mode from your existing selectedTool
  const mode: "select" | "measure" | "paint" =
    selectedTool === "select"
      ? "select"
      : selectedTool === "measure"
      ? "measure"
      : "paint";

  // Small setters
  const setMode = (m: "select" | "measure" | "paint") => {
    if (m === "paint") setSelectedTool(lastPaintTool);
    else setSelectedTool(m);
  };

  const setPaintTool = (t: "wall" | "difficult" | "door") => {
    setLastPaintTool(t);
    setSelectedTool(t);
  };

  // characters split panel
  const [charTab, setCharTab] = useState<"add" | "manage">("add");
  const [charQuery, setCharQuery] = useState("");
  const [charFilter, setCharFilter] = useState<"all" | "pc" | "npc">("all");

  const filteredCharacters = characters.filter((c) => {
    if (charFilter === "pc" && !c.isPlayer) return false;
    if (charFilter === "npc" && c.isPlayer) return false;
    if (charQuery.trim()) {
      const q = charQuery.trim().toLowerCase();
      if (!c.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // choose token classes based on PC/NPC and selection
  const tokenClasses = (isPlayer: boolean, isSelected: boolean) =>
    [
      "absolute z-10 flex items-center justify-center",
      isPlayer ? "rounded-full" : "rounded-md",

      // Base (subtle) outline via ring; no borders at all
      "ring-1 ring-black/10 dark:ring-white/20",
      "ring-offset-1 ring-offset-white dark:ring-offset-neutral-900",

      // Selection emphasis
      isSelected
        ? isPlayer
          ? "ring-2 ring-blue-500/70"
          : "ring-2 ring-red-600/70"
        : "",

      // Optional: small polish
      "shadow-sm transition-all duration-150",
      // If you set fill inline via style={{ backgroundColor: c.color }},
      // you can drop bg-background. Keep it only if you rely on a CSS var:
      // "bg-background",
    ].join(" ");

  // move preview for characters
  const [showMovePreview, setShowMovePreview] = useState(true);
  const isDifficultAt = (x: number, y: number) =>
    difficultKeys.has(`${x},${y}`);

  function commitMove(
    charId: string,
    from: { x: number; y: number },
    drop: { x: number; y: number }
  ) {
    const { lastFree } = clipMovementAtWalls(from, drop, isWallAt);
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === charId ? { ...c, x: lastFree.x, y: lastFree.y } : c
      )
    );
  }

  // Form states
  const [newCharName, setNewCharName] = useState("");
  const [newCharHp, setNewCharHp] = useState("");
  const [newCharDmg, setNewCharDmg] = useState("");
  const [newCharInit, setNewCharInit] = useState("");
  const [showMapSettings, setShowMapSettings] = useState(false);
  const [showAddChar, setShowAddChar] = useState(false);
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [damageDelta, setDamageDelta] = useState<Record<string, string>>({});

  const [presetToAdd, setPresetToAdd] = useState<string>(
    DEFAULT_PARTY[0]?.name ?? ""
  );

  // ---- undo / redo snapshot
  // snapshot helper
  function commit(mutator: () => void) {
    saveSnapshot();
    mutator();
  }

  type AppSnapshot = {
    characters: Character[];
    terrain: Terrain[];
    measurements: Measurement[];
    mapWidth: number;
    mapHeight: number;
    gridScale: number;
    round: number;
    currentTurn: number;
    selectedTool: string;
  };

  const [undoStack, setUndoStack] = useState<AppSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<AppSnapshot[]>([]);
  const MAX_HISTORY = 50;

  // initiative states
  type InitiativeMode = "auto" | "manual";
  const [initiativeMode, setInitiativeMode] = useState<InitiativeMode>("auto");

  // initiative roll menu
  type RollScope = "all" | "pcs" | "npcs" | "selected";

  type RollPreset = {
    scope: RollScope;
    useMods?: boolean;
    advantage?: boolean;
    disadvantage?: boolean;
  };

  const [rollPreset, setRollPreset] = useState<RollPreset>({
    scope: "all",
    useMods: true,
  });

  // tiny helper so menu items both save preset and roll
  const setAndRoll = (p: RollPreset) => {
    setRollPreset(p);
    rollInitiativeForScope(p.scope, p);
  };

  // App.tsx (near your roll fns)
  function getInitMod(c: any): number {
    const raw = c?.initiativeMod ?? c?.initMod ?? 0;
    const n = typeof raw === "string" ? parseInt(raw, 10) : raw;
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
    if (scope === "selected" && !selectedCharacter) return;
    const useMods = opts?.useMods ?? true;

    saveSnapshot();
    setCharacters((prev) =>
      prev.map((c) => {
        const inScope =
          scope === "all" ||
          (scope === "pcs" && c.isPlayer) ||
          (scope === "npcs" && !c.isPlayer) ||
          (scope === "selected" && c.id === selectedCharacter);

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
            flags: opts?.advantage ? "adv" : opts?.disadvantage ? "dis" : null,
          },
        };
      })
    );
    setInitiativeMode("auto");
    setCurrentTurn(0); // feel free to remove if you prefer keeping the pointer
  }

  const [editInitId, setEditInitId] = React.useState<string | null>(null);
  const [editInitVal, setEditInitVal] = React.useState("");

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
        ch.id === editInitId
          ? { ...ch, initiative: n, lastInitRoll: undefined }
          : ch
      )
    );
    setEditInitId(null);
  }

  // one-click initiative roller
  function rollAllInitiative(opts?: {
    useMods?: boolean;
    advantage?: boolean;
    disadvantage?: boolean;
  }) {
    const useMods = opts?.useMods ?? true;
    saveSnapshot();
    setCharacters((prev) =>
      prev.map((c) => {
        const base = rollInitiativeOnce({
          advantage: opts?.advantage,
          disadvantage: opts?.disadvantage,
        });
        const mod = useMods ? getInitMod(c) : 0;
        return { ...c, initiative: capInit(base + mod) };
      })
    );
    // show ordered list immediately if you’re using auto mode
    setInitiativeMode("auto");
    // (optionally) reset pointer:
    // setCurrentTurn(0);
  }
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
  const [customObjects, setCustomObjects] =
    useState<CustomObj[]>(INITIAL_OBJECTS);

  const [newObjLabel, setNewObjLabel] = useState("");
  const [newObjColor, setNewObjColor] = useState("#8B4513");
  const [newObjIcon, setNewObjIcon] = useState("");

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

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
    setNewObjLabel("");
    setNewObjIcon("");
    setNewObjColor("#8B4513");
  };

  // delete characters
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedCharacter) {
        e.preventDefault();
        handleDeleteCharacter(selectedCharacter);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedCharacter]);

  // cancel measurement
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
        behavior: "smooth",
      });
    }
  }, [selectedCharacter]);

  // Helper functions

  const isCustomObjectType = (t: string) =>
    !BUILTIN_TERRAIN.has(t) && customObjects.some((o) => o.id === t);

  // find the object meta by id ("chest", "maomao", …)
  const getCustomObject = (typeId: string) =>
    customObjects.find((o) => o.id === typeId);

  // first letter fallback (label > id)
  const getObjectLetter = (obj: CustomObj) => {
    const s = (obj.label?.trim() || obj.id).trim();
    return s ? s[0].toUpperCase() : "?";
  };

  // pick black/white text that contrasts with a hex bg color
  const textColorOn = (hex: string) => {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.replace(/(.)/g, "$1$1") : h;
    const n = parseInt(full, 16);
    const r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000" : "#fff";
  };

  const hasTerrainAt = (
    type: string,
    x: number,
    y: number,
    terrain: Terrain[]
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
      prev.filter((t) => !(t.type === type && t.x === x && t.y === y))
    );
  };

  // helper to detect walls (your terrain tiles use lowercase types)
  function isWallAt(x: number, y: number): boolean {
    // fast lookup map (optional but cheap)
    // if you already have a map/set elsewhere, reuse it and delete this loop.
    for (let i = 0; i < terrain.length; i++) {
      const t = terrain[i];
      if (t.x === x && t.y === y) {
        const tt = (t as any).type;
        const tag = (typeof tt === "string" ? tt : String(tt)).toLowerCase();
        return tag === "wall";
        // If you track doors later:
        // return tag === "wall" || (tag === "door" && !t.open);
      }
    }
    return false;
  }

  const getTerrainColor = (type: string) => {
    const colors = {
      wall: "#8B7355",
      difficult: "#D2691E",
      door: "#8B4513",
      chest: "#8B4513",
      pillar: "#A9A9A9",
      table: "#654321",
      shelves: "#C19A6B",
    };
    return colors[type as keyof typeof colors] || "#666666";
  };

  const getCustomObjectIcon = (type: string) => {
    const obj = customObjects.find((o) => o.id === type);
    return obj?.icon || "?";
  };

  // find the currently selected character once
  const getSelectedChar = () =>
    characters.find((c) => c.id === selectedCharacter) || null;

  // help button
  const [showHelp, setShowHelp] = useState(false);

  // calculating distance
  const calculateDistance = (x1: number, y1: number, x2: number, y2: number) =>
    measureFeet(x1, y1, x2, y2, distanceRule, gridScale);

  /**
   * Chebyshev-minimal path from (x1,y1) to (x2,y2):
   * step diagonally until aligned, then straight.
   * Returns the *intermediate* squares you pass through (not including start).
   */
  const computePathCells = (x1: number, y1: number, x2: number, y2: number) => {
    const cells: { x: number; y: number }[] = [];
    let cx = x1,
      cy = y1;
    while (cx !== x2 || cy !== y2) {
      if (cx < x2) cx++;
      else if (cx > x2) cx--;
      if (cy < y2) cy++;
      else if (cy > y2) cy--;
      cells.push({ x: cx, y: cy });
    }
    return cells;
  };

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
    setUndoStack((prev) => {
      const next = [...prev, takeSnapshot()];
      return next.length > MAX_HISTORY
        ? next.slice(next.length - MAX_HISTORY)
        : next;
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

  // Event handlers
  const handleCellClick = (x: number, y: number) => {
    if (selectedTool === "measure") {
      if (!measurementStart) {
        setMeasurementStart({ x, y });
      } else {
        const distance = calculateDistance(
          measurementStart.x,
          measurementStart.y,
          x,
          y
        );
        const newMeasurement: Measurement = {
          id: getId(),
          startX: measurementStart.x,
          startY: measurementStart.y,
          endX: x,
          endY: y,
          distance,
        };
        saveSnapshot();
        setMeasurements((prev) => [...prev, newMeasurement]);
        setMeasurementStart(null);
      }
      return;
    }

    if (selectedTool === "select") {
      if (selectedCharacter) {
        const sel = getSelectedChar(); // or however you fetch it
        if (!sel) return;

        // no-op: same cell → skip snapshot & state write
        if (sel.x === x && sel.y === y) return;

        commit(() => {
          setCharacters((prev) =>
            prev.map((c) => (c.id === selectedCharacter ? { ...c, x, y } : c))
          );
        });
      }
      return;
    }
  };

  const handleCharacterClick = (charId: string) => {
    if (selectedTool !== "select") return;

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

  const handleTerrainRightClick = (e: React.MouseEvent, terrainId: string) => {
    e.preventDefault();
    if (selectedTool === "select") {
      saveSnapshot();
      setTerrain((prev) => prev.filter((t) => t.id !== terrainId));
    }
  };

  // Left-down or Right-down on a cell
  const paintSnap = React.useRef(false);

  const handleCellMouseDown = (e: React.MouseEvent, x: number, y: number) => {
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
  const handleCellMouseEnter = (_e: React.MouseEvent, x: number, y: number) => {
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

  const handleCanvasMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragMode(null);
    setLastCell(null);
  };

  const handleDeleteCharacter = (charId: string) => {
    saveSnapshot();
    setCharacters((prev) => prev.filter((c) => c.id !== charId));
    if (selectedCharacter === charId) setSelectedCharacter(null);
    // If you later add a manual initiative order, remember to also remove the id there.
  };

  // handle moving initiative order
  const moveInInitiative = (charId: string, dir: "up" | "down") => {
    setInitiativeOrder((prev) => {
      const idx = prev.indexOf(charId);
      if (idx === -1) return prev;
      const swapWith = dir === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[swapWith]] = [copy[swapWith], copy[idx]];
      return copy;
    });
  };

  const setManualFromCurrentSort = () => {
    const sorted = [...characters].sort((a, b) => b.initiative - a.initiative);
    setInitiativeOrder(sorted.map((c) => c.id));
    setInitiativeMode("manual");
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
        ac: (p as any).ac,
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
      ac: (p as any).ac,
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
    const init = Number.isFinite(parseInt(newCharInit))
      ? parseInt(newCharInit)
      : 0;
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
          : c
      )
    );
    setDamageDelta((prev) => ({ ...prev, [charId]: "" }));
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
          ac: (incoming as any).ac ?? (cur as any).ac,
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
          (next as any).ac === (cur as any).ac &&
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

  const handleUpdateDamage = (charId: string, newDmg: number) => {
    saveSnapshot();
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === charId ? { ...c, damage: Math.max(0, newDmg) } : c
      )
    );
  };

  const handleUpdateInitiative = (charId: string, newInit: number) => {
    saveSnapshot();
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === charId
          ? {
              ...c,
              initiative: Math.max(0, capInit(isNaN(newInit) ? 0 : newInit)),
            }
          : c
      )
    );
  };

  const handleNextTurn = () => {
    const list =
      initiativeMode === "auto"
        ? [...characters].sort((a, b) => b.initiative - a.initiative)
        : initiativeOrder
            .map((id) => characters.find((c) => c.id === id))
            .filter((c): c is Character => !!c);

    const nextTurn = (currentTurn + 1) % Math.max(1, list.length);
    setCurrentTurn(nextTurn);
    if (nextTurn === 0) setRound((prev) => prev + 1);
  };

  // hotkey enablers
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const meta = e.metaKey || e.ctrlKey;

      // don't hijack typing
      if (isTypingTarget(e.target)) return;

      // ---- Undo / Redo (Meta/Ctrl) ----
      if (meta && key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (meta && ((key === "z" && e.shiftKey) || key === "y")) {
        e.preventDefault();
        redo();
        return;
      }

      // ---- Turn controls (optional; remove if you don't want them) ----
      if (key === " " || key === "enter") {
        // next
        e.preventDefault();
        handleNextTurn();
        return;
      }
      if (key === "backspace" || (e.shiftKey && key === " ")) {
        // prev
        e.preventDefault();
        setCurrentTurn((v) => Math.max(0, v - 1));
        return;
      }

      // ---- Mode switching ----
      if (key === "v") {
        e.preventDefault();
        setMode("select");
        return;
      }
      if (key === "m") {
        e.preventDefault();
        setMode("measure");
        return;
      }
      if (key === "b") {
        e.preventDefault();
        setMode("paint");
        return;
      }

      // ---- Paint subtools (only when painting) ----
      if (mode === "paint") {
        if (key === "1") {
          e.preventDefault();
          setPaintTool("wall");
          return;
        }
        if (key === "2") {
          e.preventDefault();
          setPaintTool("difficult");
          return;
        }
        if (key === "3") {
          e.preventDefault();
          setPaintTool("door");
          return;
        }
        if (key === "h") {
          e.preventDefault();
          setShowHelp((v) => !v);
          return;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, undo, redo, handleNextTurn, setCurrentTurn, setMode, setPaintTool]);

  const sortedCharacters =
    initiativeMode === "auto"
      ? [...characters].sort((a, b) => b.initiative - a.initiative)
      : initiativeOrder
          .map((id) => characters.find((c) => c.id === id))
          .filter((c): c is Character => !!c);

  const currentCharacter = sortedCharacters[currentTurn];

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="px-4 pt-3 pb-1">
        <h1 className="text-lg font-semibold">
          Shadow Over Orlovia (Stain ya pants)
        </h1>
      </header>

      <main className="flex-1 flex gap-4 p-4">
        {/* Left Panel - Tools */}
        <div className="w-64 flex-shrink-0 space-y-4">
          <Card className="p-4">
            <h3 className="text-base font-semibold mb-3">Objects</h3>

            {/* Built-ins */}
            <div className="mb-3">
              <div className="text-xs text-muted-foreground mb-1">
                Built-ins
              </div>
              <div className="flex flex-wrap gap-2">
                {customObjects
                  .filter((o) => !!o.icon)
                  .map((o) => (
                    <Button
                      key={o.id}
                      size="sm"
                      variant={selectedTool === o.id ? "default" : "outline"}
                      className="h-8 px-2"
                      onClick={() => setSelectedTool(o.id)}
                      title={o.label}
                    >
                      <span className="mr-1">{o.icon}</span>
                      {o.label}
                    </Button>
                  ))}
              </div>
            </div>

            {/* My objects (user-added) */}
            {customObjects.some((o) => !o.icon) && (
              <div className="mb-3">
                <div className="text-xs text-muted-foreground mb-1">
                  My objects
                </div>
                <div className="flex flex-wrap gap-2">
                  {customObjects
                    .filter((o) => !o.icon)
                    .map((o) => (
                      <Button
                        key={o.id}
                        size="sm"
                        variant={selectedTool === o.id ? "default" : "outline"}
                        className="h-8 px-2"
                        onClick={() => setSelectedTool(o.id)}
                        title={o.label}
                      >
                        <span
                          className="inline-block w-3 h-3 rounded-sm mr-2"
                          style={{ background: o.color }}
                        />
                        {o.label}
                      </Button>
                    ))}
                </div>
              </div>
            )}

            <div className="border-t pt-3">
              <div className="text-xs text-muted-foreground mb-1">
                New object
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  placeholder="Label (e.g., Crate)"
                  value={newObjLabel}
                  onChange={(e) => setNewObjLabel(e.target.value)}
                />
                <div className="relative">
                  {/* The visible swatch */}
                  <div
                    className="h-9 w-12 rounded-md border shadow-inner"
                    style={{ backgroundColor: newObjColor }}
                    aria-label="Pick color"
                  />

                  {/* Invisible native color input stretched over the swatch */}
                  <input
                    type="color"
                    value={newObjColor}
                    onChange={(e) => setNewObjColor(e.target.value)}
                    className="absolute inset-0 h-9 w-12 opacity-0 cursor-pointer"
                    title="Color"
                  />
                </div>
              </div>
              <Button onClick={handleAddCustomObject} className="mt-2 w-full">
                Add Object
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Characters</h3>
              <div className="inline-flex rounded-md overflow-hidden border">
                <Button
                  size="sm"
                  variant={charTab === "add" ? "default" : "ghost"}
                  className="h-7 px-3 rounded-none"
                  onClick={() => setCharTab("add")}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant={charTab === "manage" ? "default" : "ghost"}
                  className="h-7 px-3 rounded-none"
                  onClick={() => setCharTab("manage")}
                >
                  Manage
                </Button>
              </div>
            </div>

            {charTab === "add" ? (
              // --- Add tab (your existing controls) ---
              <div className="space-y-3">
                {/* Preset + Add */}
                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                  <div>
                    <div className="text-sm mb-1">Add:</div>
                    <Select value={presetToAdd} onValueChange={setPresetToAdd}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Choose a preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_PARTY.map((p) => (
                          <SelectItem key={p.name} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="h-8"
                    onClick={() => addCharacterFromPreset()}
                  >
                    Add
                  </Button>
                </div>

                {/* Add whole party */}
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={addPartyFromPresets}
                >
                  Add Party ({DEFAULT_PARTY.length} presets)
                </Button>

                {/* Open Custom NPC dialog */}
                <Dialog open={showAddChar} onOpenChange={setShowAddChar}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      Add Custom NPC
                    </Button>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom NPC</DialogTitle>
                    </DialogHeader>

                    {/* Mode toggle */}
                    <div className="mb-3 inline-flex w-fit self-start rounded-md border overflow-hidden">
                      <button
                        className={`px-3 py-1 text-sm flex-none ${
                          addMode === "single"
                            ? "bg-black text-white"
                            : "bg-transparent"
                        }`}
                        onClick={() => setAddMode("single")}
                      >
                        Single
                      </button>
                      <button
                        className={`px-3 py-1 text-sm flex-none ${
                          addMode === "bulk"
                            ? "bg-black text-white"
                            : "bg-transparent"
                        }`}
                        onClick={() => setAddMode("bulk")}
                      >
                        Bulk
                      </button>
                    </div>

                    {addMode === "single" ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">Name</label>
                          <Input
                            value={newCharName}
                            onChange={(e) => setNewCharName(e.target.value)}
                            placeholder="e.g., Zombie"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium">
                              Initiative mod
                            </label>
                            <Input
                              value={newCharInit}
                              onChange={(e) => setNewCharInit(e.target.value)}
                              placeholder="e.g., 2"
                              inputMode="numeric"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              Starting damage (optional)
                            </label>
                            <Input
                              value={newCharDmg}
                              onChange={(e) => setNewCharDmg(e.target.value)}
                              placeholder="e.g., 0"
                              inputMode="numeric"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowAddChar(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              // you already have this function:
                              // builds { id, name, x:0, y:0, hp:0, maxHp:0, initiativeMod, initiative:0, isPlayer:false, color:"#EF4444", damage }
                              handleAddCharacter();
                              setShowAddChar(false);
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <BulkNpcForm
                        characters={characters}
                        setCharacters={setCharacters}
                        mapWidth={mapWidth}
                        mapHeight={mapHeight}
                        isWallAt={isWallAt}
                        initiativeMode={initiativeMode}
                        setInitiativeOrder={setInitiativeOrder}
                        setSelectedCharacter={setSelectedCharacter}
                        saveSnapshot={saveSnapshot}
                      />
                    )}
                  </DialogContent>
                </Dialog>
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
                      variant={charFilter === "all" ? "default" : "ghost"}
                      className="h-8 px-2 rounded-none"
                      onClick={() => setCharFilter("all")}
                    >
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant={charFilter === "pc" ? "default" : "ghost"}
                      className="h-8 px-2 rounded-none"
                      onClick={() => setCharFilter("pc")}
                    >
                      PC
                    </Button>
                    <Button
                      size="sm"
                      variant={charFilter === "npc" ? "default" : "ghost"}
                      className="h-8 px-2 rounded-none"
                      onClick={() => setCharFilter("npc")}
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
                          onClick={() => handleCharacterClick(c.id)} // row = select
                          className={[
                            "group px-3 py-2 grid items-center gap-2 min-w-0",
                            isSelected ? "bg-primary/5" : "",
                          ].join(" ")}
                          style={{
                            gridTemplateColumns: "1fr auto",
                          }} // name/controls | menu
                        >
                          {/* left column */}
                          <div className="min-w-0">
                            {/* header: full name (wrap) + pills underneath */}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold leading-tight break-words whitespace-normal">
                                {c.name}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
                                {/* tiny color dot to tie to token */}
                                <span
                                  className="inline-block w-2 h-2 rounded-full mr-1"
                                  style={{
                                    backgroundColor: c.color,
                                  }}
                                  aria-hidden
                                />
                                <Badge
                                  variant={c.isPlayer ? "default" : "secondary"}
                                >
                                  {c.isPlayer ? "PC" : "NPC"}
                                </Badge>

                                {c.isPlayer ? (
                                  <Badge variant="outline">
                                    HP {c.hp}/{c.maxHp}
                                    {c.hp > c.maxHp && (
                                      <span className="text-green-600">
                                        {" "}
                                        (+{c.hp - c.maxHp})
                                      </span>
                                    )}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">
                                    DMG {c.damage ?? 0}
                                  </Badge>
                                )}

                                {/* optional disambiguator for names ending in a number, e.g., "Zombie 3" */}
                                {/\s(\d+)$/.test(c.name) && (
                                  <Badge variant="secondary">
                                    #{c.name.match(/\s(\d+)$/)![1]}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* line 2: inline editor (hidden until hover or selected) */}
                            <div
                              className={`mt-1 ${
                                isSelected ? "flex" : "hidden group-hover:flex"
                              } items-center gap-1`}
                            >
                              {c.isPlayer ? (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveSnapshot?.();
                                      handleUpdateHp(
                                        c.id,
                                        Math.max(0, c.hp - 1)
                                      );
                                    }}
                                    aria-label="HP -1"
                                  >
                                    –
                                  </Button>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    className="h-7 w-16 text-center text-xs"
                                    value={String(c.hp)}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      handleUpdateHp(
                                        c.id,
                                        parseInt(e.target.value, 10) || 0
                                      )
                                    }
                                    onFocus={(e) => e.currentTarget.select()}
                                  />
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    / {c.maxHp}
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveSnapshot?.();
                                      handleUpdateHp(
                                        c.id,
                                        Math.min(c.maxHp, c.hp + 1)
                                      );
                                    }}
                                    aria-label="HP +1"
                                  >
                                    +
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    Δ
                                  </span>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="-?[0-9]*"
                                    placeholder="+/-"
                                    className="h-7 w-16 text-center text-xs"
                                    value={damageDelta[c.id] ?? ""}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      setDamageDelta((prev) => ({
                                        ...prev,
                                        [c.id]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.stopPropagation();
                                        saveSnapshot?.();
                                        applyDamageDelta(c.id);
                                      }
                                    }}
                                    onBlur={() => {
                                      saveSnapshot?.();
                                      applyDamageDelta(c.id);
                                    }}
                                    title="Enter a delta (e.g. -3, +5)"
                                  />
                                </>
                              )}
                            </div>
                          </div>

                          {/* right column: more menu (delete only) */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 opacity-60 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                                aria-label="More actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
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
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h4 className="mb-2">Utilities</h4>
            <div className="space-y-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  saveSnapshot();
                  setTerrain([]);
                }}
                className="w-full"
              >
                Clear Terrain
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={clearMeasurements}
                className="w-full"
              >
                Clear Measurements ({measurements.length})
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleClearNPCs}
              >
                Clear NPCs {npcCount > 0 ? `(${npcCount})` : ""}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleClearPCs}
              >
                Clear PCs {pcCount > 0 ? `(${pcCount})` : ""}
              </Button>

              <Button
                size="sm"
                variant={showMovePreview ? "default" : "outline"}
                onClick={() => setShowMovePreview((v) => !v)}
                className="w-full"
              >
                {showMovePreview
                  ? "Movement Preview: On"
                  : "Movement Preview: Off"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Center - Map */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <Card className="p-4 w-full h-full">
            <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Grid: {gridScale} ft/square | Size: {mapWidth}×{mapHeight}
              </span>
              {selectedCharacter && (
                <Badge variant="outline">
                  {characters.find((c) => c.id === selectedCharacter)?.name}{" "}
                  selected - click to move
                </Badge>
              )}
              {measurementStart && (
                <Badge variant="outline">
                  Click another cell to measure distance
                </Badge>
              )}
            </div>

            {/* Top toolbar */}
            <div className="mb-3 flex flex-col gap-2">
              {/* Row 1: modes on the left, Undo/Redo/Settings on the right */}
              <div className="flex items-center justify-between gap-2">
                {/* Modes */}
                <div className="inline-flex rounded-md overflow-hidden border">
                  <Button
                    size="sm"
                    variant={mode === "select" ? "default" : "ghost"}
                    className="h-8 px-3 rounded-none"
                    onClick={() => setMode("select")}
                    title="Select (V)"
                  >
                    <MousePointer className="w-4 h-4 mr-1" />
                    Select
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === "measure" ? "default" : "ghost"}
                    className="h-8 px-3 rounded-none"
                    onClick={() => setMode("measure")}
                    title="Measure (M)"
                  >
                    <Ruler className="w-4 h-4 mr-1" />
                    Measure
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === "paint" ? "default" : "ghost"}
                    className="h-8 px-3 rounded-none"
                    onClick={() => setMode("paint")}
                    title="Paint terrain (B)"
                  >
                    <Paintbrush className="w-4 h-4 mr-1" />
                    Paint
                  </Button>
                </div>

                {/* Undo / Redo / Settings */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={undo}
                    disabled={!undoStack.length}
                    title="Undo (⌘/Ctrl+Z)"
                  >
                    Undo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={redo}
                    disabled={!redoStack.length}
                    title="Redo (⇧+⌘/Ctrl+Z)"
                  >
                    Redo
                  </Button>

                  {/* Map Settings dialog (moved from Actions card) */}
                  <Dialog
                    open={showMapSettings}
                    onOpenChange={setShowMapSettings}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8">
                        <Settings className="w-4 h-4 mr-2" />
                        Map Settings
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Map Configuration</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-sm">Width</label>
                            <Input
                              type="number"
                              value={mapWidth}
                              onChange={(e) =>
                                setMapWidth(
                                  Math.max(
                                    10,
                                    Math.min(50, parseInt(e.target.value) || 25)
                                  )
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-sm">Height</label>
                            <Input
                              type="number"
                              value={mapHeight}
                              onChange={(e) =>
                                setMapHeight(
                                  Math.max(
                                    10,
                                    Math.min(50, parseInt(e.target.value) || 20)
                                  )
                                )
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm">Grid Scale</label>
                          <Select
                            value={String(gridScale)}
                            onValueChange={(v) => {
                              const next = parseInt(v, 10);
                              if (!Number.isFinite(next) || next === gridScale)
                                return;
                              saveSnapshot();
                              setGridScale(next);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={`${gridScale} feet per square`}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">
                                5 feet (Standard D&D)
                              </SelectItem>
                              <SelectItem value="10">10 feet</SelectItem>
                              <SelectItem value="1">1 foot</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <label className="text-sm">Diagonal Calculation</label>
                        <Select
                          value={distanceRule}
                          onValueChange={(v) => {
                            if (v === distanceRule) return;
                            saveSnapshot();
                            setDistanceRule(v as DistanceRule);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={distanceRule} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5e">
                              5e (each square = 5 ft)
                            </SelectItem>
                            <SelectItem value="5105">
                              5-10-5 (every 2nd diagonal 10 ft)
                            </SelectItem>
                            <SelectItem value="euclidean">
                              Euclidean (true distance)
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Button onClick={() => setShowMapSettings(false)}>
                          Done
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Row 2: appears only in Paint mode */}
              {mode === "paint" && (
                <div className="w-fit">
                  {" "}
                  {/* <- new: shrink-wrap the row */}
                  <div className="inline-flex rounded-md overflow-hidden border">
                    <Button
                      size="sm"
                      variant={selectedTool === "wall" ? "default" : "ghost"}
                      className="h-8 px-3 rounded-none flex-none" // <- flex-none
                      onClick={() => setPaintTool("wall")}
                      title="Wall (1)"
                    >
                      <BrickWall className="w-4 h-4 mr-1" />
                      Wall
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        selectedTool === "difficult" ? "default" : "ghost"
                      }
                      className="h-8 px-3 rounded-none flex-none"
                      onClick={() => setPaintTool("difficult")}
                      title="Difficult (2)"
                    >
                      <Mountain className="w-4 h-4 mr-1" />
                      Difficult
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedTool === "door" ? "default" : "ghost"}
                      className="h-8 px-3 rounded-none flex-none"
                      onClick={() => setPaintTool("door")}
                      title="Door (3)"
                    >
                      <DoorOpen className="w-4 h-4 mr-1" />
                      Door
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Map viewport (gets the scrollbars) */}
            <div
              ref={mapScrollRef}
              className="relative overflow-auto rounded border-2 border-border select-none"
              style={{
                width: "100%",
                maxWidth: "100%",
                maxHeight: "calc(100vh - 180px)",
              }}
              onContextMenu={(e) => {
                // block the browser/Figma right-click menu anywhere on the map
                e.preventDefault(); // don't stopPropagation (lets per-cell handlers run first)
              }}
              onMouseUp={() => {
                // end a paint/erase drag
                paintSnap.current = false;
                if (isDragging) {
                  setIsDragging(false);
                  setDragMode(null);
                  setLastCell(null);
                }
              }}
              onMouseLeave={() => {
                setHoveredCell(null);
                // if we left while dragging, also end the gesture cleanly
                if (isDragging) {
                  paintSnap.current = false;
                  setIsDragging(false);
                  setDragMode(null);
                  setLastCell(null);
                }
              }}
            >
              {/* Stage: sized exactly to the grid in pixels.
      Everything that positions absolutely should be inside this. */}
              <div
                className="relative"
                style={{ width: stageW, height: stageH }}
              >
                <Map_GridLines
                  width={mapWidth}
                  height={mapHeight}
                  size={GRID_SIZE}
                />
                <Measurement_Overlay
                  measurements={measurements}
                  gridSize={GRID_SIZE}
                  width={mapWidth}
                  height={mapHeight}
                />
                {/* Measurement Preview (overlay SVG above gridlines) */}
                {selectedTool === "measure" &&
                  measurementStart &&
                  hoveredCell && (
                    <svg
                      width={mapWidth * GRID_SIZE}
                      height={mapHeight * GRID_SIZE}
                      className="absolute inset-0 pointer-events-none"
                    >
                      <g opacity={0.7}>
                        <line
                          x1={measurementStart.x * GRID_SIZE + GRID_SIZE / 2}
                          y1={measurementStart.y * GRID_SIZE + GRID_SIZE / 2}
                          x2={hoveredCell.x * GRID_SIZE + GRID_SIZE / 2}
                          y2={hoveredCell.y * GRID_SIZE + GRID_SIZE / 2}
                          stroke="#FF6B35"
                          strokeWidth={2}
                          strokeDasharray="3,3"
                        />
                        <text
                          x={
                            ((measurementStart.x + hoveredCell.x) * GRID_SIZE) /
                              2 +
                            GRID_SIZE / 2
                          }
                          y={
                            ((measurementStart.y + hoveredCell.y) * GRID_SIZE) /
                              2 +
                            GRID_SIZE / 2
                          }
                          fill="#FF6B35"
                          fontSize="12"
                          textAnchor="middle"
                        >
                          {calculateDistance(
                            measurementStart.x,
                            measurementStart.y,
                            hoveredCell.x,
                            hoveredCell.y
                          )}
                          ft
                        </text>
                      </g>
                    </svg>
                  )}

                {/* Movement preview (overlay SVG above gridlines) */}
                {showMovePreview &&
                  selectedTool === "select" &&
                  selectedCharacter &&
                  hoveredCell &&
                  !measurementStart &&
                  (() => {
                    const sel = getSelectedChar();
                    if (!sel) return null;
                    return (
                      <Movement_Overlay
                        start={{ x: sel.x, y: sel.y }}
                        end={hoveredCell}
                        cellPx={GRID_SIZE}
                        rule={distanceRule}
                        gridScale={gridScale}
                        isDifficultAt={isDifficultAt}
                        isWallAt={isWallAt}
                      />
                    );
                  })()}

                {/* Clickable Cells (with paint/erase + drag) */}
                {Array.from({ length: mapHeight }).map((_, y) =>
                  Array.from({ length: mapWidth }).map((_, x) => (
                    <div
                      key={`${x}-${y}`}
                      className={`absolute cursor-pointer hover:bg-accent/30 ${
                        measurementStart?.x === x && measurementStart?.y === y
                          ? "bg-orange-200"
                          : ""
                      }`}
                      style={{
                        left: x * GRID_SIZE,
                        top: y * GRID_SIZE,
                        width: GRID_SIZE,
                        height: GRID_SIZE,
                      }}
                      // Only let onClick handle MEASURE and SELECT moves.
                      // Terrain tools are handled by mouse down/drag (below).
                      onClick={() => {
                        if (
                          selectedTool === "measure" ||
                          selectedTool === "select"
                        ) {
                          handleCellClick(x, y);
                        }
                      }}
                      // Start paint/erase (left = toggle paint/erase, right = erase)
                      onMouseDown={(e) => handleCellMouseDown(e, x, y)}
                      // Continue paint/erase while dragging over cells
                      onMouseEnter={(e) => {
                        setHoveredCell({ x, y });
                        handleCellMouseEnter(e, x, y);
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      // Support single right-click erase without dragging
                      onContextMenu={(e) => {
                        e.preventDefault(); // no browser/Figma menu
                        if (!isDragging && selectedTool !== "select") {
                          handleCellMouseDown(
                            Object.assign(e, { button: 2 }),
                            x,
                            y
                          );
                        }
                      }}
                    />
                  ))
                )}

                {/* Terrain */}
                <Terrain_Layer
                  tiles={terrain}
                  cellPx={GRID_SIZE}
                  isCustomObjectType={isCustomObjectType}
                  getCustomObject={getCustomObject}
                  getTerrainColor={getTerrainColor}
                  textColorOn={textColorOn}
                  getObjectLetter={getObjectLetter}
                  canInteract={selectedTool === "select" && !selectedCharacter}
                  onTerrainRightClick={handleTerrainRightClick}
                />
                {/* Characters */}
                <Tokens_Layer
                  characters={characters}
                  cellPx={GRID_SIZE}
                  tokenClasses={tokenClasses}
                  selectedCharacterId={selectedCharacter}
                  onCharacterClick={handleCharacterClick}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Panel - Initiative */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-4">
          <Card className="p-0 flex flex-col overflow-hidden">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 px-4 py-3 border-b bg-background">
              {/* Row 1: title + round/order on left, turn controls on right */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold">Initiative</h3>
                  <div className="text-sm text-muted-foreground">
                    Round {round}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Order:{" "}
                    {initiativeMode === "auto" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={setManualFromCurrentSort}
                        className="px-1 h-5 text-xs"
                      >
                        Auto
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setInitiativeMode("auto")}
                        className="px-1 h-5 text-xs"
                      >
                        Manual
                      </Button>
                    )}
                  </div>
                </div>

                <div className="inline-flex rounded-md overflow-hidden">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={() => setCurrentTurn(Math.max(0, currentTurn - 1))}
                    title="Previous turn"
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={handleNextTurn}
                    title="Next turn"
                  >
                    Next
                  </Button>
                </div>
              </div>

              {/* Row 2: full-width Roll split-button, like your Select */}
              <div className="mt-2 flex w-full">
                <div className="inline-flex w-full rounded-md overflow-hidden">
                  {/* main: repeat last preset */}
                  <Button
                    size="sm"
                    className="h-8 flex-1 justify-center"
                    title="Roll initiative (uses last preset)"
                    onClick={() =>
                      rollInitiativeForScope(rollPreset.scope, rollPreset)
                    }
                  >
                    <Dice5 className="w-4 h-4 mr-1" />
                    Roll
                  </Button>

                  {/* chevron: opens options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        aria-haspopup="menu"
                        aria-label="Roll menu"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>Roll d20 + mods</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() =>
                          setAndRoll({
                            scope: "all",
                            useMods: true,
                          })
                        }
                      >
                        All
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setAndRoll({
                            scope: "pcs",
                            useMods: true,
                          })
                        }
                      >
                        PCs only
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setAndRoll({
                            scope: "npcs",
                            useMods: true,
                          })
                        }
                      >
                        NPCs only
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!selectedCharacter}
                        onClick={() =>
                          setAndRoll({
                            scope: "selected",
                            useMods: true,
                          })
                        }
                      >
                        Selected token
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuLabel>With advantage</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() =>
                          setAndRoll({
                            scope: "all",
                            useMods: true,
                            advantage: true,
                          })
                        }
                      >
                        All (adv)
                      </DropdownMenuItem>

                      <DropdownMenuLabel className="mt-1">
                        With disadvantage
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() =>
                          setAndRoll({
                            scope: "all",
                            useMods: true,
                            disadvantage: true,
                          })
                        }
                      >
                        All (dis)
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          setAndRoll({
                            scope: "all",
                            useMods: false,
                          })
                        }
                      >
                        All (no mods)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {currentCharacter && (
                <div className="mt-2 p-2 bg-primary/10 rounded border border-primary">
                  <div className="text-sm">{currentCharacter.name}'s Turn</div>
                </div>
              )}
            </div>

            {/* Rows */}
            <div className="max-h-[50vh] overflow-y-auto divide-y">
              {sortedCharacters.map((char, index) => {
                const isActiveTurn = index === currentTurn;
                const isSelected = selectedCharacter === char.id;

                return (
                  <div
                    key={char.id}
                    role="button"
                    onClick={() => handleCharacterClick(char.id)}
                    className={[
                      "px-4 py-2 transition cursor-pointer",
                      isActiveTurn ? "bg-primary/5" : "",
                      isSelected ? "ring-2 ring-primary/50" : "",
                    ].join(" ")}
                  >
                    {/* Row header: Name + PC/NPC + Initiative */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{char.name}</span>
                        <Badge
                          variant={char.isPlayer ? "default" : "secondary"}
                        >
                          {char.isPlayer ? "PC" : "NPC"}
                        </Badge>
                      </div>

                      {(() => {
                        const isEditing = editInitId === char.id;

                        if (!isEditing) {
                          return (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-xs"
                              title={
                                char.lastInitRoll
                                  ? `d20: ${char.lastInitRoll.die}${
                                      char.lastInitRoll.flags
                                        ? ` (${char.lastInitRoll.flags})`
                                        : ""
                                    } + mod: ${char.lastInitRoll.mod} = ${
                                      char.lastInitRoll.total
                                    } → capped: ${char.lastInitRoll.capped}`
                                  : "Click to edit initiative"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditInit(char);
                              }}
                            >
                              <span className="text-muted-foreground">
                                Init:
                              </span>
                              <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 font-medium">
                                {char.initiative}
                              </span>
                            </button>
                          );
                        }

                        return (
                          <input
                            type="text" // ← no spinners
                            inputMode="numeric" // ← mobile numeric keypad
                            pattern="[0-9]*"
                            value={editInitVal}
                            onChange={(e) =>
                              setEditInitVal(
                                e.target.value.replace(/[^\d]/g, "")
                              )
                            }
                            className="h-6 w-14 px-2 text-xs rounded-md border bg-muted focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.stopPropagation();
                                commitEditInit();
                              }
                              if (e.key === "Escape") {
                                e.stopPropagation();
                                setEditInitId(null);
                              }
                            }}
                            onBlur={commitEditInit}
                            autoFocus
                          />
                        );
                      })()}
                    </div>

                    {/* Inline stats: HP for PCs, DMG for NPCs */}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {char.isPlayer ? (
                        <>
                          HP: {char.hp}/{char.maxHp}
                        </>
                      ) : (
                        <>DMG: {char.damage ?? 0}</>
                      )}
                    </div>

                    {/* Manual mode controls */}
                    {initiativeMode === "manual" && (
                      <div className="mt-2 flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          title="Move up"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveInInitiative(char.id, "up");
                          }}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          title="Move down"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveInInitiative(char.id, "down");
                          }}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Help button + dialog (replaces always-on instructions) */}
        <div className="fixed bottom-4 right-8 z-50">
          <Dialog open={showHelp} onOpenChange={setShowHelp}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="rounded-full shadow-lg flex gap-1"
                title="Show controls (H)"
              >
                <HelpCircle className="w-5 h-5" />
                <span>Controls</span>
              </Button>
            </DialogTrigger>

            <DialogContent
              className="w-[92vw] sm:w-[640px] max-w-[95vw] max-h-[80vh]
             p-0 overflow-hidden flex flex-col"
            >
              <DialogHeader className="p-4 pb-2 border-b shrink-0">
                <DialogTitle>Controls</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto px-4">
                <div className="space-y-4 text-sm leading-6">
                  {/* Tools */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Tools
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <span className="font-mono">Select</span>: Click a token
                        to select. Hover shows a dashed preview; walls block
                        with a red stop. Click to move the lil homie.
                      </li>
                      <li>
                        <span className="font-mono">Measure</span>: Click–drag
                        to measure distances. Uses{" "}
                        <span className="font-mono">{distanceRule}</span> at{" "}
                        <span className="font-mono">{gridScale}ft</span>
                        /square, though you can muck that up good if you want.
                      </li>
                      <li>
                        <span className="font-mono">Paint</span>: Place{" "}
                        <span className="font-mono">Wall</span>s (shit you can't
                        move through),{" "}
                        <span className="font-mono">Difficult</span> (2x move
                        stuff) terrain, or{" "}
                        <span className="font-mono">Door</span>
                        s. Can click-drag to apply and Right-click(-drag) to
                        delete.
                      </li>
                      <li>
                        <span className="font-mono">Map Settings </span>
                        Screw around with grid size/scale/diagonal distance
                        calculation (nerd shyt)
                      </li>
                    </ul>
                  </div>

                  {/* Characters */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Characters
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <span className="font-mono">Add</span>: You can{" "}
                        <strong>Add</strong> one party member at a time should
                        you wish.{" "}
                        <ul>
                          <strong>Add Party</strong> brings the milkshake to the
                          yard.{" "}
                        </ul>
                        <ul>
                          None of this will overwrite existing characters.
                        </ul>
                        <ul>
                          <strong>Add Custom NPC</strong> has{" "}
                          <strong>Single</strong> or <strong>Bulk</strong>{" "}
                          options.
                        </ul>
                        <ul>
                          Bulk auto-names gaggles of bros like{" "}
                          <span className="font-mono">Zombie 1..N</span>.
                        </ul>
                      </li>
                      <li>
                        <span className="font-mono">Manage</span> Can update
                        health/ouchies, kill homies off, etc.
                        <ul>
                          <strong>HP/DMG</strong>: PCs show HP; NPCs show DMG
                          only so Dakota can LIE.
                        </ul>
                        <ul>
                          <strong>Selection</strong>: Selecting a character's
                          lil list entry centers it on the map.
                        </ul>
                      </li>
                    </ul>
                  </div>

                  {/* Initiative */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Initiative
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        <strong>Roll</strong>: Uses modifiers input during
                        character create (NPCs) or stored (PCs).
                      </li>
                      <li>
                        <strong>Modes</strong>:{" "}
                        <span className="font-mono">Auto</span> sorts by
                        initiative; <span className="font-mono">Manual</span>{" "}
                        preserves your custom order. This button is styled like
                        straight buns and sits just below the{" "}
                        <strong>Round</strong> indicator.
                      </li>
                    </ul>
                  </div>

                  {/* Shortcuts */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      Shortcuts
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>
                        <span className="font-mono inline-block rounded border px-1">
                          H
                        </span>{" "}
                        Open/close Controls
                      </div>
                      <div>
                        <span className="font-mono inline-block rounded border px-1">
                          Esc
                        </span>{" "}
                        Cancel measure / Deselect
                      </div>

                      <div className="col-span-2 my-1 border-t" />

                      <div>
                        <span className="font-mono inline-block rounded border px-1">
                          ⌘/Ctrl+Z
                        </span>{" "}
                        Undo
                      </div>
                      <div>
                        <span className="font-mono inline-block rounded border px-1">
                          ⇧⌘/Ctrl+Z
                        </span>{" "}
                        <span className="font-mono inline-block rounded border px-1 ml-1">
                          Ctrl+Y
                        </span>{" "}
                        Redo
                      </div>

                      <div>
                        <span className="font-mono inline-block rounded border px-1">
                          Space
                        </span>{" "}
                        or{" "}
                        <span className="font-mono inline-block rounded border px-1">
                          Enter
                        </span>{" "}
                        Next turn
                      </div>
                      <div>
                        <span className="font-mono inline-block rounded border px-1">
                          Backspace
                        </span>{" "}
                        or{" "}
                        <span className="font-mono inline-block rounded border px-1">
                          ⇧Space
                        </span>{" "}
                        Previous turn
                      </div>

                      <div className="col-span-2 my-1 border-t" />

                      <div>
                        <span className="font-mono inline-block rounded border px-1">
                          V
                        </span>{" "}
                        Select mode
                      </div>
                      <div>
                        <span className="font-mono inline-block rounded border px-1">
                          M
                        </span>{" "}
                        Measure mode
                      </div>
                      <div>
                        <span className="font-mono inline-block rounded border px-1">
                          B
                        </span>{" "}
                        Paint mode
                      </div>
                      <div>
                        <span className="font-mono inline-block rounded border px-1">
                          1
                        </span>{" "}
                        Wall{" "}
                        <span className="font-mono inline-block rounded border px-1 ml-1">
                          2
                        </span>{" "}
                        Difficult{" "}
                        <span className="font-mono inline-block rounded border px-1 ml-1">
                          3
                        </span>{" "}
                        Door{" "}
                        <span className="text-muted-foreground">
                          (when painting)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 border-t flex justify-end shrink-0">
                <Button variant="outline" onClick={() => setShowHelp(false)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
