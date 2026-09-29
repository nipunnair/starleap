import { expect, it } from 'vitest';
import { gameReducer } from '../useGameEngine';
import { createInitialState } from '../../../engine/state';
import { generateLegalMoves } from '../../../engine/moves';
import { createSessionStats, RECORD_VERSIONS } from '../../../progression/sessionStats';

it('commits board and statistics once; stale callbacks cannot replay an undone move', () => {
  const game = createInitialState(2);
  const initial = { game, previousGame: null, canUndo: false, selectedPegId: null,
    stats: createSessionStats({ sessionId: 'test', mode: 'standard', playerCount: 2,
      controllers: ['human', 'Nova'], cordonNeutralCorners: true, versions: RECORD_VERSIONS }) };
  const move = generateLegalMoves(game, 0)[0]!;
  const event = { type: 'APPLY_MOVE' as const, move, isHuman: true, sequence: 1 };
  const committed = gameReducer(initial, event);
  expect(committed.stats!.seats[0]!.moves).toBe(1);
  expect(gameReducer(committed, event)).toBe(committed);
  const undone = gameReducer(committed, { type: 'UNDO' });
  expect(undone.game).toBe(initial.game);
  expect(undone.stats!.seats[0]!.moves).toBe(0);
  expect(undone.stats!.undoUsed).toBe(true);
  expect(gameReducer(undone, event)).toBe(undone);
  expect(gameReducer(undone, { type: 'UNDO' })).toBe(undone);
  expect(gameReducer(undone, { ...event, sequence: 2 }).stats!.seats[0]!.moves).toBe(1);
});
