import { describe, expect, it } from 'vitest';
import { applyMove } from '../../engine/apply';
import { BOARD } from '../../engine/board';
import { generateLegalMoves, type Move } from '../../engine/moves';
import { createInitialState, type GameState } from '../../engine/state';
import {
  commitSessionMove, createSessionStats, recordEligibility, RECORD_VERSIONS, undoSessionMove,
  type SessionContext, type SessionStats,
} from '../sessionStats';

function context(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    sessionId: 'match-1', mode: 'standard', playerCount: 2, controllers: ['human', 'Nova'],
    cordonNeutralCorners: true, versions: RECORD_VERSIONS, ...overrides,
  };
}

function commit(stats: SessionStats, before: GameState, move?: Move): SessionStats {
  const chosen = move ?? generateLegalMoves(before, before.currentPlayer)[0]!;
  return commitSessionMove(stats, {
    sessionId: stats.context.sessionId, sequence: stats.lastEventSequence + 1,
    before, after: applyMove(before, chosen), move: chosen,
  });
}

/** Disjoint 20-peg terminal board; opponent has vacated winner's target triangle. */
function wonBoard(winner: number): GameState {
  const game = createInitialState(2);
  const target = BOARD.corners[game.seats[winner]!.targetCorner];
  let home = 0;
  let other = 0;
  return {
    ...game,
    pegs: game.pegs.map((peg) => ({
      ...peg, hasLeftStart: true,
      cell: peg.owner === winner ? target[home++]! : BOARD.hexagon[other++]!,
    })),
  };
}

function chainBoard(): GameState {
  return {
    ...createInitialState(2),
    pegs: [
      { id: 'mover', owner: 0, cell: { x: 0, y: 0, z: 0 }, hasLeftStart: true },
      { id: 'pivot-1', owner: 1, cell: { x: 1, y: -1, z: 0 }, hasLeftStart: true },
      { id: 'pivot-2', owner: 1, cell: { x: 2, y: 0, z: -2 }, hasLeftStart: true },
    ],
  };
}

describe('committed session statistics', () => {
  it('isolates version/controller context from caller mutations', () => {
    const controllers: SessionContext['controllers'][number][] = ['human', 'Nova'];
    const versions = { ...RECORD_VERSIONS };
    const stats = createSessionStats(context({ controllers, versions }));
    controllers[0] = 'Vega'; versions.ai = 'future';
    expect(stats.context.controllers).toEqual(['human', 'Nova']);
    expect(stats.context.versions.ai).toBe(RECORD_VERSIONS.ai);
    expect(stats.seats).toEqual(Array.from({ length: 2 }, () => ({ moves: 0, longestChain: 0, longHops: 0 })));
  });

  it('attributes a human seat-1 move to its mover, not the after-state currentPlayer', () => {
    const before = { ...createInitialState(2), currentPlayer: 1 };
    const stats = commit(createSessionStats(context({ controllers: ['Nova', 'human'] })), before);
    expect(stats.seats.map((s) => s.moves)).toEqual([0, 1]);
  });

  it('keeps human and AI move counts separate across a round', () => {
    const before = createInitialState(2);
    const move = generateLegalMoves(before, 0)[0]!;
    const first = commit(createSessionStats(context()), before, move);
    const second = commit(first, applyMove(before, move));
    expect(first.seats.map((s) => s.moves)).toEqual([1, 0]);
    expect(second.seats.map((s) => s.moves)).toEqual([1, 1]);
  });

  it('counts a legal multi-hop chain as one move and only distant pivots as long hops', () => {
    const before = chainBoard();
    const move = generateLegalMoves(before, 0).find((m) =>
      m.type === 'jump' && m.hops.length === 2 && m.hops.some((h) => h.span > 1));
    expect(move).toBeDefined();
    const initial = createSessionStats(context({ mode: 'puzzle' }));
    const stats = commit(initial, before, move!);
    expect(stats.seats[0]).toEqual({ moves: 1, longestChain: 2, longHops: 1 });
    expect(stats.seats[1]).toEqual({ moves: 0, longestChain: 0, longHops: 0 });
    expect(initial.seats[0]!.moves).toBe(0);
  });

  it('restores statistics on undo, preserves the event high-water mark and sticky undo flag', () => {
    const before = chainBoard();
    const move = generateLegalMoves(before, 0).find((m) => m.type === 'jump' && m.hops.length === 2)!;
    const initial = createSessionStats(context());
    const first = commit(initial, before, move);
    const undone = undoSessionMove(first);
    expect(undone.seats).toEqual(initial.seats);
    expect(undone.lastEventSequence).toBe(1);
    expect(undone.undoUsed).toBe(true);
    expect(undoSessionMove(undone)).toBe(undone);
    const replay = commit(undone, before, move);
    expect(replay.seats).toEqual(first.seats);
    expect(replay.lastEventSequence).toBe(2);
    expect(replay.undoUsed).toBe(true);
    expect(undoSessionMove(replay).seats).toEqual(initial.seats);
    expect(undoSessionMove(initial)).toBe(initial);
  });

  it('ignores duplicate/old events after later commits, serialization and undo', () => {
    const before = createInitialState(2);
    const move = generateLegalMoves(before, 0)[0]!;
    const event = { sessionId: 'match-1', sequence: 1, before, after: applyMove(before, move), move };
    const once = commitSessionMove(createSessionStats(context()), event);
    const twice = commit(once, event.after);
    expect(commitSessionMove(twice, event)).toBe(twice);
    const resumed = JSON.parse(JSON.stringify(undoSessionMove(twice))) as SessionStats;
    expect(commitSessionMove(resumed, event)).toBe(resumed);
    expect(commitSessionMove(resumed, { ...event, sessionId: 'older-game', sequence: 3 })).toBe(resumed);
  });

  it('rejects missing events, non-commits and incorrect owner attribution', () => {
    const before = createInitialState(2);
    const move = generateLegalMoves(before, 0)[0]!;
    const stats = createSessionStats(context());
    const event = { sessionId: 'match-1', sequence: 1, before, after: applyMove(before, move), move };
    expect(() => commitSessionMove(stats, { ...event, sequence: 2 })).toThrow('Missing');
    expect(() => commitSessionMove(stats, { ...event, sequence: 0 })).toThrow('positive');
    expect(() => commitSessionMove(stats, { ...event, after: before })).toThrow('committed');
    expect(() => commitSessionMove(stats, { ...event, before: { ...before, currentPlayer: 1 } })).toThrow('owner');
  });

  it('accounts for a 4-player seat independently even though it cannot earn pilot records', () => {
    const before = { ...createInitialState(4), currentPlayer: 3 };
    const stats = commit(createSessionStats(context({ playerCount: 4, controllers: ['human', 'Nova', 'Vega', 'Sirius'] })), before);
    expect(stats.seats.map((s) => s.moves)).toEqual([0, 0, 0, 1]);
    expect(recordEligibility(stats, before, 'completed')).toEqual({ eligible: false, reason: 'not-solo-two-player' });
  });
});

describe('record eligibility', () => {
  it.each([0, 1])('recognizes a win by human seat %s', (humanPlayer) => {
    const stats = createSessionStats(context({ controllers: humanPlayer === 0 ? ['human', 'Vega'] : ['Vega', 'human'] }));
    expect(recordEligibility(stats, wonBoard(humanPlayer), 'completed')).toMatchObject({
      eligible: true, humanPlayer, opponentTier: 'Vega', won: true, efficiencyEligible: true,
    });
  });

  it('allows personal chain records on losses but never victory efficiency', () => {
    expect(recordEligibility(createSessionStats(context()), wonBoard(1), 'completed')).toMatchObject({
      eligible: true, won: false, efficiencyEligible: false,
    });
  });

  it('keeps undo wins badge-eligible while disqualifying efficiency', () => {
    const stats = undoSessionMove(commit(createSessionStats(context()), createInitialState(2)));
    expect(recordEligibility(stats, wonBoard(0), 'completed')).toMatchObject({
      eligible: true, won: true, efficiencyEligible: false,
    });
  });

  it.each(['puzzle', 'tutorial', 'debug'] as const)('excludes %s sessions', (mode) => {
    expect(recordEligibility(createSessionStats(context({ mode })), wonBoard(0), 'completed'))
      .toEqual({ eligible: false, reason: 'not-standard' });
  });

  it('never turns legacy partial history into a record through further commits', () => {
    const legacy = createSessionStats(context(), false);
    const progressed = commit(legacy, createInitialState(2));
    expect(progressed.historyComplete).toBe(false);
    expect(recordEligibility(progressed, wonBoard(0), 'completed'))
      .toEqual({ eligible: false, reason: 'incomplete-history' });
  });

  it.each([['human', 'human'], ['Nova', 'Vega']] as const)('excludes non-solo-human controllers %s/%s', (a, b) => {
    expect(recordEligibility(createSessionStats(context({ controllers: [a, b] })), wonBoard(0), 'completed'))
      .toEqual({ eligible: false, reason: 'not-solo-two-player' });
  });

  it.each(['active', 'abandoned'] as const)('does not reward a %s lifecycle even with a winning board', (lifecycle) => {
    expect(recordEligibility(createSessionStats(context()), wonBoard(0), lifecycle))
      .toEqual({ eligible: false, reason: 'not-completed' });
  });

  it('rejects unfinished positions and stalemates including the round-cap boundary', () => {
    const stats = createSessionStats(context());
    expect(recordEligibility(stats, createInitialState(2), 'completed')).toEqual({ eligible: false, reason: 'not-completed' });
    expect(recordEligibility(stats, { ...wonBoard(0), round: 150 }, 'completed')).toEqual({ eligible: false, reason: 'stalemate' });
    expect(recordEligibility(stats, { ...wonBoard(0), round: 149 }, 'completed').eligible).toBe(true);
  });

  it('rejects a resumed context whose rules differ from its board', () => {
    expect(recordEligibility(createSessionStats(context()), { ...wonBoard(0), cordonNeutralCorners: false }, 'completed'))
      .toEqual({ eligible: false, reason: 'context-mismatch' });
  });

  it('partitions records by versions/tier/rules/seat, not by session identity', () => {
    const key = (ctx: SessionContext, human = 0): string => {
      const result = recordEligibility(createSessionStats(ctx), { ...wonBoard(human), cordonNeutralCorners: ctx.cordonNeutralCorners }, 'completed');
      if (!result.eligible) throw new Error(result.reason);
      return result.comparisonKey;
    };
    const baseline = key(context());
    expect(key(context({ sessionId: 'different-match' }))).toBe(baseline);
    for (const version of ['rules', 'ai', 'records'] as const) {
      expect(key(context({ versions: { ...RECORD_VERSIONS, [version]: 'v2' } }))).not.toBe(baseline);
    }
    expect(key(context({ controllers: ['human', 'Rigel'] }))).not.toBe(baseline);
    expect(key(context({ controllers: ['Nova', 'human'] }), 1)).not.toBe(baseline);
    expect(key(context({ cordonNeutralCorners: false }))).not.toBe(baseline);
  });
});
