import { describe, expect, it } from 'vitest';
import { outcome } from './recordFixture';
import { createInitialState } from '../../engine/state';
import { RECORD_VERSIONS } from '../sessionStats';
import { emptyProgress, recordOutcome, MAX_RECEIPTS, MAX_COMPARISONS, RIVALS } from '../records';


const apply = (p: ReturnType<typeof emptyProgress>, o = outcome()) => recordOutcome(p, o.snapshot.stats, o.gameState);

describe('personal records and first-win badges', () => {
  it('awards genuine improvements, not ties, repeats or AI chains', () => {
    const first = apply(emptyProgress());
    expect(first.receipt!.awards).toEqual({ bestWinMoves: true, bestChain: true, badge: 'Nova' });
    expect(first.progress.records[0]).toMatchObject({ bestWinMoves: 30, bestChain: 3 });
    expect(apply(first.progress).status).toBe('duplicate');
    const tie = apply(first.progress, outcome('two'));
    expect(tie.receipt!.awards).toEqual({ bestWinMoves: false, bestChain: false, badge: null });
    const better = apply(tie.progress, outcome('three', 0, {}, 29, 4));
    expect(better.receipt!.awards).toEqual({ bestWinMoves: true, bestChain: true, badge: null });
    const worse = apply(better.progress, outcome('four', 0, {}, 40, 2));
    expect(worse.progress.records).toEqual(better.progress.records);
  });
  it('rewards human chain improvement on a loss, never win efficiency or badge', () => {
    const loss = apply(emptyProgress(), outcome('loss', 1));
    expect(loss.receipt!.awards).toEqual({ bestWinMoves: false, bestChain: true, badge: null });
    expect(loss.progress.records[0]!.bestWinMoves).toBeNull();
  });
  it('undo permits first victory badges but excludes efficiency', () => {
    const o = outcome();
    const r = recordOutcome(emptyProgress(), { ...o.snapshot.stats, undoUsed: true }, o.gameState);
    expect(r.receipt!.awards).toEqual({ bestWinMoves: false, bestChain: true, badge: 'Nova' });
  });
  it('earns exactly four badges regardless of subsequent tuning/version changes', () => {
    let p = emptyProgress();
    for (const tier of RIVALS) p = apply(p, outcome(tier, 0, { controllers: ['human', tier] })).progress;
    expect(p.badges).toEqual(RIVALS);
    const next = apply(p, outcome('updated', 0, { versions: { ...RECORD_VERSIONS, ai: 'new-ai' } }));
    expect(next.progress.records).toHaveLength(5);
    expect(next.receipt!.awards.badge).toBeNull();
  });
  it('uses the actual human seat for records', () => {
    const o = outcome('seat1', 1, { controllers: ['Nova', 'human'] });
    expect(apply(emptyProgress(), o).progress.records[0]).toMatchObject({ bestWinMoves: 20, bestChain: 8 });
  });
  it.each(['debug', 'tutorial', 'puzzle'] as const)('does not award %s outcomes', mode => {
    const r = apply(emptyProgress(), outcome(mode, 0, { mode }));
    expect(r.progress.badges).toEqual([]); expect(r.progress.records).toEqual([]);
  });
  it('excludes legacy, abandoned, unfinished, stalemate and multiplayer sessions', () => {
    const o = outcome();
    const p = emptyProgress();
    expect(recordOutcome(p, { ...o.snapshot.stats, historyComplete: false }, o.gameState).progress.records).toEqual([]);
    expect(recordOutcome(p, o.snapshot.stats, o.gameState, 'abandoned').status).toBe('ignored');
    expect(recordOutcome(p, o.snapshot.stats, createInitialState(2)).status).toBe('ignored');
    expect(recordOutcome(p, o.snapshot.stats, { ...o.gameState, round: 150 }).progress.records).toEqual([]);
    expect(apply(p, outcome('multi', 0, { controllers: ['human', 'human'] })).progress.records).toEqual([]);
  });
  it('bounds receipts while rejecting evicted old sessions even with refreshed savedAt', () => {
    let p = emptyProgress();
    const old = outcome('old', 0, { startedAt: 1 });
    p = apply(p, old).progress;
    for (let i = 0; i < MAX_RECEIPTS; i++) p = apply(p, outcome(`id-${i}`, 0, { startedAt: i + 2 })).progress;
    expect(p.receipts).toHaveLength(MAX_RECEIPTS);
    expect(p.retiredThrough).toBe(1);
    expect(apply(p, { ...old, savedAt: 99999 }).status).toBe('stale');
    expect(apply(p, outcome('legacy', 0, { startedAt: undefined })).status).toBe('stale');
    expect(apply(p, outcome('fresh', 0, { startedAt: 1000 })).status).toBe('processed');
  });
  it('never discards existing personal bests at the comparison capacity', () => {
    let p = emptyProgress();
    for (let i = 0; i < MAX_COMPARISONS; i++) p = apply(p, outcome(`v${i}`, 0, {
      startedAt: i + 1, versions: { ...RECORD_VERSIONS, ai: `ai-${i}` },
    })).progress;
    const full = apply(p, outcome('overflow', 0, { startedAt: 1000 }));
    expect(full.status).toBe('capacity'); expect(full.progress).toBe(p);
  });
});
