// components/Map_GridLines.tsx
import React from 'react';

export default function Map_GridLines({
  width,
  height,
  size,
}: {
  width: number;
  height: number;
  size: number;
}) {
  const rows = Array.from({ length: height + 1 }, (_, r) => r * size);
  const cols = Array.from({ length: width + 1 }, (_, c) => c * size);

  return (
    <svg
      width={width * size}
      height={height * size}
      className="absolute inset-0"
      style={{ pointerEvents: 'none' }} // <- important: don't block clicks
    >
      {rows.map((y, i) => (
        <line
          key={`r${i}`}
          x1={0}
          y1={y}
          x2={width * size}
          y2={y}
          stroke="#eee"
        />
      ))}
      {cols.map((x, i) => (
        <line
          key={`c${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height * size}
          stroke="#eee"
        />
      ))}
    </svg>
  );
}
