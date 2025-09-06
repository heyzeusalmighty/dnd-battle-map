import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../../components/ui/dropdown-menu";

import type { Character, InitiativeMode, RollPreset } from "../types";

import { Dice5, ChevronUp, ChevronDown } from "lucide-react";

interface InitiativePanelProps {
  characters: Character[];
  selectedCharacter: string | null;
  currentTurn: number;
  setCurrentTurn: React.Dispatch<React.SetStateAction<number>>;
  round: number;
  initiativeMode: InitiativeMode;
  setInitiativeMode: React.Dispatch<React.SetStateAction<InitiativeMode>>;
  setManualFromCurrentSort: () => void;
  handleNextTurn: () => void;
  rollInitiativeForScope: (
    scope: "all" | "pcs" | "npcs" | "selected",
    options?: {
      useMods?: boolean;
      advantage?: boolean;
      disadvantage?: boolean;
    }
  ) => void;
  rollPreset: RollPreset;
  setAndRoll: (preset: RollPreset) => void;
  currentCharacter?: Character | null;
  sortedCharacters?: Character[]; // optional pre-sorted list
  handleCharacterClick: (id: string) => void;

  // local edit state
  editInitId?: string | null; // id of char being edited, or null
  setEditInitId: React.Dispatch<React.SetStateAction<string | null>>;
  editInitVal: string; // string to allow empty input
  setEditInitVal: React.Dispatch<React.SetStateAction<string>>;
  startEditInit: (char: Character) => void;
  commitEditInit: () => void;
  moveInInitiative: (id: string, direction: "up" | "down") => void;
}

const InitiativePanel: React.FC<InitiativePanelProps> = ({
  characters,
  selectedCharacter,
  currentTurn,
  setCurrentTurn,
  round,
  initiativeMode,
  setInitiativeMode,
  setManualFromCurrentSort,
  handleNextTurn,
  rollInitiativeForScope,
  rollPreset,
  setAndRoll,
  currentCharacter,
  sortedCharacters = characters, // default to unsorted if not provided
  handleCharacterClick,
  editInitId = null,
  setEditInitId,
  editInitVal,
  setEditInitVal,
  startEditInit,
  commitEditInit,
  moveInInitiative,
}) => (
  <div className="w-64 flex-shrink-0 flex flex-col gap-4">
    <Card className="p-0 flex flex-col overflow-hidden">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-4 py-3 border-b bg-background">
        {/* Row 1: title + round/order on left, turn controls on right */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold">Initiative</h3>
            <div className="text-sm text-muted-foreground">Round {round}</div>
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
                  <Badge variant={char.isPlayer ? "default" : "secondary"}>
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
                        <span className="text-muted-foreground">Init:</span>
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
                        setEditInitVal(e.target.value.replace(/[^\d]/g, ""))
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
);

export default InitiativePanel;
