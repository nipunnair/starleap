import { describe, expect, it } from 'vitest';
import { createInitialState, type PlayerCount } from '../../engine/state';
import { generateLegalMoves } from '../../engine/moves';
import { searchBestMoveMaxN, MAX_N_DEPTH } from '../search';

describe('searchBestMoveMaxN (SPEC.md §3.2)', () => {
  const counts: PlayerCount[] = [3, 4, 6];

  it.each(counts)('returns a legal move within the time budget (%i players)', (n) => {
    const state = createInitialState(n);
    const result = searchBestMoveMaxN(state, 0, n, { timeBudgetMs: 300, topK: 8 });

    const legal = generateLegalMoves(state, 0);
    expect(
      legal.some((m) => m.pegId === result.move.pegId && m.to.x === result.move.to.x && m.to.y === result.move.to.y),
    ).toBe(true);
    expect(result.depthReached).toBe(MAX_N_DEPTH);
  });

  it('throws if called with no legal moves', () => {
    const state = createInitialState(4);
    const empty = { ...state, pegs: state.pegs.filter((p) => p.owner !== 0) };
    expect(() => searchBestMoveMaxN(empty, 0, 4, { timeBudgetMs: 50, topK: 6 })).toThrow();
  });

  it('respects the time budget under a tight deadline', () => {
    const state = createInitialState(6);
    const t0 = performance.now();
    searchBestMoveMaxN(state, 0, 6, { timeBudgetMs: 50, topK: 6 });
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(1000); // generous CI slack
  });
});
