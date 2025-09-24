import { MoreVertical } from "lucide-react";
import BulkNpcForm from "../../components/BulkNpcForm";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../../components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../components/ui/select";
import { useMapContext } from "../context/MapContext";
import type { Character } from "../types";
import { getId } from "../utils/id";
import { DEFAULT_PARTY } from "../utils/partyPresets";

const CharacterPanel = () => {
	const { handlers, state, actions } = useMapContext();
	const {
		setCharacters,
		setInitiativeOrder,
		setCharTab,
		setPresetToAdd,
		setShowAddChar,
		setAddMode,
		setNewCharName,
		setNewCharInit,
		setNewCharDmg,
		setCharQuery,
		setCharFilter,
		setDamageDelta,
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
		newCharDmg,
		newCharInit,
		charQuery,
		charFilter,
		filteredCharacters,
		damageDelta,
	} = state;

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
	return (
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

						<Button className="h-8" onClick={() => addCharacterFromPreset()}>
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
									type="button"
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
									type="button"
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
										<label
											className="text-sm font-medium"
											htmlFor="newCharName"
										>
											Name
										</label>
										<Input
											name="newCharName"
											value={newCharName}
											onChange={(e) => setNewCharName(e.target.value)}
											placeholder="e.g., Zombie"
										/>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div>
											<label
												className="text-sm font-medium"
												htmlFor="newCharInit"
											>
												Initiative mod
											</label>
											<Input
												name="newCharInit"
												value={newCharInit}
												onChange={(e) => setNewCharInit(e.target.value)}
												placeholder="e.g., 2"
												inputMode="numeric"
											/>
										</div>
										<div>
											<label
												className="text-sm font-medium"
												htmlFor="newCharDmg"
											>
												Starting damage (optional)
											</label>
											<Input
												name="newCharDmg"
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
								<BulkNpcForm />
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
									// biome-ignore lint/a11y/useAriaPropsSupportedByRole: <explanation>
									// biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
									// biome-ignore lint/a11y/useFocusableInteractive: <explanation>
									// biome-ignore lint/a11y/useSemanticElements: <explanation>
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
													<Badge variant={c.isPlayer ? "default" : "secondary"}>
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
														<Badge variant="outline">DMG {c.damage ?? 0}</Badge>
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
																handleUpdateHp(c.id, Math.max(0, c.hp - 1));
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
																	parseInt(e.target.value, 10) || 0,
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
																	Math.min(c.maxHp, c.hp + 1),
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
	);
};

export default CharacterPanel;
