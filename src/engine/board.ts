/**
 * Board construction: the 121-cell hexagram, its 61-cell hexagon, and six 10-cell corners.
 * See docs/SPEC.md §1. Zero imports outside coords.ts (which is itself zero-import).
 */
import { type Cube, onBoard, key, rotate60 } from './coords';

export type CornerId = 'X+' | 'X-' | 'Y+' | 'Y-' | 'Z+' | 'Z-';

export const CORNER_IDS: readonly CornerId[] = ['X+', 'X-', 'Y+', 'Y-', 'Z+', 'Z-'];

/** Each corner's antipodal corner — the start->target axis for a seated player. */
export const OPPOSITE_CORNER: Record<CornerId, CornerId> = {
  'X+': 'X-',
  'X-': 'X+',
  'Y+': 'Y-',
  'Y-': 'Y+',
  'Z+': 'Z-',
  'Z-': 'Z+',
};

function buildAllCells(): Cube[] {
  const cells: Cube[] = [];
  // x+y+z=0, and the widest any coordinate can range on this board is [-8, 8]
  // (4 for the hexagon + 4 for a corner's depth).
  for (let x = -8; x <= 8; x++) {
    for (let y = -8; y <= 8; y++) {
      const z = -x - y;
      if (z < -8 || z > 8) continue;
      const c: Cube = { x, y, z };
      if (onBoard(c)) cells.push(c);
    }
  }
  return cells;
}

/** Which corner a cell belongs to, or null if it's in the central hexagon. */
export function cornerOf(c: Cube): CornerId | null {
  if (c.x >= 5) return 'X+';
  if (c.x <= -5) return 'X-';
  if (c.y >= 5) return 'Y+';
  if (c.y <= -5) return 'Y-';
  if (c.z >= 5) return 'Z+';
  if (c.z <= -5) return 'Z-';
  return null;
}

export interface Board {
  readonly cells: readonly Cube[];
  readonly cellSet: ReadonlySet<string>;
  readonly hexagon: readonly Cube[];
  readonly corners: Readonly<Record<CornerId, readonly Cube[]>>;
}

function buildBoard(): Board {
  const cells = buildAllCells();
  const cellSet = new Set(cells.map(key));

  const corners: Record<CornerId, Cube[]> = {
    'X+': [], 'X-': [], 'Y+': [], 'Y-': [], 'Z+': [], 'Z-': [],
  };
  const hexagon: Cube[] = [];

  for (const c of cells) {
    const corner = cornerOf(c);
    if (corner) corners[corner].push(c);
    else hexagon.push(c);
  }

  return { cells, cellSet, hexagon, corners };
}

export const BOARD: Board = buildBoard();

export function isOnBoard(c: Cube): boolean {
  return BOARD.cellSet.has(key(c));
}

/** Rotate the whole board's cell set by 60 degrees; used only for the invariance property test. */
export function rotateBoardCells(cells: readonly Cube[]): Cube[] {
  return cells.map(rotate60);
}
