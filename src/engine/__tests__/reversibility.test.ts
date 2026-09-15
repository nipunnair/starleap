import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { NEIGHBOR_DIRECTIONS, add, equals, key } from '../coords';
import { legalHopsFrom } from '../moves';
import { BOARD } from '../board';

/**
 * "Reversible in principle" (IMPLEMENTATION_PLAN.md P1.12): the atomic movement primitives
 * themselves are geometrically symmetric, independent of any particular game state:
 *   - a STEP in direction d has an inverse STEP in direction -d.
 *   - a HOP of span n in direction d over a given pivot has an inverse HOP of the same span n,
 *     over the SAME pivot, in direction -d, landing back on the original cell.
 * This is checked structurally (the direction/pivot/span relationship), not as literal in-game
 * undo — a real undo would also have to account for the mover's own vacated/occupied cells.
 */
describe('reversibility in principle (SPEC.md §2.2-2.3)', () => {
  it('every neighbor direction has an opposite direction also in the direction set', () => {
    for (const d of NEIGHBOR_DIRECTIONS) {
      const opposite = { x: -d.x, y: -d.y, z: -d.z };
      expect(NEIGHBOR_DIRECTIONS.some((other) => equals(other, opposite))).toBe(true);
    }
  });

  it('every generated hop has a same-span, same-pivot, opposite-direction inverse hop', () => {
    const boardKeys = BOARD.cells.map(key);

    fc.assert(
      fc.property(
        fc.subarray(boardKeys, { minLength: 0, maxLength: 40 }),
        fc.nat({ max: BOARD.cells.length - 1 }),
        (occupiedKeys, cellIndex) => {
          const cell = BOARD.cells[cellIndex]!;
          // A cell can't simultaneously be "where the mover stands" and "occupied by
          // another peg" — exclude it so the synthetic occupancy stays a sane game state.
          const occupied = new Set(occupiedKeys.filter((k) => k !== key(cell)));

          for (const hop of legalHopsFrom(cell, occupied)) {
            const reverseDirection = { x: -hop.direction.x, y: -hop.direction.y, z: -hop.direction.z };
            const hopsFromLanding = legalHopsFrom(hop.landing, occupied);

            const inverse = hopsFromLanding.find(
              (h) =>
                h.span === hop.span &&
                equals(h.direction, reverseDirection) &&
                equals(h.pivot, hop.pivot) &&
                equals(h.landing, cell),
            );

            expect(inverse, `no inverse hop found for ${key(cell)} -> ${key(hop.landing)}`).toBeDefined();
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('sanity: the inverse-direction landing lands exactly back on the original cell', () => {
    const cell = { x: 0, y: 0, z: 0 };
    const d = NEIGHBOR_DIRECTIONS[0]!;
    const pivot = add(cell, { x: d.x, y: d.y, z: d.z });
    const occupied = new Set([key(pivot)]);

    const hops = legalHopsFrom(cell, occupied);
    expect(hops.length).toBe(1);
    const landing = hops[0]!.landing;

    const reverseDirection = { x: -d.x, y: -d.y, z: -d.z };
    const backHops = legalHopsFrom(landing, occupied);
    const back = backHops.find((h) => equals(h.direction, reverseDirection));
    expect(back).toBeDefined();
    expect(equals(back!.landing, cell)).toBe(true);
  });
});
