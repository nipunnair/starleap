import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createInitialState } from '../state';
import { buildOccupancy, generateJumpChains, MAX_CHAIN_HOPS } from '../moves';
import type { Peg } from '../state';
import { type Cube, add, scale, key } from '../coords';
import { BOARD } from '../board';

function makePeg(cell: Cube, id = 'test-peg', owner = 0): Peg {
  return { id, owner, cell, hasLeftStart: false };
}

describe('generateJumpChains (SPEC.md §2.3)', () => {
  it('finds a multi-hop chain along a prepared ladder', () => {
    // Direction (1,-1,0) stays entirely within the central hexagon (all coords in
    // [-4,4]) from (-4,4,0) to (4,-4,0) — a full 8-step line, all on-board. Occupy
    // every odd step as a pivot so the mover can chain four span-1 hops down it.
    const dir = { x: 1, y: -1, z: 0 };
    const mover = makePeg({ x: -4, y: 4, z: 0 });
    // Build a simple contiguous ladder: pivots at n=1 steps: cells 1,3,5,7 occupied,
    // landings at 2,4,6,8 empty -> mover can hop 0->2->4->6->8 (4 hops of span 1).
    const occupied = new Set<string>();
    for (const n of [1, 3, 5, 7]) {
      occupied.add(key(add(mover.cell, scale(dir, n))));
    }

    const chains = generateJumpChains(mover, occupied);
    const finalCells = chains.map((c) => key(c.to));

    expect(finalCells).toContain(key(add(mover.cell, scale(dir, 2))));
    expect(finalCells).toContain(key(add(mover.cell, scale(dir, 8))));

    const longest = chains.reduce((best, c) => (c.hops.length > best.hops.length ? c : best));
    expect(longest.hops.length).toBe(4);
    expect(key(longest.to)).toBe(key(add(mover.cell, scale(dir, 8))));
  });

  it('a long-span hop (n>1) is found when the pivot is far away with clear gaps', () => {
    const dir = { x: 1, y: 0, z: -1 };
    const mover = makePeg({ x: -4, y: 4, z: 0 });
    const n = 3;
    const occupied = new Set<string>([key(add(mover.cell, scale(dir, n)))]);

    const chains = generateJumpChains(mover, occupied);
    const expectedLanding = key(add(mover.cell, scale(dir, 2 * n)));
    expect(chains.some((c) => key(c.to) === expectedLanding && c.hops.length === 1)).toBe(true);
  });

  it('no chain revisits a cell the mover has already stood on (property test)', () => {
    const boardKeys = BOARD.cells.map(key);

    fc.assert(
      fc.property(
        fc.subarray(boardKeys, { minLength: 0, maxLength: 50 }),
        fc.nat({ max: BOARD.cells.length - 1 }),
        (occupiedKeys, startIndex) => {
          const startCell = BOARD.cells[startIndex]!;
          const occupied = new Set(occupiedKeys.filter((k) => k !== key(startCell)));
          const mover = makePeg(startCell);

          const chains = generateJumpChains(mover, occupied);
          for (const chain of chains) {
            const stood = [key(mover.cell), ...chain.hops.map((h) => key(h.landing))];
            expect(new Set(stood).size).toBe(stood.length);
            expect(chain.hops.length).toBeLessThanOrEqual(MAX_CHAIN_HOPS);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('empty board: no pegs to pivot on means zero chains', () => {
    const mover = makePeg({ x: 0, y: 0, z: 0 });
    const chains = generateJumpChains(mover, new Set());
    expect(chains).toEqual([]);
  });

  it('dense initial position produces only finite, terminating chain sets', () => {
    const state = createInitialState(6);
    const occupied = buildOccupancy(state);
    for (const peg of state.pegs) {
      const chains = generateJumpChains(peg, occupied);
      expect(Array.isArray(chains)).toBe(true);
      for (const chain of chains) {
        expect(chain.hops.length).toBeLessThanOrEqual(MAX_CHAIN_HOPS);
      }
    }
  });
});
