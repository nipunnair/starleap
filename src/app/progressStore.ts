import {
  emptyProgress, recordOutcome, MAX_COMPARISONS, MAX_RECEIPTS, RIVALS,
  type ProgressRecords, type RecordResult,
} from '../progression/records';
import type { SaveEnvelope } from './persistence';
import { loadPendingResult } from './persistence';

export const PROGRESS_KEY = 'starleap.progress.v1';
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const natural = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 2000;
const rival = (v: unknown) => RIVALS.some(tier => tier === v);

function validProgress(v: unknown): v is ProgressRecords {
  if (!object(v) || v.version !== 1 || !Number.isSafeInteger(v.retiredThrough) || (v.retiredThrough as number) < -1 ||
      !Array.isArray(v.records) || v.records.length > MAX_COMPARISONS ||
      !Array.isArray(v.badges) || v.badges.length > 4 || !v.badges.every(rival) ||
      new Set(v.badges).size !== v.badges.length || !Array.isArray(v.receipts) || v.receipts.length > MAX_RECEIPTS) return false;
  const keys = new Set<string>();
  for (const r of v.records) {
    if (!object(r) || !text(r.comparisonKey) || keys.has(r.comparisonKey) ||
        !(r.bestWinMoves === null || (natural(r.bestWinMoves) && r.bestWinMoves > 0)) ||
        !natural(r.bestChain) || r.bestChain > 24) return false;
    keys.add(r.comparisonKey);
  }
  const ids = new Set<string>();
  for (const r of v.receipts) {
    if (!object(r) || !text(r.sessionId) || ids.has(r.sessionId) || !natural(r.startedAt) ||
        !object(r.awards) || typeof r.awards.bestWinMoves !== 'boolean' || typeof r.awards.bestChain !== 'boolean' ||
        !(r.awards.badge === null || rival(r.awards.badge))) return false;
    ids.add(r.sessionId);
  }
  return true;
}
export type ProgressLoad =
  | { status: 'available'; progress: ProgressRecords }
  | { status: 'unavailable' | 'corrupt'; progress: null };
export function loadProgress(): ProgressLoad {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw === null) return { status: 'available', progress: emptyProgress() };
    if (raw.length > 500_000) return { status: 'corrupt', progress: null };
    const progress: unknown = JSON.parse(raw);
    return validProgress(progress) ? { status: 'available', progress } : { status: 'corrupt', progress: null };
  } catch (error) {
    return { status: error instanceof SyntaxError ? 'corrupt' : 'unavailable', progress: null };
  }
}
export type ProgressCommit = RecordResult | { status: 'unavailable' | 'corrupt'; progress: null; receipt: null };

/** Atomic records+receipt write. No awards are claimed durable on failure. The bounded pending
 * result remains recoverable; its durable receipt is the acknowledgment, not deletion of the
 * result board. This also allows results UI to recover the original awards after reload. */
export function commitProgress(outcome: SaveEnvelope): ProgressCommit {
  const loaded = loadProgress();
  if (loaded.status !== 'available') return { ...loaded, receipt: null };
  const result = recordOutcome(loaded.progress, outcome.snapshot.stats, outcome.gameState);
  if (result.status !== 'processed') return result;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(result.progress));
    return result;
  } catch {
    return { status: 'unavailable', progress: null, receipt: null };
  }
}
export function processPendingResult(): ProgressCommit | null {
  const outcome = loadPendingResult();
  return outcome ? commitProgress(outcome) : null;
}
