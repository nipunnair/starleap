import { describe, expect, it } from 'vitest';
import { createInitialState, type PlayerCount } from '../../engine/state';
import { generateLegalMoves } from '../../engine/moves';
import { applyMove } from '../../engine/apply';
import { openingBookMove } from '../opening-book';
import { chooseTieredMove, TIERS } from '../tiers';

describe('openingBookMove (SPEC.md §3.3, Sirius only)', () => {
  it('returns a legal step move for every seat count on the very first move', () => {
    const counts: PlayerCount[] = [2, 3, 4, 6];
    for (const n of counts) {
      const state = createInitialState(n);
      const move = openingBookMove(state, 0);
      expect(move).not.toBeNull();
      expect(move!.type).toBe('step');

      const legal = generateLegalMoves(state, 0);
      expect(legal.some((m) => m.pegId === move!.pegId && m.to.x === move!.to.x && m.to.y === move!.to.y)).toBe(true);
    }
  });

  it('returns null once the player has already moved a peg out of their corner', () => {
    const state = createInitialState(2);
    const first = openingBookMove(state, 0)!;
    const next = applyMove(state, first);
    // Player 0 hasn't moved again yet, but their corner is no longer fully intact.
    expect(openingBookMove(next, 0)).toBeNull();
  });

  it('returns null for a player who is not seated', () => {
    const state = createInitialState(2);
    expect(openingBookMove(state, 5)).toBeNull();
  });

  it('chooseTieredMove uses the book for Sirius on the first move without invoking search', () => {
    const state = createInitialState(2);
    const result = chooseTieredMove(state, 0, 2, TIERS.Sirius);
    expect(result.depthReached).toBe(0);
    expect(Number.isNaN(result.evalScore)).toBe(true);

    const legal = generateLegalMoves(state, 0);
    expect(legal.some((m) => m.pegId === result.move.pegId && m.to.x === result.move.to.x)).toBe(true);
  });
});
