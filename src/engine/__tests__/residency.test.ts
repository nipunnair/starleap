import { describe, expect, it } from 'vitest';
import { createInitialState } from '../state';
import { isLegalRestingCell, generateLegalMoves } from '../moves';
import { BOARD } from '../board';
import type { Peg } from '../state';

describe('residency (SPEC.md §2.4) and anti-backward-block (§2.5)', () => {
  it('may always end a turn in the central hexagon', () => {
    const state = createInitialState(2);
    const peg = state.pegs[0]!;
    const hexCell = BOARD.hexagon[0]!;
    expect(isLegalRestingCell(state, peg, hexCell)).toBe(true);
  });

  it('may end a turn in its own target corner', () => {
    const state = createInitialState(2);
    const peg = state.pegs[0]!;
    const seat = state.seats.find((s) => s.player === peg.owner)!;
    const targetCell = BOARD.corners[seat.targetCorner][0]!;
    expect(isLegalRestingCell(state, peg, targetCell)).toBe(true);
  });

  it('may not end a turn in another seated player\'s start/target corner', () => {
    const state = createInitialState(4);
    const mover = state.pegs.find((p) => p.owner === 0)!;
    const otherSeat = state.seats.find((s) => s.player === 1)!;
    const foreignCell = BOARD.corners[otherSeat.startCorner][0]!;
    expect(isLegalRestingCell(state, mover, foreignCell)).toBe(false);
  });

  it('with fewer than six players, an unassigned corner is neutral and restable', () => {
    const state = createInitialState(2); // seats X+ and X- only; Y/Z corners are neutral
    const mover = state.pegs.find((p) => p.owner === 0)!;
    const neutralCell = BOARD.corners['Y+'][0]!;
    expect(isLegalRestingCell(state, mover, neutralCell)).toBe(true);
  });

  it('with six players, every corner is assigned — none are neutral', () => {
    const state = createInitialState(6);
    const mover = state.pegs.find((p) => p.owner === 0)!;
    const seat0 = state.seats.find((s) => s.player === 0)!;
    for (const seat of state.seats) {
      if (seat.player === 0) continue;
      const foreignCell = BOARD.corners[seat.startCorner][0]!;
      if (seat.startCorner === seat0.startCorner || seat.startCorner === seat0.targetCorner) continue;
      expect(isLegalRestingCell(state, mover, foreignCell)).toBe(false);
    }
  });

  it('a peg that has not left its start corner may rest there', () => {
    const state = createInitialState(2);
    const peg = state.pegs[0]!;
    expect(peg.hasLeftStart).toBe(false);
    expect(isLegalRestingCell(state, peg, peg.cell)).toBe(true);
  });

  it('a peg that has left its start corner may never rest there again', () => {
    const state = createInitialState(2);
    const original = state.pegs[0]!;
    const movedPeg: Peg = { ...original, hasLeftStart: true };
    expect(isLegalRestingCell(state, movedPeg, original.cell)).toBe(false);
  });

  it('generateLegalMoves never includes a move ending in a foreign corner', () => {
    const state = createInitialState(4);
    for (const player of [0, 1, 2, 3]) {
      const moves = generateLegalMoves(state, player);
      for (const move of moves) {
        const mover = state.pegs.find((p) => p.id === move.pegId)!;
        expect(isLegalRestingCell(state, mover, move.to)).toBe(true);
      }
    }
  });
});
