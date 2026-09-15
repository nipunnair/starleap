import { describe, expect, it } from 'vitest';
import { playHeadlessGame, type AIPlayer } from '../selfplay';
import { chooseGreedyMove } from '../greedy';

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
});
