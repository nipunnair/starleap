/**
 * Difficulty ladder: Nova/Vega/Rigel/Sirius parameter table and the top-level move-choice
 * function that applies noise, Nova's chain-hop cap, and dispatches to the right search
 * algorithm. See docs/SPEC.md §3.3. Imports engine only, never ui/.
 */
import type { GameState, PlayerCount } from '../engine/state';
import { generateLegalMoves, type Move } from '../engine/moves';
import { searchBestMoveAlphaBeta, searchBestMoveMaxN } from './search';
import { DEFAULT_WEIGHTS, type EvalWeights } from './eval';

export type TierName = 'Nova' | 'Vega' | 'Rigel' | 'Sirius';

export interface TierConfig {
  readonly name: TierName;
  /** Max search depth, 2-player alpha-beta only — max^n is always fixed-depth (see search.ts). */
  readonly depth: number;
  readonly topK: number;
  /** Probability [0,1] of substituting a uniformly random legal move for the searched one. */
  readonly noise: number;
  readonly timeBudgetMs: number;
  /** Nova only: jump chains longer than this are excluded from what it even considers. */
  readonly maxChainHops?: number;
}

export const TIERS: Readonly<Record<TierName, TierConfig>> = {
  Nova: { name: 'Nova', depth: 1, topK: 6, noise: 0.35, timeBudgetMs: 250, maxChainHops: 2 },
  Vega: { name: 'Vega', depth: 1, topK: 12, noise: 0.1, timeBudgetMs: 600 },
  Rigel: { name: 'Rigel', depth: 3, topK: 16, noise: 0, timeBudgetMs: 1500 },
  Sirius: { name: 'Sirius', depth: 30, topK: 24, noise: 0, timeBudgetMs: 2500 },
};

export const TIER_ORDER: readonly TierName[] = ['Nova', 'Vega', 'Rigel', 'Sirius'];

function isChainTooLong(move: Move, maxHops: number): boolean {
  return move.type === 'jump' && move.hops.length > maxHops;
}

export interface TieredMoveResult {
  readonly move: Move;
  readonly usedNoise: boolean;
  readonly evalScore: number;
  readonly depthReached: number;
}

/**
 * Chooses `player`'s move under `tier`'s parameters. `rng` is injectable for deterministic
 * tests; defaults to Math.random.
 */
export function chooseTieredMove(
  state: GameState,
  player: number,
  playerCount: PlayerCount,
  tier: TierConfig,
  weights: EvalWeights = DEFAULT_WEIGHTS,
  rng: () => number = Math.random,
): TieredMoveResult {
  const legalMoves = generateLegalMoves(state, player);
  if (legalMoves.length === 0) {
    throw new Error('chooseTieredMove called with no legal moves for the given player');
  }

  const candidates =
    tier.maxChainHops !== undefined
      ? (() => {
          const filtered = legalMoves.filter((m) => !isChainTooLong(m, tier.maxChainHops!));
          // A boxed-in peg with only a long chain available still must move — Nova "can't see"
          // long chains as search candidates, but isn't literally unable to make the only move
          // on the board.
          return filtered.length > 0 ? filtered : legalMoves;
        })()
      : legalMoves;

  if (rng() < tier.noise) {
    const pick = candidates[Math.floor(rng() * candidates.length)]!;
    return { move: pick, usedNoise: true, evalScore: NaN, depthReached: 0 };
  }

  const options = { timeBudgetMs: tier.timeBudgetMs, topK: tier.topK, weights, maxDepth: tier.depth };

  const result =
    playerCount === 2
      ? searchBestMoveAlphaBeta(state, player, options, candidates)
      : searchBestMoveMaxN(state, player, playerCount, options, candidates);

  return { move: result.move, usedNoise: false, evalScore: result.evalScore, depthReached: result.depthReached };
}
