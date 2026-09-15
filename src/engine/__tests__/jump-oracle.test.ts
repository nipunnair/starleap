import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createInitialState } from '../state';
import { buildOccupancy, legalHopsFrom } from '../moves';
import { type Cube, add, onBoard, key, NEIGHBOR_DIRECTIONS } from '../coords';
import { BOARD } from '../board';

/**
 * Hand-written classic-rules (n=1 only) jump generator, independent of legalHopsFrom,
 * used purely as a test oracle per IMPLEMENTATION_PLAN.md P1.7. A classic short jump:
 * hop over one adjacent occupied cell into the empty cell immediately beyond it.
 */
function classicJumpsFrom(cell: Cube, occupied: ReadonlySet<string>): Cube[] {
  const landings: Cube[] = [];
  for (const d of NEIGHBOR_DIRECTIONS) {
    const pivot = add(cell, d);
    if (!onBoard(pivot) || !occupied.has(key(pivot))) continue;
    const landing = add(pivot, d);
    if (!onBoard(landing) || occupied.has(key(landing))) continue;
    landings.push(landing);
  }
  return landings;
}

function sortCells(cells: Cube[]): string[] {
  return cells.map(key).sort();
}

describe('n=1 long-jump results match the classic-rules oracle', () => {
  it('agrees on the dense initial 2P position', () => {
    const state = createInitialState(2);
    const occupied = buildOccupancy(state);

    for (const peg of state.pegs) {
      const oracle = classicJumpsFrom(peg.cell, occupied);
      const fromEngine = legalHopsFrom(peg.cell, occupied)
        .filter((h) => h.span === 1)
        .map((h) => h.landing);

      expect(sortCells(fromEngine)).toEqual(sortCells(oracle));
    }
  });

  it('agrees on the dense initial 6P position', () => {
    const state = createInitialState(6);
    const occupied = buildOccupancy(state);

    for (const peg of state.pegs) {
      const oracle = classicJumpsFrom(peg.cell, occupied);
      const fromEngine = legalHopsFrom(peg.cell, occupied)
        .filter((h) => h.span === 1)
        .map((h) => h.landing);

      expect(sortCells(fromEngine)).toEqual(sortCells(oracle));
    }
  });

  it('agrees for arbitrary random occupancy patterns (property test)', () => {
    const boardKeys = BOARD.cells.map(key);

    fc.assert(
      fc.property(
        fc.subarray(boardKeys, { minLength: 0, maxLength: 40 }),
        fc.nat({ max: BOARD.cells.length - 1 }),
        (occupiedKeys, cellIndex) => {
          const occupied = new Set(occupiedKeys);
          const cell = BOARD.cells[cellIndex]!;

          const oracle = classicJumpsFrom(cell, occupied);
          const fromEngine = legalHopsFrom(cell, occupied)
            .filter((h) => h.span === 1)
            .map((h) => h.landing);

          expect(sortCells(fromEngine)).toEqual(sortCells(oracle));
        },
      ),
      { numRuns: 200 },
    );
  });
});
