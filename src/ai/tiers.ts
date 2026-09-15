/**
 * Difficulty ladder: Nova/Vega/Rigel/Sirius parameter table and the top-level move-choice
 * function that applies noise, Nova's chain-hop cap, and dispatches to the right search
 * algorithm. See docs/SPEC.md §3.3. Imports engine only, never ui/.
 */
import type { GameState, PlayerCount } from '../engine/state';
import { generateLegalMoves, type Move } from '../engine/moves';
import { applyMove } from '../engine/apply';
import { zobristHashOf, zobristUpdateForMove } from '../engine/zobrist';
import { searchBestMoveAlphaBeta, searchBestMoveMaxN } from './search';
import { DEFAULT_WEIGHTS, type EvalWeights } from './eval';
import { openingBookMove } from './opening-book';

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

// Sirius's topK is tuned down from SPEC.md §3.3's initial value of 24 to 18 — see DECISIONS.md.
// Search cost per depth level scales with topK^depth, so a topK of 24 (vs Rigel's 16) consumed
// Sirius's larger time budget on extra breadth rather than the extra depth that's supposed to
// be its distinguishing advantage over Rigel, leaving it barely deeper than Rigel in practice
// and unable to reliably beat it.
export const TIERS: Readonly<Record<TierName, TierConfig>> = {
  Nova: { name: 'Nova', depth: 1, topK: 6, noise: 0.35, timeBudgetMs: 250, maxChainHops: 2 },
  Vega: { name: 'Vega', depth: 1, topK: 12, noise: 0.1, timeBudgetMs: 600 },
  Rigel: { name: 'Rigel', depth: 3, topK: 16, noise: 0, timeBudgetMs: 1500 },
  Sirius: { name: 'Sirius', depth: 30, topK: 18, noise: 0, timeBudgetMs: 2500 },
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
 * tests; defaults to Math.random. `visitedHashes` is the actual game's own full position
 * history (not the search tree's) — see the repetition-avoidance note below.
 */
export function chooseTieredMove(
  state: GameState,
  player: number,
  playerCount: PlayerCount,
  tier: TierConfig,
  weights: EvalWeights = DEFAULT_WEIGHTS,
  rng: () => number = Math.random,
  visitedHashes?: ReadonlySet<bigint>,
): TieredMoveResult {
  const legalMoves = generateLegalMoves(state, player);
  if (legalMoves.length === 0) {
    throw new Error('chooseTieredMove called with no legal moves for the given player');
  }

  if (tier.name === 'Sirius') {
    const bookMove = openingBookMove(state, player);
    if (bookMove) {
      return { move: bookMove, usedNoise: false, evalScore: NaN, depthReached: 0 };
    }
  }

  let candidates =
    tier.maxChainHops !== undefined
      ? (() => {
          const filtered = legalMoves.filter((m) => !isChainTooLong(m, tier.maxChainHops!));
          // A boxed-in peg with only a long chain available still must move — Nova "can't see"
          // long chains as search candidates, but isn't literally unable to make the only move
          // on the board.
          return filtered.length > 0 ? filtered : legalMoves;
        })()
      : legalMoves;

  // Repetition avoidance: a finite-depth eval has no way to see that a locally-attractive move
  // recreates a position already visited in THIS game, so wider/deeper tiers (more likely to
  // find a "safe" reversible shuffle) can get stuck oscillating forever and hit the 150-round
  // stalemate cap even while clearly ahead — including cycles many plies long, which is why
  // this checks against the FULL game history, not just a short recent window (see
  // DECISIONS.md for how this was diagnosed). Falls back to the full candidate set if avoiding
  // every visited position would leave nothing.
  if (visitedHashes && visitedHashes.size > 0) {
    const currentHash = zobristHashOf(state);
    const nonRepeating = candidates.filter((move) => {
      const next = applyMove(state, move);
      const nextHash = zobristUpdateForMove(currentHash, state, move, next);
      return !visitedHashes.has(nextHash);
    });
    if (nonRepeating.length > 0) candidates = nonRepeating;
  }

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
