import { describe, expect, it } from 'vitest';
import { createInitialState } from '../state';
import { hasWon, isStalemate, isGameOver, rank, playersFinished, STALEMATE_ROUND_CAP } from '../terminal';
import { BOARD } from '../board';
import type { GameState, Peg } from '../state';

function withPegsMovedTo(state: GameState, player: number, cells: readonly { x: number; y: number; z: number }[]): GameState {
  let i = 0;
  const pegs: Peg[] = state.pegs.map((p) => {
    if (p.owner !== player) return p;
    const cell = cells[i]!;
    i += 1;
    return { ...p, cell, hasLeftStart: true };
  });
  return { ...state, pegs };
}

describe('terminal (SPEC.md §2.6-2.7)', () => {
  it('a fresh game has no winner', () => {
    const state = createInitialState(2);
    expect(hasWon(state, 0)).toBe(false);
    expect(hasWon(state, 1)).toBe(false);
    expect(isGameOver(state)).toBe(false);
  });

  it('detects a win when all 10 pegs occupy the target corner', () => {
    const state = createInitialState(2);
    const seat0 = state.seats.find((s) => s.player === 0)!;
    const targetCells = BOARD.corners[seat0.targetCorner];
    const won = withPegsMovedTo(state, 0, targetCells);

    expect(hasWon(won, 0)).toBe(true);
    expect(hasWon(won, 1)).toBe(false);
    expect(playersFinished(won)).toEqual([0]);
  });

  it('a 2-player game ends the moment one player finishes (only one unfinished remains)', () => {
    const state = createInitialState(2);
    const seat0 = state.seats.find((s) => s.player === 0)!;
    const won = withPegsMovedTo(state, 0, BOARD.corners[seat0.targetCorner]);
    expect(isGameOver(won)).toBe(true);
  });

  it('a 4-player game does not end until only one player is unfinished', () => {
    const state = createInitialState(4);
    const seat0 = state.seats.find((s) => s.player === 0)!;
    const seat1 = state.seats.find((s) => s.player === 1)!;
    let s = withPegsMovedTo(state, 0, BOARD.corners[seat0.targetCorner]);
    expect(isGameOver(s)).toBe(false); // 3 of 4 still unfinished

    s = withPegsMovedTo(s, 1, BOARD.corners[seat1.targetCorner]);
    expect(isGameOver(s)).toBe(false); // 2 of 4 still unfinished

    const seat2 = state.seats.find((s2) => s2.player === 2)!;
    s = withPegsMovedTo(s, 2, BOARD.corners[seat2.targetCorner]);
    expect(isGameOver(s)).toBe(true); // only player 3 unfinished now
  });

  it('stalemate triggers at exactly the round cap', () => {
    const state = createInitialState(2);
    expect(isStalemate({ ...state, round: STALEMATE_ROUND_CAP - 1 })).toBe(false);
    expect(isStalemate({ ...state, round: STALEMATE_ROUND_CAP })).toBe(true);
    expect(isGameOver({ ...state, round: STALEMATE_ROUND_CAP })).toBe(true);
  });

  it('ranks by pegs-home descending, then summed distance ascending', () => {
    const state = createInitialState(2);
    const seat0 = state.seats.find((s) => s.player === 0)!;
    // Move player 0 fully home; player 1 stays at their dense start corner (far from target).
    const s = withPegsMovedTo(state, 0, BOARD.corners[seat0.targetCorner]);

    const ranking = rank(s);
    expect(ranking[0]!.player).toBe(0);
    expect(ranking[0]!.pegsHome).toBe(10);
    expect(ranking[1]!.player).toBe(1);
    expect(ranking[1]!.pegsHome).toBe(0);
  });
});
