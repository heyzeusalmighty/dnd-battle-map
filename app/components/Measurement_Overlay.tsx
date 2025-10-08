import type { Measurement } from '../map/types';

export default function Measurement_Overlay({
  measurements,
  gridSize,
  width,
  height,
}: {
  measurements: Measurement[];
  gridSize: number;
  width: number;
  height: number;
}) {
  const w = width * gridSize;
  const h = height * gridSize;

  return (
    <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
      {measurements.map((m) => {
        const x1 = m.startX * gridSize + gridSize / 2;
        const y1 = m.startY * gridSize + gridSize / 2;
        const x2 = m.endX * gridSize + gridSize / 2;
        const y2 = m.endY * gridSize + gridSize / 2;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - 6;

        return (
          <g key={m.id} opacity={0.9}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#4B5563"
              strokeWidth={2}
              strokeDasharray="6,6"
            />
            <text
              x={midX}
              y={midY}
              fill="#111827"
              fontSize="12"
              textAnchor="middle"
              style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: 3 }}
            >
              {m.distance}ft
            </text>
          </g>
        );
      })}
    </svg>
  );
}
