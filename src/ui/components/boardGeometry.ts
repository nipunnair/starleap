import { BOARD } from '../../engine/board';
import { project, type Cube } from '../../engine/coords';

export const CELL_SPACING = 32;
export const CELL_RADIUS = 13;
/**
 * Interactive hit-target radius for cells and pegs, in SVG viewBox units — the maximum possible
 * without adjacent targets overlapping (half the cell spacing, with a small safety margin).
 * SPEC.md P8.2 wants >=44 CSS px touch targets; on a 121-cell board rendered at up to 640px wide
 * that's geometrically unreachable without either horizontal scrolling or making single cells
 * bigger than a phone screen (documented judgment call — see DECISIONS.md). This maximizes hit
 * area within that hard constraint; full keyboard navigation (P8.3) is the precise, touch-
 * target-size-independent alternative input path.
 */
export const HIT_RADIUS = 15;

export interface ProjectedCell {
  readonly cell: Cube;
  readonly px: number;
  readonly py: number;
}

export const PROJECTED_CELLS: readonly ProjectedCell[] = BOARD.cells.map((cell) => ({
  cell,
  ...project(cell, CELL_SPACING),
}));

const xs = PROJECTED_CELLS.map((c) => c.px);
const ys = PROJECTED_CELLS.map((c) => c.py);
const PADDING = CELL_RADIUS * 3;

export const BOARD_VIEWBOX = {
  minX: Math.min(...xs) - PADDING,
  minY: Math.min(...ys) - PADDING,
  width: Math.max(...xs) - Math.min(...xs) + PADDING * 2,
  height: Math.max(...ys) - Math.min(...ys) + PADDING * 2,
};

/** Per-player colors, indexed by player number (0-5). */
export const PLAYER_COLORS: readonly string[] = [
  '#e0555f', // red
  '#4f8ff7', // blue
  '#f7c948', // yellow
  '#54c47e', // green
  '#b06ee0', // purple
  '#f79a4f', // orange
];
