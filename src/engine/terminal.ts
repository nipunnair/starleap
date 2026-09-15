/**
 * Win, stalemate, and ranking. See docs/SPEC.md §2.6-2.7.
 * Zero imports outside coords.ts/board.ts/state.ts (all themselves zero-import).
 */
import { distance } from './coords';
import { cornerOf, CORNER_APEX } from './board';
import { seatOf, pegsOf, type GameState } from './state';

export const STALEMATE_ROUND_CAP = 150;

/** All ten of `player`'s pegs are resting in their own target corner. */
export function hasWon(state: GameState, player: number): boolean {
  const seat = seatOf(state, player);
  const pegs = pegsOf(state, player);
  return pegs.length === 10 && pegs.every((p) => cornerOf(p.cell) === seat.targetCorner);
}

export function playersFinished(state: GameState): number[] {
  return state.seats.filter((seat) => hasWon(state, seat.player)).map((s) => s.player);
}

export function isStalemate(state: GameState): boolean {
  return state.round >= STALEMATE_ROUND_CAP;
}

/** Game ends when only one seated player still has unfinished pegs, or on stalemate. */
export function isGameOver(state: GameState): boolean {
  if (isStalemate(state)) return true;
  return playersFinished(state).length >= state.playerCount - 1;
}

export interface RankingEntry {
  readonly player: number;
  readonly pegsHome: number;
  readonly totalDistance: number;
}

/**
 * Ranks all seated players by pegs already home (descending), then by summed remaining
 * distance from each peg to its target corner's apex (ascending — closer is better). Used both
 * for the SPEC §2.7 stalemate ranking and for a finished game's finishing order.
 */
export function rank(state: GameState): RankingEntry[] {
  const entries: RankingEntry[] = state.seats.map((seat) => {
    const pegs = pegsOf(state, seat.player);
    const apex = CORNER_APEX[seat.targetCorner];
    const pegsHome = pegs.filter((p) => cornerOf(p.cell) === seat.targetCorner).length;
    const totalDistance = pegs.reduce((sum, p) => sum + distance(p.cell, apex), 0);
    return { player: seat.player, pegsHome, totalDistance };
  });

  return [...entries].sort((a, b) => b.pegsHome - a.pegsHome || a.totalDistance - b.totalDistance);
}
