// terrain.ts — tiny helpers (root-level file)

export const BUILTIN_TERRAIN = new Set([
  "wall", "door", "difficult", "water", "furniture"
]);

// Paste YOUR current color logic so visuals don't change
export function getTerrainColor(type: string): string {
  switch (type) {
    case "wall":      return "#4B5563";
    case "water":     return "#60A5FA";
    case "door":      return "#F59E0B";
    case "difficult": return "#8B5E34";
    case "furniture": return "#9CA3AF";
    default:          return "#9CA3AF";
  }
}
