import React, { useState, useCallback } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

export interface Token {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  size: 'small' | 'medium' | 'large' | 'huge';
  hp: number;
  maxHp: number;
  isPlayer: boolean;
  npcType?: 'minion' | 'elite' | 'boss' | 'ally';
}

export interface TerrainTile {
  id: string;
  x: number;
  y: number;
  type: 'wall' | 'difficult' | 'water' | 'pit' | 'door' | 'window' | 'furniture' | 'trap' | 'border' | 
        'chest' | 'altar' | 'statue' | 'pillar' | 'torch' | 'barrel' | 'table' | 'bed' | 'bookshelf' | 'anvil';
}

export interface MeasurementLine {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  distance: number;
}

interface CombatMapProps {
  tokens: Token[];
  terrain: TerrainTile[];
  measurements: MeasurementLine[];
  onTokenMove: (tokenId: string, x: number, y: number) => void;
  onTokenSelect: (tokenId: string | null) => void;
  selectedToken: string | null;
  onTerrainPlace: (x: number, y: number, type: string) => void;
  onMeasurementAdd: (startX: number, startY: number, endX: number, endY: number) => void;
  selectedTool: string;
  gridScale: number;
  mapWidth?: number;
  mapHeight?: number;
  onTerrainDelete?: (terrainId: string) => void;
}

const GRID_SIZE = 40;

export function CombatMap({
  tokens,
  terrain,
  measurements,
  onTokenMove,
  onTokenSelect,
  selectedToken,
  onTerrainPlace,
  onMeasurementAdd,
  selectedTool,
  gridScale,
  mapWidth = 25,
  mapHeight = 20,
  onTerrainDelete
}: CombatMapProps) {
  const [draggedToken, setDraggedToken] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [measurementStart, setMeasurementStart] = useState<{x: number, y: number} | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);

  const getTokenSize = (size: string) => {
    switch (size) {
      case 'small': return GRID_SIZE * 0.6;
      case 'medium': return GRID_SIZE * 0.8;
      case 'large': return GRID_SIZE * 1.2;
      case 'huge': return GRID_SIZE * 1.6;
      default: return GRID_SIZE * 0.8;
    }
  };

  const getTerrainColor = (type: string) => {
    switch (type) {
      case 'wall': return '#8B7355';
      case 'difficult': return '#D2691E';
      case 'water': return '#4682B4';
      case 'pit': return '#2F2F2F';
      case 'door': return '#8B4513';
      case 'window': return '#87CEEB';
      case 'furniture': return '#654321';
      case 'trap': return '#FF4500';
      case 'border': return '#000000';
      // Custom objects
      case 'chest': return '#8B4513';
      case 'altar': return '#D4AF37';
      case 'statue': return '#708090';
      case 'pillar': return '#A9A9A9';
      case 'torch': return '#FF6347';
      case 'barrel': return '#8B4513';
      case 'table': return '#654321';
      case 'bed': return '#DDA0DD';
      case 'bookshelf': return '#8B4513';
      case 'anvil': return '#2F4F4F';
      default: return 'transparent';
    }
  };

  const getTerrainOpacity = (type: string) => {
    switch (type) {
      case 'difficult': return 0.5;
      case 'window': return 0.6;
      case 'trap': return 0.7;
      default: return 1;
    }
  };

  const getNpcTypeColor = (npcType?: string) => {
    switch (npcType) {
      case 'minion': return '#FFA500';
      case 'elite': return '#FF4500';
      case 'boss': return '#8B0000';
      case 'ally': return '#32CD32';
      default: return undefined;
    }
  };

  const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const squares = Math.max(dx, dy);
    return squares * gridScale;
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, tokenId: string) => {
    try {
      e.preventDefault();
      const token = tokens.find(t => t && t.id === tokenId);
      if (!token) return;

      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setDraggedToken(tokenId);
      onTokenSelect(tokenId);
    } catch (error) {
      console.error('Error in handleMouseDown:', error);
    }
  }, [tokens, onTokenSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    try {
      if (!draggedToken) return;

      const mapRect = e.currentTarget.getBoundingClientRect();
      const x = Math.floor((e.clientX - mapRect.left - dragOffset.x) / GRID_SIZE);
      const y = Math.floor((e.clientY - mapRect.top - dragOffset.y) / GRID_SIZE);

      if (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
        onTokenMove(draggedToken, x, y);
      }
    } catch (error) {
      console.error('Error in handleMouseMove:', error);
    }
  }, [draggedToken, dragOffset, mapWidth, mapHeight, onTokenMove]);

  const handleMouseUp = useCallback(() => {
    setDraggedToken(null);
  }, []);

  const handleCellClick = useCallback((x: number, y: number) => {
    try {
      if (selectedTool === 'measure') {
        if (!measurementStart) {
          setMeasurementStart({ x, y });
        } else {
          onMeasurementAdd(measurementStart.x, measurementStart.y, x, y);
          setMeasurementStart(null);
        }
      } else if (selectedTool !== 'select' && selectedTool !== 'token') {
        onTerrainPlace(x, y, selectedTool);
      }
    } catch (error) {
      console.error('Error in handleCellClick:', error);
    }
  }, [selectedTool, measurementStart, onMeasurementAdd, onTerrainPlace]);

  const handleTerrainRightClick = useCallback((e: React.MouseEvent, terrainId: string) => {
    try {
      e.preventDefault();
      if (onTerrainDelete && selectedTool === 'select') {
        onTerrainDelete(terrainId);
      }
    } catch (error) {
      console.error('Error in handleTerrainRightClick:', error);
    }
  }, [onTerrainDelete, selectedTool]);

  const handleCellHover = useCallback((x: number, y: number) => {
    setHoveredCell({ x, y });
  }, []);

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Grid: {gridScale} ft/square</span>
          <span>Map Size: {mapWidth} × {mapHeight}</span>
          {hoveredCell && (
            <span>Cell: ({hoveredCell.x}, {hoveredCell.y})</span>
          )}
        </div>
        {measurementStart && (
          <Badge variant="outline">
            Click another cell to measure distance
          </Badge>
        )}
      </div>
      
      <div 
        className="relative border-2 border-border inline-block select-none"
        style={{ 
          width: mapWidth * GRID_SIZE,
          height: mapHeight * GRID_SIZE 
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid */}
        <svg 
          className="absolute inset-0 pointer-events-none"
          width={mapWidth * GRID_SIZE}
          height={mapHeight * GRID_SIZE}
        >
          {/* Grid lines */}
          {Array.from({ length: mapWidth + 1 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={i * GRID_SIZE}
              y1={0}
              x2={i * GRID_SIZE}
              y2={mapHeight * GRID_SIZE}
              stroke="rgba(0,0,0,0.2)"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: mapHeight + 1 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={i * GRID_SIZE}
              x2={mapWidth * GRID_SIZE}
              y2={i * GRID_SIZE}
              stroke="rgba(0,0,0,0.2)"
              strokeWidth={1}
            />
          ))}

          {/* Measurement lines */}
          {measurements.filter(m => m && typeof m.startX === 'number' && typeof m.startY === 'number').map((measurement) => (
            <g key={measurement.id}>
              <line
                x1={measurement.startX * GRID_SIZE + GRID_SIZE / 2}
                y1={measurement.startY * GRID_SIZE + GRID_SIZE / 2}
                x2={measurement.endX * GRID_SIZE + GRID_SIZE / 2}
                y2={measurement.endY * GRID_SIZE + GRID_SIZE / 2}
                stroke="#FF6B35"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
              <text
                x={(measurement.startX + measurement.endX) * GRID_SIZE / 2 + GRID_SIZE / 2}
                y={(measurement.startY + measurement.endY) * GRID_SIZE / 2 + GRID_SIZE / 2}
                fill="#FF6B35"
                fontSize="12"
                textAnchor="middle"
                className="font-medium"
              >
                {measurement.distance}ft
              </text>
            </g>
          ))}

          {/* Measurement preview */}
          {measurementStart && hoveredCell && (
            <g>
              <line
                x1={measurementStart.x * GRID_SIZE + GRID_SIZE / 2}
                y1={measurementStart.y * GRID_SIZE + GRID_SIZE / 2}
                x2={hoveredCell.x * GRID_SIZE + GRID_SIZE / 2}
                y2={hoveredCell.y * GRID_SIZE + GRID_SIZE / 2}
                stroke="#FF6B35"
                strokeWidth={2}
                strokeDasharray="3,3"
                opacity={0.7}
              />
              <text
                x={(measurementStart.x + hoveredCell.x) * GRID_SIZE / 2 + GRID_SIZE / 2}
                y={(measurementStart.y + hoveredCell.y) * GRID_SIZE / 2 + GRID_SIZE / 2}
                fill="#FF6B35"
                fontSize="12"
                textAnchor="middle"
                opacity={0.7}
                className="font-medium"
              >
                {calculateDistance(measurementStart.x, measurementStart.y, hoveredCell.x, hoveredCell.y)}ft
              </text>
            </g>
          )}
        </svg>

        {/* Clickable cells */}
        {Array.from({ length: mapHeight }).map((_, y) =>
          Array.from({ length: mapWidth }).map((_, x) => (
            <div
              key={`cell-${x}-${y}`}
              className={`absolute cursor-pointer hover:bg-accent/20 ${
                measurementStart?.x === x && measurementStart?.y === y ? 'bg-orange-200' : ''
              }`}
              style={{
                left: x * GRID_SIZE,
                top: y * GRID_SIZE,
                width: GRID_SIZE,
                height: GRID_SIZE
              }}
              onClick={() => handleCellClick(x, y)}
              onMouseEnter={() => handleCellHover(x, y)}
            />
          ))
        )}

        {/* Terrain */}
        {terrain.filter(tile => tile && typeof tile.x === 'number' && typeof tile.y === 'number').map((tile) => (
          <div
            key={tile.id}
            className={`absolute ${selectedTool === 'select' ? 'cursor-context-menu' : 'pointer-events-none'} ${
              tile.type === 'border' ? 'border-2 border-black bg-transparent' : ''
            }`}
            style={{
              left: tile.x * GRID_SIZE,
              top: tile.y * GRID_SIZE,
              width: GRID_SIZE,
              height: GRID_SIZE,
              backgroundColor: tile.type === 'border' ? 'transparent' : getTerrainColor(tile.type),
              opacity: getTerrainOpacity(tile.type)
            }}
            onContextMenu={(e) => handleTerrainRightClick(e, tile.id)}
            title={selectedTool === 'select' ? 'Right-click to delete' : undefined}
          >
            {tile.type === 'door' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">D</span>
              </div>
            )}
            {tile.type === 'trap' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">⚠</span>
              </div>
            )}
            {tile.type === 'furniture' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">■</span>
              </div>
            )}
            {/* Custom objects */}
            {tile.type === 'chest' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">📦</span>
              </div>
            )}
            {tile.type === 'altar' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">⛪</span>
              </div>
            )}
            {tile.type === 'statue' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">🗿</span>
              </div>
            )}
            {tile.type === 'pillar' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">🏛️</span>
              </div>
            )}
            {tile.type === 'torch' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">🔥</span>
              </div>
            )}
            {tile.type === 'barrel' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">🛢️</span>
              </div>
            )}
            {tile.type === 'table' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">🪑</span>
              </div>
            )}
            {tile.type === 'bed' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">🛏️</span>
              </div>
            )}
            {tile.type === 'bookshelf' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">📚</span>
              </div>
            )}
            {tile.type === 'anvil' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-xs">🔨</span>
              </div>
            )}
          </div>
        ))}

        {/* Tokens */}
        {tokens.filter(token => token && typeof token.x === 'number' && typeof token.y === 'number').map((token) => {
          const size = getTokenSize(token.size || 'medium');
          const offset = (GRID_SIZE - size) / 2;
          const npcBorderColor = getNpcTypeColor(token.npcType);
          const safeHp = Math.max(0, token.hp || 0);
          const safeMaxHp = Math.max(1, token.maxHp || 1);
          
          return (
            <div
              key={token.id}
              className={`absolute cursor-move rounded-full border-2 flex items-center justify-center transition-all ${
                selectedToken === token.id 
                  ? 'border-primary shadow-lg scale-110' 
                  : token.isPlayer 
                    ? 'border-blue-500' 
                    : 'border-red-500'
              }`}
              style={{
                left: token.x * GRID_SIZE + offset,
                top: token.y * GRID_SIZE + offset,
                width: size,
                height: size,
                backgroundColor: token.color || '#6B7280',
                borderColor: npcBorderColor || (selectedToken === token.id 
                  ? 'var(--primary)' 
                  : token.isPlayer 
                    ? '#3B82F6' 
                    : '#EF4444'),
                borderWidth: npcBorderColor ? '3px' : '2px',
                zIndex: draggedToken === token.id ? 10 : 1
              }}
              onMouseDown={(e) => handleMouseDown(e, token.id)}
            >
              <span className="text-xs font-medium text-white drop-shadow">
                {(token.name || 'X').charAt(0).toUpperCase()}
              </span>
              
              {token.npcType && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white text-xs flex items-center justify-center"
                     style={{ backgroundColor: npcBorderColor }}>
                  <span className="text-white text-xs leading-none">
                    {token.npcType === 'minion' ? 'M' : 
                     token.npcType === 'elite' ? 'E' : 
                     token.npcType === 'boss' ? 'B' : 'A'}
                  </span>
                </div>
              )}
              
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="w-8 h-1 bg-gray-700 rounded">
                  <div 
                    className="h-1 bg-green-500 rounded transition-all"
                    style={{ 
                      width: `${Math.max(0, Math.min(100, (safeHp / safeMaxHp) * 100))}%`,
                      backgroundColor: safeHp / safeMaxHp > 0.5 ? '#10B981' : 
                                     safeHp / safeMaxHp > 0.25 ? '#F59E0B' : '#EF4444'
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}