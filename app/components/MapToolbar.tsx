import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Separator } from './ui/separator';
import {
  MousePointer,
  Square,
  Mountain,
  Waves,
  Circle,
  Plus,
  DoorOpen,
  Armchair,
  AlertTriangle,
  Ruler,
  Settings,
  Trash2,
} from 'lucide-react';
import type { Token, MeasurementLine } from './CombatMap';

interface MapToolbarProps {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
  onAddToken: (token: Omit<Token, 'id'>) => void;
  onClearTerrain: () => void;
  onClearMeasurements: () => void;
  gridScale: number;
  onGridScaleChange: (scale: number) => void;
  measurements: MeasurementLine[];
  onRemoveMeasurement: (id: string) => void;
}

const TERRAIN_TOOLS = [
  { id: 'select', icon: MousePointer, label: 'Select', category: 'basic' },
  { id: 'wall', icon: Square, label: 'Wall', category: 'terrain' },
  { id: 'border', icon: Square, label: 'Room Border', category: 'terrain' },
  { id: 'difficult', icon: Mountain, label: 'Difficult', category: 'terrain' },
  { id: 'water', icon: Waves, label: 'Water', category: 'terrain' },
  { id: 'pit', icon: Circle, label: 'Pit', category: 'terrain' },
  { id: 'door', icon: DoorOpen, label: 'Door', category: 'objects' },
  { id: 'furniture', icon: Armchair, label: 'Furniture', category: 'objects' },
  { id: 'trap', icon: AlertTriangle, label: 'Trap', category: 'objects' },
  { id: 'measure', icon: Ruler, label: 'Measure', category: 'tools' },
] as const;

const TOKEN_COLORS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#06B6D4',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
];

const TOKEN_SIZES = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
  { id: 'huge', label: 'Huge' },
] as const;

const NPC_TYPES = [
  {
    id: 'minion',
    label: 'Minion',
    description: 'Weak enemies, often in groups',
  },
  { id: 'elite', label: 'Elite', description: 'Stronger than regular enemies' },
  { id: 'boss', label: 'Boss', description: 'Major encounter enemies' },
  { id: 'ally', label: 'Ally', description: 'Friendly NPCs' },
] as const;

export function MapToolbar({
  selectedTool,
  onToolSelect,
  onAddToken,
  onClearTerrain,
  onClearMeasurements,
  gridScale,
  onGridScaleChange,
  measurements,
  onRemoveMeasurement,
}: MapToolbarProps) {
  const [showTokenCreator, setShowTokenCreator] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [newTokenName, setNewTokenName] = React.useState('');
  const [newTokenColor, setNewTokenColor] = React.useState(TOKEN_COLORS[0]);
  const [newTokenSize, setNewTokenSize] = React.useState<
    'small' | 'medium' | 'large' | 'huge'
  >('medium');
  const [newTokenHp, setNewTokenHp] = React.useState('');
  const [newTokenIsPlayer, setNewTokenIsPlayer] = React.useState(false);
  const [newTokenNpcType, setNewTokenNpcType] = React.useState<
    'minion' | 'elite' | 'boss' | 'ally' | undefined
  >(undefined);

  const handleCreateToken = () => {
    if (newTokenName && newTokenHp) {
      const hp = parseInt(newTokenHp);
      onAddToken({
        name: newTokenName,
        x: 0,
        y: 0,
        color: newTokenColor,
        size: newTokenSize,
        hp,
        maxHp: hp,
        isPlayer: newTokenIsPlayer,
        npcType: newTokenIsPlayer ? undefined : newTokenNpcType,
      });
      setNewTokenName('');
      setNewTokenHp('');
      setNewTokenNpcType(undefined);
      setShowTokenCreator(false);
    }
  };

  const basicTools = TERRAIN_TOOLS.filter((tool) => tool.category === 'basic');
  const terrainTools = TERRAIN_TOOLS.filter(
    (tool) => tool.category === 'terrain'
  );
  const objectTools = TERRAIN_TOOLS.filter(
    (tool) => tool.category === 'objects'
  );
  const measurementTools = TERRAIN_TOOLS.filter(
    (tool) => tool.category === 'tools'
  );

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Basic Tools */}
        <div>
          <h4 className="mb-2">Basic Tools</h4>
          <div className="flex flex-wrap gap-2">
            {basicTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.id}
                  size="sm"
                  variant={selectedTool === tool.id ? 'default' : 'outline'}
                  onClick={() => onToolSelect(tool.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {tool.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Terrain Tools */}
        <div>
          <h4 className="mb-2">Terrain</h4>
          <div className="flex flex-wrap gap-2">
            {terrainTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.id}
                  size="sm"
                  variant={selectedTool === tool.id ? 'default' : 'outline'}
                  onClick={() => onToolSelect(tool.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {tool.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Objects & Features */}
        <div>
          <h4 className="mb-2">Objects & Features</h4>
          <div className="flex flex-wrap gap-2">
            {objectTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.id}
                  size="sm"
                  variant={selectedTool === tool.id ? 'default' : 'outline'}
                  onClick={() => onToolSelect(tool.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {tool.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Measurement Tools */}
        <div>
          <h4 className="mb-2">Measurement</h4>
          <div className="flex flex-wrap gap-2 mb-2">
            {measurementTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.id}
                  size="sm"
                  variant={selectedTool === tool.id ? 'default' : 'outline'}
                  onClick={() => onToolSelect(tool.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {tool.label}
                </Button>
              );
            })}
            {(measurements || []).length > 0 && (
              <Button size="sm" variant="outline" onClick={onClearMeasurements}>
                Clear ({(measurements || []).length})
              </Button>
            )}
          </div>

          {(measurements || []).length > 0 && (
            <div className="space-y-1 max-h-20 overflow-y-auto text-xs">
              {(measurements || []).map((measurement) => (
                <div
                  key={measurement.id}
                  className="flex items-center justify-between bg-muted p-1 rounded"
                >
                  <span>{measurement.distance}ft</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveMeasurement(measurement.id)}
                    className="h-4 w-4 p-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Token Management */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4>Characters & NPCs</h4>
            <Button
              size="sm"
              onClick={() => setShowTokenCreator(!showTokenCreator)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Character
            </Button>
          </div>

          {showTokenCreator && (
            <div className="p-3 border rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Character Name"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                />
                <Input
                  placeholder="HP"
                  type="number"
                  value={newTokenHp}
                  onChange={(e) => setNewTokenHp(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPlayer"
                  checked={newTokenIsPlayer}
                  onChange={(e) => setNewTokenIsPlayer(e.target.checked)}
                />
                <label htmlFor="isPlayer" className="text-sm">
                  Player Character
                </label>
              </div>

              {!newTokenIsPlayer && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    NPC Type
                  </label>
                  <Select
                    onValueChange={(
                      value: 'minion' | 'elite' | 'boss' | 'ally'
                    ) => setNewTokenNpcType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select NPC type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {NPC_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {type.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Size
                </label>
                <div className="flex gap-2">
                  {TOKEN_SIZES.map((size) => (
                    <Button
                      key={size.id}
                      size="sm"
                      variant={newTokenSize === size.id ? 'default' : 'outline'}
                      onClick={() => setNewTokenSize(size.id)}
                    >
                      {size.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Color
                </label>
                <div className="grid grid-cols-8 gap-1">
                  {TOKEN_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full border-2 ${
                        newTokenColor === color
                          ? 'border-primary'
                          : 'border-border'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTokenColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateToken}>
                  Create Character
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTokenCreator(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Map Settings */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4>Map Settings</h4>
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Map Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Grid Scale (feet per square)
                    </label>
                    <Select
                      onValueChange={(value) =>
                        onGridScaleChange(parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`${gridScale} feet`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 feet (Standard D&D)</SelectItem>
                        <SelectItem value="10">10 feet</SelectItem>
                        <SelectItem value="1">1 foot (Detailed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={onClearTerrain}
                      className="flex-1"
                    >
                      Clear Terrain
                    </Button>
                    <Button
                      variant="outline"
                      onClick={onClearMeasurements}
                      className="flex-1"
                    >
                      Clear Measurements
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="text-xs text-muted-foreground">
            Current scale: {gridScale} ft/square
          </div>
        </div>

        {/* Enhanced Legend */}
        <div>
          <h4 className="mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="font-medium text-muted-foreground">Terrain</div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#8B7355] rounded"></div>
              <span>Wall</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-black bg-transparent rounded"></div>
              <span>Room Border</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#D2691E] opacity-50 rounded"></div>
              <span>Difficult Terrain</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#4682B4] rounded"></div>
              <span>Water</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#2F2F2F] rounded"></div>
              <span>Pit</span>
            </div>

            <div className="font-medium text-muted-foreground mt-2">
              Objects
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#8B4513] rounded flex items-center justify-center text-white text-xs">
                D
              </div>
              <span>Door</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#654321] rounded flex items-center justify-center text-white text-xs">
                ■
              </div>
              <span>Furniture</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#FF4500] rounded flex items-center justify-center text-white text-xs">
                ⚠
              </div>
              <span>Trap</span>
            </div>

            <div className="font-medium text-muted-foreground mt-2">
              Characters
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 rounded-full bg-blue-400"></div>
              <span>Player Character</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-red-500 rounded-full bg-red-400"></div>
              <span>Enemy/NPC</span>
            </div>

            <div className="font-medium text-muted-foreground mt-2">
              NPC Types
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-orange-400 rounded-full bg-red-400 relative">
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 rounded-full text-white text-xs flex items-center justify-center">
                  M
                </div>
              </div>
              <span>Minion</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-orange-600 rounded-full bg-red-400 relative">
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-600 rounded-full"></div>
              </div>
              <span>Elite</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-red-800 rounded-full bg-red-400 relative">
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-800 rounded-full"></div>
              </div>
              <span>Boss</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-green-500 rounded-full bg-red-400 relative">
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <span>Ally</span>
            </div>

            <div className="font-medium text-muted-foreground mt-2">
              Measurements
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-1 bg-orange-500"
                style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}
              ></div>
              <span>Distance Line</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
