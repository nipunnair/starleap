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
