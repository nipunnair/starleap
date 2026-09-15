/**
 * Greedy baseline AI: picks the legal move maximizing 1-ply post-move evaluation. No search
 * tree — this is the Phase 2 baseline the self-play harness verifies against before the real
 * ladder (Phase 3) exists. Imports engine only, never ui/.
 */
import { applyMove } from '../engine/apply';
import { generateLegalMoves, type Move } from '../engine/moves';
import type { GameState } from '../engine/state';
import { evaluate, DEFAULT_WEIGHTS, type EvalWeights } from './eval';

export function chooseGreedyMove(
  state: GameState,
  player: number,
  weights: EvalWeights = DEFAULT_WEIGHTS,
): Move | null {
  const moves = generateLegalMoves(state, player);
  if (moves.length === 0) return null;

  let best = moves[0]!;
  let bestScore = -Infinity;

  for (const move of moves) {
    const next = applyMove(state, move);
    const score = evaluate(next, player, weights);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }

  return best;
}
