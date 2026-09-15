import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createInitialState, type PlayerCount } from '../state';
import { generateLegalMoves } from '../moves';
import { applyMove } from '../apply';
import { zobristHashOf, zobristUpdateForMove } from '../zobrist';

describe('Zobrist hashing (SPEC.md §3.2)', () => {
  it('two independently constructed identical states hash identically', () => {
    const a = createInitialState(4);
    const b = createInitialState(4);
    expect(zobristHashOf(a)).toBe(zobristHashOf(b));
  });

  it('changes after a move is applied', () => {
    const state = createInitialState(2);
    const [move] = generateLegalMoves(state, 0);
    const next = applyMove(state, move!);
    expect(zobristHashOf(next)).not.toBe(zobristHashOf(state));
  });

  it('incremental update matches full recomputation after every move in a random sequence', () => {
    const counts: PlayerCount[] = [2, 3, 4, 6];

    fc.assert(
      fc.property(fc.constantFrom(...counts), fc.nat({ max: 15 }), (playerCount, steps) => {
        let state = createInitialState(playerCount);
        let hash = zobristHashOf(state);
        expect(hash).toBe(zobristHashOf(state));

        for (let i = 0; i < steps; i++) {
          const moves = generateLegalMoves(state, state.currentPlayer);
          if (moves.length === 0) break;
          const move = moves[i % moves.length]!;
          const next = applyMove(state, move);
          const incrementalHash = zobristUpdateForMove(hash, state, move, next);

          expect(incrementalHash).toBe(zobristHashOf(next));

          state = next;
          hash = incrementalHash;
        }
      }),
      { numRuns: 50 },
    );
  });
});
