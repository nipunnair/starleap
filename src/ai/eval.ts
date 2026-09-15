/**
 * Weighted evaluation function. See docs/SPEC.md §3.1. Imports engine only, never ui/.
 */
import { type Cube, distance, project } from '../engine/coords';
import { CORNER_APEX, cornerOf } from '../engine/board';
import { seatOf, pegsOf, pegAt, type GameState } from '../engine/state';
import { buildOccupancy, generateSteps, legalHopsFrom } from '../engine/moves';

export interface EvalWeights {
  readonly wLag: number;
  readonly wHome: number;
  readonly wSpread: number;
  readonly wLadder: number;
  readonly wMobility: number;
}

/** Initial weights per SPEC §3.1, tuned during the Phase 3 gate if the ladder isn't monotonic. */
export const DEFAULT_WEIGHTS: EvalWeights = {
  wLag: 2.0,
  wHome: 8.0,
  wSpread: 0.5,
  wLadder: 1.5,
  wMobility: 0.05,
};

/** Perpendicular distance from `cell` to the straight line from `from` to `to` (2D projection). */
function lateralDeviation(cell: Cube, from: Cube, to: Cube): number {
  const a = project(from, 1);
  const b = project(to, 1);
  const p = project(cell, 1);
  const axisX = b.px - a.px;
  const axisY = b.py - a.py;
  const axisLen = Math.hypot(axisX, axisY);
  if (axisLen === 0) return 0;
  const relX = p.px - a.px;
  const relY = p.py - a.py;
  return Math.abs(relX * axisY - relY * axisX) / axisLen;
}

/** Count of hops available to `player`'s own pegs whose pivot is also one of their own pegs. */
function jumpReadyAlignments(state: GameState, player: number, occupied: ReadonlySet<string>): number {
  let count = 0;
  for (const peg of pegsOf(state, player)) {
    for (const hop of legalHopsFrom(peg.cell, occupied)) {
      const pivotPeg = pegAt(state, hop.pivot);
      if (pivotPeg && pivotPeg.owner === player) count += 1;
    }
  }
  return count;
}

/**
 * Higher is better for `player`. Combines progress, straggler-penalty, home count, formation
 * (on-axis + jump-ready), and mobility, per SPEC §3.1.
 */
export function evaluate(state: GameState, player: number, weights: EvalWeights = DEFAULT_WEIGHTS): number {
  const seat = seatOf(state, player);
  const apex = CORNER_APEX[seat.targetCorner];
  const startApex = CORNER_APEX[seat.startCorner];
  const pegs = pegsOf(state, player);

  const distances = pegs.map((p) => distance(p.cell, apex));
  const sumDistance = distances.reduce((a, b) => a + b, 0);
  const maxDistance = distances.length > 0 ? Math.max(...distances) : 0;
  const pegsHome = pegs.filter((p) => cornerOf(p.cell) === seat.targetCorner).length;
  const spread = pegs.reduce((sum, p) => sum + lateralDeviation(p.cell, startApex, apex), 0);

  const occupied = buildOccupancy(state);
  const ladder = jumpReadyAlignments(state, player, occupied);
  // Immediate step/single-hop options only (not full multi-hop chain enumeration): eval is
  // called once per candidate move during search, and full chain generation is by far the most
  // expensive part of move generation (SPEC.md §3.2 itself relies on eval being cheap enough to
  // prune the tree *before* recursing into it). See DECISIONS.md.
  const mobility = pegs.reduce(
    (sum, p) => sum + generateSteps(p.cell, occupied).length + legalHopsFrom(p.cell, occupied).length,
    0,
  );

  return (
    -sumDistance -
    weights.wLag * maxDistance +
    weights.wHome * pegsHome -
    weights.wSpread * spread +
    weights.wLadder * ladder +
    weights.wMobility * mobility
  );
}
