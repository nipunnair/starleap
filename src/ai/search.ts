/**
 * Search: 2-player iterative-deepening alpha-beta (this file, part A) and 3+ player max^n
 * (part B, added alongside it). See docs/SPEC.md §3.2. Imports engine only, never ui/.
 */
import type { GameState } from '../engine/state';
import { generateLegalMoves, type Move } from '../engine/moves';
import { applyMove, advanceTurnWithoutMove } from '../engine/apply';
import { isGameOver } from '../engine/terminal';
import { zobristHashOf, zobristUpdateForMove } from '../engine/zobrist';
import { evaluate, DEFAULT_WEIGHTS, type EvalWeights } from './eval';

export interface SearchOptions {
  readonly timeBudgetMs: number;
  /** Branching factor is large because of long jumps; prune to the top K moves by static
   * 1-ply eval delta before recursing (SPEC §3.2-3.3), applied at every node. */
  readonly topK: number;
  readonly weights?: EvalWeights;
  /** Caps iterative deepening (2P alpha-beta only; max^n's depth is fixed, see below).
   * Defaults to MAX_SEARCH_DEPTH (effectively "no cap but the time budget"). */
  readonly maxDepth?: number;
}

export interface SearchResult {
  readonly move: Move;
  readonly evalScore: number;
  readonly depthReached: number;
}

/** Static 1-ply eval delta for whoever is about to move, descending, capped to `k`. */
export function topKMoves(state: GameState, mover: number, moves: readonly Move[], k: number, weights: EvalWeights): Move[] {
  if (moves.length <= k) return [...moves];
  const baseline = evaluate(state, mover, weights);
  const scored = moves.map((m) => ({
    move: m,
    delta: evaluate(applyMove(state, m), mover, weights) - baseline,
  }));
  scored.sort((a, b) => b.delta - a.delta);
  return scored.slice(0, k).map((s) => s.move);
}

const MAX_SEARCH_DEPTH = 30;

/**
 * Chain-hop cap used only for move generation INSIDE the search tree (not at the root, not in
 * real gameplay/self-play). generateLegalMoves' jump-chain DFS is the most expensive part of
 * move generation, and search calls it once per node — at real branching factors this made a
 * single Rigel/Sirius search take tens of seconds instead of respecting its time budget (see
 * DECISIONS.md). Capping hypothetical-node chains to 6 hops keeps most realistic tactical
 * chains visible while bounding worst-case enumeration; it never changes what's actually legal
 * for the player to choose (the root and all real move application always use the full cap).
 */
const SEARCH_NODE_CHAIN_CAP = 6;

type TTFlag = 'exact' | 'lower' | 'upper';
interface TTEntry {
  readonly depth: number;
  readonly score: number;
  readonly flag: TTFlag;
}

/**
 * evaluate() is per-player, not zero-sum (evaluate(state,0) + evaluate(state,1) isn't
 * constant) — but classic alpha-beta pruning's min/max backup rule is only sound for a value
 * both sides are truly adversarial over. Using the raw per-player eval as the leaf value made
 * deeper search perform WORSE than shallow search in testing (see DECISIONS.md): Rigel/Sirius
 * modeled the opponent as maximally hostile toward Rigel/Sirius's own score specifically, which
 * a real self-interested opponent (maximizing their OWN separate eval) never actually plays
 * like, so deeper adversarial lookahead chased threats that don't really exist. The standard
 * fix (used in essentially every classical 2-player minimax game AI) is a RELATIVE score —
 * rootPlayer's eval minus the opponent's — which is genuinely a value both sides compete over
 * (board space/tempo is a shared, contested resource), making the min/max framing coherent.
 */
function relativeEval(state: GameState, rootPlayer: number, opponent: number, weights: EvalWeights): number {
  return evaluate(state, rootPlayer, weights) - evaluate(state, opponent, weights);
}

/** Minimax with alpha-beta pruning, scored as rootPlayer's relative advantage throughout. */
function alphaBeta(
  state: GameState,
  rootPlayer: number,
  opponent: number,
  depth: number,
  alpha: number,
  beta: number,
  deadline: number,
  topK: number,
  weights: EvalWeights,
  tt: Map<bigint, TTEntry>,
  hash: bigint,
): number {
  if (isGameOver(state) || depth === 0 || performance.now() > deadline) {
    return relativeEval(state, rootPlayer, opponent, weights);
  }

  const ttEntry = tt.get(hash);
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === 'exact') return ttEntry.score;
    if (ttEntry.flag === 'lower' && ttEntry.score > alpha) alpha = ttEntry.score;
    else if (ttEntry.flag === 'upper' && ttEntry.score < beta) beta = ttEntry.score;
    if (alpha >= beta) return ttEntry.score;
  }

  const mover = state.currentPlayer;
  const maximizing = mover === rootPlayer;
  const legalMoves = generateLegalMoves(state, mover, SEARCH_NODE_CHAIN_CAP);

  if (legalMoves.length === 0) {
    const next = advanceTurnWithoutMove(state);
    return alphaBeta(next, rootPlayer, opponent, depth - 1, alpha, beta, deadline, topK, weights, tt, zobristHashOf(next));
  }

  const moves = topKMoves(state, mover, legalMoves, topK, weights);
  const originalAlpha = alpha;
  let best = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    const next = applyMove(state, move);
    const nextHash = zobristUpdateForMove(hash, state, move, next);
    const score = alphaBeta(next, rootPlayer, opponent, depth - 1, alpha, beta, deadline, topK, weights, tt, nextHash);

    if (maximizing) {
      if (score > best) best = score;
      if (score > alpha) alpha = score;
    } else {
      if (score < best) best = score;
      if (score < beta) beta = score;
    }
    if (alpha >= beta) break;
  }

  const flag: TTFlag = best <= originalAlpha ? 'upper' : best >= beta ? 'lower' : 'exact';
  tt.set(hash, { depth, score: best, flag });
  return best;
}

/**
 * Iterative-deepening alpha-beta from the root: searches depth 1, 2, 3, ... until the time
 * budget is spent, returning the best move found at the deepest fully-completed depth.
 */
export function searchBestMoveAlphaBeta(
  state: GameState,
  player: number,
  options: SearchOptions,
  rootMoveOverride?: readonly Move[],
): SearchResult {
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const deadline = performance.now() + options.timeBudgetMs;
  const tt = new Map<bigint, TTEntry>();
  const rootHash = zobristHashOf(state);
  const maxDepth = Math.min(options.maxDepth ?? MAX_SEARCH_DEPTH, MAX_SEARCH_DEPTH);
  const opponent = player === 0 ? 1 : 0; // this function is only ever called for 2-player games

  const allMoves = rootMoveOverride ?? generateLegalMoves(state, player);
  if (allMoves.length === 0) {
    throw new Error('searchBestMoveAlphaBeta called with no legal moves for the given player');
  }

  let bestMove = allMoves[0]!;
  let bestScore = -Infinity;
  let depthReached = 0;

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (performance.now() > deadline) break;

    const rootMoves = topKMoves(state, player, allMoves, options.topK, weights);
    let localBestMove = rootMoves[0]!;
    let localBestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;
    let completed = true;

    for (const move of rootMoves) {
      if (performance.now() > deadline) {
        completed = false;
        break;
      }
      const next = applyMove(state, move);
      const nextHash = zobristUpdateForMove(rootHash, state, move, next);
      const score = alphaBeta(next, player, opponent, depth - 1, alpha, beta, deadline, options.topK, weights, tt, nextHash);

      if (score > localBestScore) {
        localBestScore = score;
        localBestMove = move;
      }
      if (score > alpha) alpha = score;
    }

    if (completed) {
      bestMove = localBestMove;
      bestScore = localBestScore;
      depthReached = depth;
    } else if (depthReached === 0) {
      // Didn't even finish depth 1 — still return the best partial answer found.
      bestMove = localBestMove;
      bestScore = localBestScore;
      break;
    } else {
      break;
    }
  }

  return { move: bestMove, evalScore: bestScore, depthReached };
}

// --- Part B: 3+ player max^n (SPEC.md §3.2) ---

/** Per-player evaluation vector at a leaf/cutoff node. */
export type ScoreVector = readonly number[];

/**
 * max^n: every player maximizes their own score (no adversarial minimizing). Each node
 * propagates the FULL vector of the child chosen by the mover (highest in the mover's own
 * coordinate), so ancestors can still read every other player's component. Fixed depth of 2
 * per SPEC §3.2 — max^n's branching cost multiplies across every seated player, so tiers vary
 * strength via top-K breadth, noise, and time budget rather than search depth (see
 * DECISIONS.md).
 */
function maxN(
  state: GameState,
  playerCount: number,
  depth: number,
  deadline: number,
  topK: number,
  weights: EvalWeights,
): ScoreVector {
  if (isGameOver(state) || depth === 0 || performance.now() > deadline) {
    return Array.from({ length: playerCount }, (_, p) => evaluate(state, p, weights));
  }

  const mover = state.currentPlayer;
  const legalMoves = generateLegalMoves(state, mover, SEARCH_NODE_CHAIN_CAP);

  if (legalMoves.length === 0) {
    const next = advanceTurnWithoutMove(state);
    return maxN(next, playerCount, depth - 1, deadline, topK, weights);
  }

  const moves = topKMoves(state, mover, legalMoves, topK, weights);
  let bestVector: ScoreVector = Array.from({ length: playerCount }, () => -Infinity);

  for (const move of moves) {
    const next = applyMove(state, move);
    const vector = maxN(next, playerCount, depth - 1, deadline, topK, weights);
    if (vector[mover]! > bestVector[mover]!) {
      bestVector = vector;
    }
  }

  return bestVector;
}

export const MAX_N_DEPTH = 2;

export function searchBestMoveMaxN(
  state: GameState,
  player: number,
  playerCount: number,
  options: SearchOptions,
  rootMoveOverride?: readonly Move[],
): SearchResult {
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const deadline = performance.now() + options.timeBudgetMs;

  const allMoves = rootMoveOverride ?? generateLegalMoves(state, player);
  if (allMoves.length === 0) {
    throw new Error('searchBestMoveMaxN called with no legal moves for the given player');
  }

  const moves = topKMoves(state, player, allMoves, options.topK, weights);
  let bestMove = moves[0]!;
  let bestScore = -Infinity;

  for (const move of moves) {
    if (performance.now() > deadline) break;
    const next = applyMove(state, move);
    const vector = maxN(next, playerCount, MAX_N_DEPTH - 1, deadline, options.topK, weights);
    const score = vector[player]!;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return { move: bestMove, evalScore: bestScore, depthReached: MAX_N_DEPTH };
}
