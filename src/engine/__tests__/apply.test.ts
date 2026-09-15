import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createInitialState, type PlayerCount } from '../state';
import { generateLegalMoves } from '../moves';
import { applyMove } from '../apply';
import { onBoard, key } from '../coords';
import { cornerOf } from '../board';

function noTwoPegsShareACell(pegs: readonly { cell: { x: number; y: number; z: number } }[]): boolean {
  const seen = new Set<string>();
  for (const p of pegs) {
    const k = key(p.cell);
    if (seen.has(k)) return false;
    seen.add(k);
  }
  return true;
}

describe('applyMove (SPEC.md §2.5-2.7)', () => {
  it('advances currentPlayer and never mutates the input state', () => {
    const state = createInitialState(2);
    const [move] = generateLegalMoves(state, 0);
    expect(move).toBeDefined();

    const before = JSON.stringify(state);
    const next = applyMove(state, move!);

    expect(JSON.stringify(state)).toBe(before); // input untouched
    expect(next.currentPlayer).toBe(1);
    expect(next).not.toBe(state);
  });

  it('increments round only after the last seated player moves', () => {
    let state = createInitialState(3);
    expect(state.round).toBe(0);

    for (let i = 0; i < 2; i++) {
      const [move] = generateLegalMoves(state, state.currentPlayer);
      state = applyMove(state, move!);
      expect(state.round).toBe(0);
    }
    const [lastMove] = generateLegalMoves(state, state.currentPlayer);
    state = applyMove(state, lastMove!);
    expect(state.round).toBe(1);
  });

  it('sets hasLeftStart the first time a peg lands outside its own start corner', () => {
    const state = createInitialState(2);
    const seat = state.seats[0]!;
    const peg = state.pegs.find((p) => p.owner === seat.player)!;
    const moves = generateLegalMoves(state, seat.player).filter((m) => m.pegId === peg.id);
    expect(moves.length).toBeGreaterThan(0);

    const next = applyMove(state, moves[0]!);
    const movedPeg = next.pegs.find((p) => p.id === peg.id)!;
    // The initial corner is dense, so a step move usually stays inside the start corner —
    // hasLeftStart should only flip once the destination is actually outside it.
    const leftStart = cornerOf(movedPeg.cell) !== seat.startCorner;
    expect(movedPeg.hasLeftStart).toBe(leftStart);
  });

  it('property: applying any generated legal move never produces an off-board or overlapping position', () => {
    const counts: PlayerCount[] = [2, 3, 4, 6];

    fc.assert(
      fc.property(fc.constantFrom(...counts), fc.nat({ max: 20 }), (playerCount, steps) => {
        let state = createInitialState(playerCount);
        for (let i = 0; i < steps; i++) {
          const moves = generateLegalMoves(state, state.currentPlayer);
          if (moves.length === 0) break;
          const move = moves[i % moves.length]!;
          state = applyMove(state, move);

          for (const peg of state.pegs) {
            expect(onBoard(peg.cell)).toBe(true);
          }
          expect(noTwoPegsShareACell(state.pegs)).toBe(true);
        }
      }),
      { numRuns: 50 },
    );
  });
});
