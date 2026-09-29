import { describe, expect, it, beforeEach } from 'vitest';
import { saveGame, loadGame, clearSavedGame, hasSavedGame } from '../persistence';
import { createInitialState } from '../../engine/state';

describe('persistence (ARCHITECTURE.md persistence section)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a saved game', () => {
    const gameState = createInitialState(2);
    const save = { playerCount: 2 as const, seats: ['human', 'Nova'] as const, gameState, savedAt: Date.now() };
    saveGame(save);

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.playerCount).toBe(2);
    expect(loaded!.seats).toEqual(['human', 'Nova']);
    expect(loaded!.gameState.pegs.length).toBe(gameState.pegs.length);
  });

  it('hasSavedGame reflects presence/absence', () => {
    expect(hasSavedGame()).toBe(false);
    saveGame({ playerCount: 2, seats: ['human', 'Nova'], gameState: createInitialState(2), savedAt: Date.now() });
    expect(hasSavedGame()).toBe(true);
    clearSavedGame();
    expect(hasSavedGame()).toBe(false);
  });

  it('loadGame returns null for malformed stored data rather than throwing', () => {
    localStorage.setItem('starleap.save.v1', '{not valid json');
    expect(() => loadGame()).not.toThrow();
    expect(loadGame()).toBeNull();
  });

  it('loadGame returns null when nothing is saved', () => {
    expect(loadGame()).toBeNull();
  });
});

describe('validated v2 envelopes', () => {
  beforeEach(() => localStorage.clear());
  it('migrates the legacy board and rules without inventing history', () => {
    const gameState = { ...createInitialState(2), cordonNeutralCorners: undefined };
    localStorage.setItem('starleap.save.v1', JSON.stringify({ playerCount: 2, seats: ['human', 'Nova'], gameState, savedAt: 1 }));
    const saved = loadGame()!;
    expect(saved.gameState).toEqual(gameState);
    expect(saved.snapshot.stats.historyComplete).toBe(false);
    expect(saved.snapshot.stats.context.cordonNeutralCorners).toBe(false);
    saveGame(saved);
    expect(loadGame()!.snapshot.stats.context.sessionId).toBe(saved.snapshot.stats.context.sessionId);
    expect(localStorage.getItem('starleap.save.v1')).toBeNull();
  });
  it.each([
    { playerCount: 5 }, { seats: ['human', 'unknown'] }, { gameState: {} }, { savedAt: -1 },
    { version: 99 }, { snapshot: {} },
  ])('rejects invalid metadata %j', patch => {
    saveGame({ playerCount: 2, seats: ['human', 'Nova'], gameState: createInitialState(2), savedAt: 1 });
    const original = JSON.parse(localStorage.getItem('starleap.save.v2')!);
    localStorage.setItem('starleap.save.v2', JSON.stringify({ ...original, ...patch }));
    expect(loadGame()).toBeNull();
  });
  it('rejects overlapping pegs and mismatched statistics', () => {
    saveGame({ playerCount: 2, seats: ['human', 'Nova'], gameState: createInitialState(2), savedAt: 1 });
    const original = JSON.parse(localStorage.getItem('starleap.save.v2')!);
    original.snapshot.stats.context.controllers.reverse();
    localStorage.setItem('starleap.save.v2', JSON.stringify(original));
    expect(loadGame()).toBeNull();
    original.snapshot.stats.context.controllers.reverse();
    original.gameState.pegs[1].cell = original.gameState.pegs[0].cell;
    localStorage.setItem('starleap.save.v2', JSON.stringify(original));
    expect(loadGame()).toBeNull();
  });
});

it('a failed terminal write preserves the previously saved active game', async () => {
  const { vi } = await import('vitest');
  const { buildAlmostWonScenario } = await import('../debugScenarios');
  const { applyMove } = await import('../../engine/apply');
  const { generateLegalMoves } = await import('../../engine/moves');
  const { isGameOver } = await import('../../engine/terminal');
  localStorage.clear();
  const gameState = createInitialState(2);
  saveGame({ playerCount: 2, seats: ['human', 'Nova'], gameState, savedAt: 1 });
  const before = localStorage.getItem('starleap.save.v2');
  const scenario = buildAlmostWonScenario();
  const won = generateLegalMoves(scenario, scenario.currentPlayer).map(m => applyMove(scenario, m)).find(isGameOver)!;
  const saved = loadGame()!;
  const snapshot = { ...saved.snapshot, game: won, stats: { ...saved.snapshot.stats,
    context: { ...saved.snapshot.stats.context, mode: 'debug' as const } } };
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  saveGame({ ...saved, gameState: won, snapshot });
  expect(spy).toHaveBeenCalledWith('starleap.pending-result.v2', expect.any(String));
  spy.mockRestore();
  expect(localStorage.getItem('starleap.save.v2')).toBe(before);
  expect(localStorage.getItem('starleap.pending-result.v2')).toBeNull();
});
