/** Pure session accounting. Call only when the game reducer commits/undoes a legal move. */
import { equals } from '../engine/coords';
import type { Move } from '../engine/moves';
import type { GameState, PlayerCount } from '../engine/state';
import { hasWon, isGameOver, isStalemate } from '../engine/terminal';

// Deliberately no dependency on ai/: callers adapt their seat configuration structurally.
export type RivalTier = 'Nova' | 'Vega' | 'Rigel' | 'Sirius';
export type SessionController = 'human' | RivalTier;
export type SessionMode = 'standard' | 'puzzle' | 'tutorial' | 'debug';
export interface RecordVersions {
  readonly rules: string;
  readonly ai: string;
  readonly records: string;
}

/** Bump the affected identifier when rules, tier tuning, or record definitions change. */
export const RECORD_VERSIONS: RecordVersions = {
  rules: 'cordon-v1', ai: 'tiers-v1', records: 'personal-v1',
};

export interface SessionContext {
  readonly sessionId: string;
  readonly mode: SessionMode;
  readonly playerCount: PlayerCount;
  readonly controllers: readonly SessionController[];
  readonly cordonNeutralCorners: boolean;
  readonly versions: RecordVersions;
}

export interface SeatStatistics {
  readonly moves: number;
  readonly longestChain: number;
  readonly longHops: number;
}

export interface SessionStats {
  readonly schemaVersion: 1;
  readonly context: SessionContext;
  readonly seats: readonly SeatStatistics[];
  /** One-level undo matches the current game reducer; never an unbounded event log. */
  readonly previousSeats: readonly SeatStatistics[] | null;
  /** High-water mark, NOT a move count. Never rewinds on undo. Persist with the board. */
  readonly lastEventSequence: number;
  readonly undoUsed: boolean;
  /** False when a legacy/imported game's earlier move history is unavailable. */
  readonly historyComplete: boolean;
}

/** Caller supplies identity; this module has no clock, randomness or browser dependency. */
export function createSessionStats(context: SessionContext, historyComplete = true): SessionStats {
  if (!context.sessionId.trim() || context.controllers.length !== context.playerCount) {
    throw new Error('Session identity and controller count must match the game');
  }
  return {
    schemaVersion: 1,
    context: { ...context, controllers: [...context.controllers], versions: { ...context.versions } },
    seats: context.controllers.map(() => ({ moves: 0, longestChain: 0, longHops: 0 })),
    previousSeats: null,
    lastEventSequence: 0,
    undoUsed: false,
    historyComplete,
  };
}

export interface CommittedMoveEvent {
  readonly sessionId: string;
  /** Allocate once for a move intent, not once per animation callback. */
  readonly sequence: number;
  readonly before: GameState;
  readonly after: GameState;
  readonly move: Move;
}

/**
 * Legal-move validation belongs to the engine. Check attribution and actual application here,
 * without rerunning expensive chain generation. A stale callback/session cannot increment stats.
 */
export function commitSessionMove(stats: SessionStats, event: CommittedMoveEvent): SessionStats {
  if (event.sessionId !== stats.context.sessionId) return stats;
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 1) {
    throw new Error('Move sequence must be a positive safe integer');
  }
  if (event.sequence <= stats.lastEventSequence) return stats;
  if (event.sequence !== stats.lastEventSequence + 1) throw new Error('Missing committed move event');

  const { before, after, move } = event;
  const peg = before.pegs.find((p) => p.id === move.pegId);
  const moved = after.pegs.find((p) => p.id === move.pegId);
  if (!peg || !moved || peg.owner !== before.currentPlayer || moved.owner !== peg.owner ||
      before.playerCount !== stats.context.playerCount || after.playerCount !== before.playerCount ||
      !equals(peg.cell, move.from) || !equals(moved.cell, move.to) || equals(move.from, move.to)) {
    throw new Error('Statistics require a committed move from its actual owner');
  }
  const seat = stats.seats[peg.owner];
  if (!seat) throw new Error('Move owner has no session seat');
  const hops = move.type === 'jump' ? move.hops : [];
  const updated: SeatStatistics = {
    moves: seat.moves + 1,
    longestChain: Math.max(seat.longestChain, hops.length),
    longHops: seat.longHops + hops.filter((hop) => hop.span > 1).length,
  };
  return {
    ...stats,
    seats: stats.seats.map((value, owner) => owner === peg.owner ? updated : value),
    previousSeats: stats.seats,
    lastEventSequence: event.sequence,
  };
}

/** Invoke only when the game reducer actually undoes; a no-op undo changes nothing. */
export function undoSessionMove(stats: SessionStats): SessionStats {
  if (!stats.previousSeats) return stats;
  return { ...stats, seats: stats.previousSeats, previousSeats: null, undoUsed: true };
}

export type IneligibilityReason =
  | 'not-standard' | 'incomplete-history' | 'not-solo-two-player'
  | 'context-mismatch' | 'not-completed' | 'stalemate' | 'no-unique-winner';
export type RecordEligibility =
  | { readonly eligible: false; readonly reason: IneligibilityReason }
  | {
    readonly eligible: true;
    readonly humanPlayer: number;
    readonly opponentTier: RivalTier;
    readonly won: boolean;
    readonly efficiencyEligible: boolean;
    readonly comparisonKey: string;
  };

/** Completed losses can earn chain records; only wins earn badges/efficiency records. */
export function recordEligibility(
  stats: SessionStats,
  game: GameState,
  lifecycle: 'active' | 'completed' | 'abandoned',
): RecordEligibility {
  const context = stats.context;
  if (context.mode !== 'standard') return { eligible: false, reason: 'not-standard' };
  if (!stats.historyComplete) return { eligible: false, reason: 'incomplete-history' };
  if (context.playerCount !== 2 || context.controllers.length !== 2 ||
      context.controllers.filter((seat) => seat === 'human').length !== 1) {
    return { eligible: false, reason: 'not-solo-two-player' };
  }
  const humanPlayer = context.controllers.indexOf('human');
  const opponentTier = context.controllers[1 - humanPlayer];
  const humanSeat = game.seats.find((seat) => seat.player === humanPlayer);
  if (game.playerCount !== 2 || stats.seats.length !== 2 || !humanSeat ||
      game.cordonNeutralCorners !== context.cordonNeutralCorners ||
      !opponentTier || opponentTier === 'human') {
    return { eligible: false, reason: 'context-mismatch' };
  }
  if (lifecycle !== 'completed' || !isGameOver(game)) return { eligible: false, reason: 'not-completed' };
  if (isStalemate(game)) return { eligible: false, reason: 'stalemate' };
  const won = hasWon(game, humanPlayer);
  if (won === hasWon(game, 1 - humanPlayer)) return { eligible: false, reason: 'no-unique-winner' };
  return {
    eligible: true,
    humanPlayer,
    opponentTier,
    won,
    efficiencyEligible: won && !stats.undoUsed,
    // Array encoding prevents delimiter collisions; session ID intentionally does not partition records.
    comparisonKey: JSON.stringify([
      context.versions.rules, context.versions.ai, context.versions.records,
      context.mode, context.playerCount, humanPlayer, humanSeat.startCorner,
      opponentTier, context.cordonNeutralCorners,
    ]),
  };
}
