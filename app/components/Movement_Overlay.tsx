import React from 'react';
import type { DistanceRule } from '../map/types';
import { clipMovementAtWalls } from '../map/utils/distance';
import { measureMoveCost } from '../map/utils/movement';
import type { Terrain } from '../map/types';

type Pt = { x: number; y: number };

type Props = {
  start: Pt | null;
  end: Pt | null;
  cellPx: number; // GRID_SIZE
  rule: DistanceRule; // "5e" | "5105" | "euclidean"
  gridScale: number; // feet per square
  isDifficultAt: (x: number, y: number) => boolean;
  zIndex?: number;
  terrain: Terrain[];
};

export default function Movement_Overlay({
  start,
  end,
  cellPx,
  rule,
  gridScale,
  isDifficultAt,
  zIndex = 6,
  terrain,
}: Props) {
  if (!start || !end) return null;

  const cx = (x: number) => x * cellPx + cellPx / 2;
  const cy = (y: number) => y * cellPx + cellPx / 2;

  // >>> THIS is the `const clip` you were looking for
  const clip = clipMovementAtWalls(start, end, terrain);

  // measure the whole allowed path ONCE so 5-10-5 alternation is preserved
  const mm = measureMoveCost(
    start.x,
    start.y,
    clip.lastFree.x,
    clip.lastFree.y,
    rule,
    gridScale,
    isDifficultAt
  );

  // draw through start + each step endpoint
  const cells: Pt[] = [start, ...mm.steps.map((s) => ({ x: s.x, y: s.y }))];

  // total feet for label
  const feet = mm.total;

  // Label near last legal cell (not midpoint)
  const labelX = cx(clip.lastFree.x) + 10;
  const labelY = cy(clip.lastFree.y) - 10;

  // TEMP: sanity log (remove when happy)
  // console.debug("movement clip", { from: start, to: end, clip });

  return (
    <svg
      width="100%"
      height="100%"
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex }}
    >
      <title>Movement Overlay</title>
      <g opacity={0.9}>
        {/* Allowed path (blue) */}
        {cells.length > 1 && (
          <polyline
            points={cells.map((c) => `${cx(c.x)},${cy(c.y)}`).join(' ')}
            fill="none"
            stroke="#3B82F6" // blue-500
            strokeDasharray="6,6"
            strokeWidth={2}
          />
        )}

        {/* If blocked, show stop marker + dashed “wish line” to cursor */}
        {clip.blocked && clip.blockedAt && (
          <>
            <line
              x1={cx(clip.lastFree.x)}
              y1={cy(clip.lastFree.y)}
              x2={cx(clip.blockedAt.x)}
              y2={cy(clip.blockedAt.y)}
              stroke="#EF4444"
              strokeWidth={2}
            />
            <circle
              cx={cx(clip.blockedAt.x)}
              cy={cy(clip.blockedAt.y)}
              r={6}
              fill="#EF4444"
            />
            <line
              x1={cx(clip.blockedAt.x) - 8}
              y1={cy(clip.blockedAt.y)}
              x2={cx(clip.blockedAt.x) + 8}
              y2={cy(clip.blockedAt.y)}
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <line
              x1={cx(clip.blockedAt.x)}
              y1={cy(clip.blockedAt.y)}
              x2={cx(end.x)}
              y2={cy(end.y)}
              stroke="#6B7280"
              strokeWidth={2}
              strokeDasharray="4,6"
              opacity={0.4}
            />
          </>
        )}

        {/* Distance label */}
        <text
          x={labelX}
          y={labelY}
          fill="#111827"
          fontSize="12"
          textAnchor="start"
          style={{
            paintOrder: 'stroke',
            stroke: 'white',
            strokeWidth: 3,
          }}
        >
          {feet}ft{clip.blocked ? ' (blocked)' : ''}
        </text>
      </g>
    </svg>
  );
}
