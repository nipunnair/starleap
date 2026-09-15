/**
 * Pure state transition: (state, move) -> new state. See docs/SPEC.md §2.5-2.7.
 * Zero imports outside coords.ts/board.ts/state.ts/moves.ts (all themselves zero-import).
 */
import { cornerOf } from './board';
import { seatOf, type GameState } from './state';
import type { Move } from './moves';

/**
 * Applies a legal move: relocates the peg, latches `hasLeftStart` the first time the peg
 * occupies any cell outside its own start corner (SPEC §2.5 — once true, it never resets),
 * advances the current player, and increments `round` once every seated player has moved once.
 */
export function applyMove(state: GameState, move: Move): GameState {
  const pegs = state.pegs.map((p) => {
    if (p.id !== move.pegId) return p;
    const seat = seatOf(state, p.owner);
    const hasLeftStart = p.hasLeftStart || cornerOf(move.to) !== seat.startCorner;
    return { ...p, cell: move.to, hasLeftStart };
  });

  const nextPlayer = (state.currentPlayer + 1) % state.playerCount;
  const round = nextPlayer === 0 ? state.round + 1 : state.round;

  return { ...state, pegs, currentPlayer: nextPlayer, round };
}
