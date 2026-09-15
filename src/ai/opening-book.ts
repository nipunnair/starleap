/**
 * Sirius-only opening ladder book (SPEC.md §3.3): a short, hand-picked table of strong opening
 * formations, consulted before search. Imports engine only, never ui/.
 */
import { BOARD, type CornerId } from '../engine/board';
import { distance, key, type Cube } from '../engine/coords';
import { generateSteps, buildOccupancy, type StepMove } from '../engine/moves';
import type { GameState } from '../engine/state';

const ORIGIN: Cube = { x: 0, y: 0, z: 0 };
/** The corner's "base row" (closest to the hexagon, 4 cells) sits at distance 5 from center. */
const BASE_ROW_DISTANCE = 5;

function baseRowCells(corner: CornerId): Cube[] {
  return BOARD.corners[corner].filter((c) => distance(ORIGIN, c) === BASE_ROW_DISTANCE);
}

/**
 * Advances one of the corner's base-row pegs one step into the hexagon — classic
 * Chinese-Checkers opening theory: develop a base-row peg toward the center before committing
 * to any one jump lane, rather than advancing an apex/edge peg first. This is a single-ply
 * heuristic entry, not deep researched opening theory (see DECISIONS.md) — the brief asks for
 * "a short hardcoded table," not a solved opening tree.
 *
 * Only applies on the player's very first move of the game (their corner is still fully intact
 * — otherwise there's no well-defined "opening" left to consult).
 */
export function openingBookMove(state: GameState, player: number): StepMove | null {
  const seat = state.seats.find((s) => s.player === player);
  if (!seat) return null;

  const ownPegs = state.pegs.filter((p) => p.owner === player);
  const startKeys = new Set(BOARD.corners[seat.startCorner].map(key));
  const stillFullyHome = ownPegs.every((p) => startKeys.has(key(p.cell)));
  if (!stillFullyHome) return null;

  const occupied = buildOccupancy(state);

  for (const cell of baseRowCells(seat.startCorner)) {
    const peg = ownPegs.find((p) => key(p.cell) === key(cell));
    if (!peg) continue;

    const forwardSteps = generateSteps(peg.cell, occupied).filter((to) => distance(ORIGIN, to) < BASE_ROW_DISTANCE);
    if (forwardSteps.length > 0) {
      return { type: 'step', pegId: peg.id, from: peg.cell, to: forwardSteps[0]! };
    }
  }

  return null;
}
