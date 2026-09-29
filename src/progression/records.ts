/** Pure local awards. No clocks, browser APIs or unbounded match history. */
import { isGameOver } from '../engine/terminal';
import type { GameState } from '../engine/state';
import { recordEligibility, type RivalTier, type SessionStats } from './sessionStats';

export const RIVALS: readonly RivalTier[] = ['Nova', 'Vega', 'Rigel', 'Sirius'];
export const MAX_RECEIPTS = 128;
export const MAX_COMPARISONS = 128;
export interface PersonalRecord {
  readonly comparisonKey: string;
  readonly bestWinMoves: number | null;
  readonly bestChain: number;
}
export interface Awards {
  readonly bestWinMoves: boolean;
  readonly bestChain: boolean;
  readonly badge: RivalTier | null;
}
export interface OutcomeReceipt {
  readonly sessionId: string;
  readonly startedAt: number;
  readonly awards: Awards;
}
export interface ProgressRecords {
  readonly version: 1;
  readonly records: readonly PersonalRecord[];
  readonly badges: readonly RivalTier[];
  readonly receipts: readonly OutcomeReceipt[];
  /** Sessions at/before this start time can never earn again after receipt compaction. */
  readonly retiredThrough: number;
}
export const emptyProgress = (): ProgressRecords => ({
  version: 1, records: [], badges: [], receipts: [], retiredThrough: -1,
});
export interface RecordResult {
  readonly progress: ProgressRecords;
  readonly status: 'processed' | 'duplicate' | 'stale' | 'capacity' | 'ignored';
  readonly receipt: OutcomeReceipt | null;
}
const noAwards = (): Awards => ({ bestWinMoves: false, bestChain: false, badge: null });

export function recordOutcome(
  progress: ProgressRecords, stats: SessionStats, game: GameState,
  lifecycle: 'active' | 'completed' | 'abandoned' = 'completed',
): RecordResult {
  if (lifecycle !== 'completed' || !isGameOver(game)) return { progress, status: 'ignored', receipt: null };
  const sessionId = stats.context.sessionId;
  const existing = progress.receipts.find(r => r.sessionId === sessionId);
  if (existing) return { progress, status: 'duplicate', receipt: existing };
  const startedAt = stats.context.startedAt ?? 0;
  if (startedAt <= progress.retiredThrough) return { progress, status: 'stale', receipt: null };
  const eligible = recordEligibility(stats, game, lifecycle);
  let records = progress.records;
  let badges = progress.badges;
  let awards = noAwards();
  if (eligible.eligible) {
    const previous = records.find(r => r.comparisonKey === eligible.comparisonKey);
    if (!previous && records.length >= MAX_COMPARISONS) {
      // Never silently erase old personal bests to make space for new rules versions.
      return { progress, status: 'capacity', receipt: null };
    }
    const human = stats.seats[eligible.humanPlayer]!;
    const bestWinMoves = eligible.efficiencyEligible && human.moves > 0 &&
      (previous?.bestWinMoves == null || human.moves < previous.bestWinMoves);
    const bestChain = human.longestChain > (previous?.bestChain ?? 0);
    const badge = eligible.won && !badges.includes(eligible.opponentTier) ? eligible.opponentTier : null;
    awards = { bestWinMoves, bestChain, badge };
    const record: PersonalRecord = {
      comparisonKey: eligible.comparisonKey,
      bestWinMoves: bestWinMoves ? human.moves : previous?.bestWinMoves ?? null,
      bestChain: bestChain ? human.longestChain : previous?.bestChain ?? 0,
    };
    records = [...records.filter(r => r.comparisonKey !== record.comparisonKey), record];
    if (badge) badges = RIVALS.filter(tier => tier === badge || badges.includes(tier));
  }
  const receipt: OutcomeReceipt = { sessionId, startedAt, awards };
  const receipts = [...progress.receipts, receipt];
  let retiredThrough = progress.retiredThrough;
  if (receipts.length > MAX_RECEIPTS) {
    retiredThrough = Math.max(retiredThrough, receipts.shift()!.startedAt);
  }
  return { status: 'processed', receipt, progress: { version: 1, records, badges, receipts, retiredThrough } };
}
