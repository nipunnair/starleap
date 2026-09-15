import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../engine/state';
import { generateLegalMoves } from '../../engine/moves';
import { applyMove } from '../../engine/apply';
import { chooseGreedyMove } from '../greedy';
import { evaluate } from '../eval';

describe('chooseGreedyMove (IMPLEMENTATION_PLAN.md P2.2)', () => {
  it('always returns a legal move from the current position', () => {
    const state = createInitialState(2);
    const move = chooseGreedyMove(state, 0);
    expect(move).not.toBeNull();

    const legal = generateLegalMoves(state, 0);
    expect(legal.some((m) => m.pegId === move!.pegId && m.to.x === move!.to.x && m.to.y === move!.to.y)).toBe(true);
  });

  it('returns null when the player has no legal moves', () => {
    // Player 1 has no pegs seated in a fabricated single-seat state.
    const state = createInitialState(2);
    const emptyPlayerState = { ...state, pegs: state.pegs.filter((p) => p.owner !== 1) };
    const move = chooseGreedyMove(emptyPlayerState, 1);
    expect(move).toBeNull();
  });

  it('picks a move whose resulting eval is >= every other legal move\'s resulting eval', () => {
    const state = createInitialState(2);
    const move = chooseGreedyMove(state, 0)!;
    const chosenScore = evaluate(applyMove(state, move), 0);

    for (const candidate of generateLegalMoves(state, 0)) {
      const candidateScore = evaluate(applyMove(state, candidate), 0);
      expect(chosenScore).toBeGreaterThanOrEqual(candidateScore);
    }
  });
});
