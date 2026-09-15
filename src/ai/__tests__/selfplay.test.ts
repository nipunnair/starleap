import { describe, expect, it } from 'vitest';
import { playHeadlessGame, type AIPlayer } from '../selfplay';
import { chooseGreedyMove } from '../greedy';
import { chooseTieredMove, TIERS } from '../tiers';

const greedyPlayer: AIPlayer = (state, player) => chooseGreedyMove(state, player);

describe('playHeadlessGame (IMPLEMENTATION_PLAN.md P2.3)', () => {
  it('plays a 2-player greedy-vs-greedy game to completion with zero illegal moves', () => {
    const result = playHeadlessGame(2, [greedyPlayer, greedyPlayer]);
    expect(result.illegalMoveCount).toBe(0);
    expect(result.rounds).toBeGreaterThan(0);
    expect(result.plies).toBeGreaterThan(0);
    expect(result.ranking.length).toBe(2);
  });

  it('never exceeds the 150-round stalemate cap', () => {
    const result = playHeadlessGame(2, [greedyPlayer, greedyPlayer]);
    expect(result.rounds).toBeLessThanOrEqual(150);
  });

  it('records move-generation timings for every turn taken', () => {
    const result = playHeadlessGame(3, [greedyPlayer, greedyPlayer, greedyPlayer]);
    expect(result.moveGenTimesMs.length).toBeGreaterThan(0);
    for (const t of result.moveGenTimesMs) {
      expect(t).toBeGreaterThanOrEqual(0);
    }
  });

  it('flags a deliberately illegal move from a broken AI', () => {
    const brokenPlayer: AIPlayer = () => ({
      type: 'step',
      pegId: 'does-not-exist',
      from: { x: 0, y: 0, z: 0 },
      to: { x: 0, y: 0, z: 0 },
    });
    const result = playHeadlessGame(2, [brokenPlayer, brokenPlayer]);
    expect(result.illegalMoveCount).toBeGreaterThan(0);
  });

  it('runs for all four seat counts without throwing', () => {
    for (const n of [2, 3, 4, 6] as const) {
      const players: AIPlayer[] = Array.from({ length: n }, () => greedyPlayer);
      expect(() => playHeadlessGame(n, players)).not.toThrow();
    }
  });

  it('threads visitedHashes into tiered AI players and avoids the exact-repetition stalemate', () => {
    // Regression test for the cycling bug found during Phase 3 tournament diagnosis (see
    // DECISIONS.md): tiny time budgets let both sides fall into a repeating shuffle with no
    // history-based escape. A scaled-down Rigel-vs-Rigel game at a real (if small) budget
    // should reliably finish with a real win, not run out the full 150-round cap.
    const tinyRigel: AIPlayer = (state, player, visitedHashes) =>
      chooseTieredMove(state, player, 2, { ...TIERS.Rigel, timeBudgetMs: 20 }, undefined, undefined, visitedHashes)
        .move;

    const result = playHeadlessGame(2, [tinyRigel, tinyRigel]);
    expect(result.stalemate).toBe(false);
    expect(result.winner).not.toBeNull();
  });
});
