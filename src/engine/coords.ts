/**
 * Cube coordinates for the STARLEAP hexagram board. See docs/SPEC.md §1.
 * This module has zero imports and must stay that way — see AGENTS.md.
 */

export interface Cube {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function add(a: Cube, b: Cube): Cube {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function scale(a: Cube, n: number): Cube {
  return { x: a.x * n, y: a.y * n, z: a.z * n };
}

export function equals(a: Cube, b: Cube): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

/** Deterministic string key for use as a Map/Set key. */
export function key(c: Cube): string {
  return `${c.x},${c.y},${c.z}`;
}

/**
 * onBoard(c) = (x<=4 && y<=4 && z<=4) || (x>=-4 && y>=-4 && z>=-4)
 * The union of these two triangular regions is exactly the hexagram: 121 cells.
 */
export function onBoard(c: Cube): boolean {
  return (
    (c.x <= 4 && c.y <= 4 && c.z <= 4) || (c.x >= -4 && c.y >= -4 && c.z >= -4)
  );
}

export const NEIGHBOR_DIRECTIONS: readonly Cube[] = [
  { x: 1, y: -1, z: 0 },
  { x: 1, y: 0, z: -1 },
  { x: 0, y: 1, z: -1 },
  { x: -1, y: 1, z: 0 },
  { x: -1, y: 0, z: 1 },
  { x: 0, y: -1, z: 1 },
];

/** All six neighbor cells of c, filtered to those on the board. */
export function neighbors(c: Cube): Cube[] {
  return NEIGHBOR_DIRECTIONS.map((d) => add(c, d)).filter(onBoard);
}

export function distance(a: Cube, b: Cube): number {
  return (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z)) / 2;
}

/** 60° rotation: (x,y,z) -> (-z,-x,-y). The board's cell set is invariant under this. */
export function rotate60(c: Cube): Cube {
  return { x: -c.z, y: -c.x, z: -c.y };
}

/** Screen-space projection. q = x, r = z. Every neighbor lands exactly `spacing` px away. */
export function project(c: Cube, spacing: number): { px: number; py: number } {
  const q = c.x;
  const r = c.z;
  return {
    px: spacing * (q + r / 2),
    py: spacing * r * (Math.sqrt(3) / 2),
  };
}
