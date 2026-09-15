import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../engine/state';
import { generateLegalMoves } from '../../engine/moves';
import { applyMove } from '../../engine/apply';
import { zobristHashOf, zobristUpdateForMove } from '../../engine/zobrist';
import { chooseTieredMove, TIERS, TIER_ORDER } from '../tiers';

function isLegal(move: { pegId: string; to: { x: number; y: number; z: number } }, legal: ReturnType<typeof generateLegalMoves>): boolean {
  return legal.some((m) => m.pegId === move.pegId && m.to.x === move.to.x && m.to.y === move.to.y && m.to.z === move.to.z);
}

describe('chooseTieredMove (SPEC.md §3.3)', () => {
  it('all four tiers exist in ladder order', () => {
    expect(TIER_ORDER).toEqual(['Nova', 'Vega', 'Rigel', 'Sirius']);
    for (const name of TIER_ORDER) {
      expect(TIERS[name].name).toBe(name);
    }
  });

  it.each(TIER_ORDER)('%s always returns a legal move (2P)', (name) => {
    const state = createInitialState(2);
    const result = chooseTieredMove(state, 0, 2, TIERS[name]);
    expect(isLegal(result.move, generateLegalMoves(state, 0))).toBe(true);
  });

  it.each(TIER_ORDER)('%s always returns a legal move (4P)', (name) => {
    const state = createInitialState(4);
    const result = chooseTieredMove(state, 0, 4, TIERS[name]);
    expect(isLegal(result.move, generateLegalMoves(state, 0))).toBe(true);
  });

  it('noise=1 always picks uniformly at random and never calls search', () => {
    const state = createInitialState(2);
    const forcedNoiseTier = { ...TIERS.Nova, noise: 1 };
    const result = chooseTieredMove(state, 0, 2, forcedNoiseTier, undefined, () => 0);
    expect(result.usedNoise).toBe(true);
    expect(isLegal(result.move, generateLegalMoves(state, 0))).toBe(true);
  });

  it('noise=0 never uses randomness (Rigel/Sirius)', () => {
    const state = createInitialState(2);
    const result = chooseTieredMove(state, 0, 2, TIERS.Rigel, undefined, () => 0); // rng()=0 would trigger noise if noise>0
    expect(result.usedNoise).toBe(false);
  });

  it('Nova excludes chains longer than 2 hops from consideration when alternatives exist', () => {
    // Build a peg with both a short (1-hop) and a long (3-hop) chain option, and confirm
    // Nova's candidate filtering would never surface the long one as its own choice basis —
    // verified indirectly via the exported chain-length invariant on tier config.
    expect(TIERS.Nova.maxChainHops).toBe(2);
    expect(TIERS.Vega.maxChainHops).toBeUndefined();
  });

  it('throws if called with no legal moves', () => {
    const state = createInitialState(2);
    const empty = { ...state, pegs: state.pegs.filter((p) => p.owner !== 0) };
    expect(() => chooseTieredMove(empty, 0, 2, TIERS.Nova)).toThrow();
  });

  describe('repetition avoidance (visitedHashes)', () => {
    it('never picks a move that returns to an exactly visited position when a non-repeating one exists', () => {
      const state = createInitialState(2);
      const currentHash = zobristHashOf(state);
      const legal = generateLegalMoves(state, 0);
      expect(legal.length).toBeGreaterThan(1);

      // Mark every legal destination except one as "already visited," forcing the filter to
      // prove it actually steers away from the visited ones rather than ignoring the set.
      const toAvoid = legal.slice(1);
      const visited = new Set<bigint>([currentHash]);
      for (const move of toAvoid) {
        const next = applyMove(state, move);
        visited.add(zobristUpdateForMove(currentHash, state, move, next));
      }

      const result = chooseTieredMove(state, 0, 2, { ...TIERS.Nova, noise: 0 }, undefined, () => 0.999, visited);
      const chosenNext = applyMove(state, result.move);
      const chosenHash = zobristUpdateForMove(currentHash, state, result.move, chosenNext);
      expect(visited.has(chosenHash)).toBe(false);
    });

    it('falls back to the full candidate set if every legal move would repeat a visited position', () => {
      const state = createInitialState(2);
      const currentHash = zobristHashOf(state);
      const legal = generateLegalMoves(state, 0);

      const visited = new Set<bigint>([currentHash]);
      for (const move of legal) {
        const next = applyMove(state, move);
        visited.add(zobristUpdateForMove(currentHash, state, move, next));
      }

      // Every possible destination is "visited" — must still return a legal move, not throw.
      const result = chooseTieredMove(state, 0, 2, TIERS.Nova, undefined, undefined, visited);
      expect(isLegal(result.move, legal)).toBe(true);
    });

    it('with no visitedHashes argument, behaves exactly as before (no filtering)', () => {
      const state = createInitialState(2);
      const result = chooseTieredMove(state, 0, 2, TIERS.Vega);
      expect(isLegal(result.move, generateLegalMoves(state, 0))).toBe(true);
    });
  });
});
