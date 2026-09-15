import { describe, expect, it } from 'vitest';
import { BOARD, CORNER_IDS, cornerOf, rotateBoardCells } from '../board';
import { key } from '../coords';

describe('board construction (SPEC.md §1)', () => {
  it('has exactly 121 cells', () => {
    expect(BOARD.cells.length).toBe(121);
  });

  it('has a 61-cell central hexagon', () => {
    expect(BOARD.hexagon.length).toBe(61);
  });

  it('has six corners of exactly 10 cells each', () => {
    expect(CORNER_IDS.length).toBe(6);
    for (const id of CORNER_IDS) {
      expect(BOARD.corners[id].length).toBe(10);
    }
  });

  it('partitions cleanly: hexagon + all corners = all cells, no overlap', () => {
    const total = BOARD.hexagon.length + CORNER_IDS.reduce((sum, id) => sum + BOARD.corners[id].length, 0);
    expect(total).toBe(BOARD.cells.length);

    const seen = new Set<string>();
    for (const c of BOARD.cells) {
      const k = key(c);
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
  });

  it('every cell has exactly one classification (hexagon xor exactly one corner)', () => {
    for (const c of BOARD.cells) {
      const corner = cornerOf(c);
      const outOfRangeCoords = [c.x, c.y, c.z].filter((v) => v >= 5 || v <= -5).length;
      if (corner === null) {
        expect(outOfRangeCoords).toBe(0);
      } else {
        expect(outOfRangeCoords).toBe(1);
      }
    }
  });

  it('cell set is invariant under the 60° rotation (x,y,z) -> (-z,-x,-y)', () => {
    const originalKeys = new Set(BOARD.cells.map(key));
    const rotated = rotateBoardCells(BOARD.cells);
    const rotatedKeys = new Set(rotated.map(key));

    expect(rotatedKeys.size).toBe(originalKeys.size);
    for (const k of rotatedKeys) {
      expect(originalKeys.has(k)).toBe(true);
    }
    for (const k of originalKeys) {
      expect(rotatedKeys.has(k)).toBe(true);
    }
  });

  it('rotating four times returns to the original set (60° x 4 != identity, but stays on-board)', () => {
    let cells = BOARD.cells;
    for (let i = 0; i < 6; i++) {
      cells = rotateBoardCells(cells);
    }
    // six 60° rotations = full 360° = identity
    const originalKeys = new Set(BOARD.cells.map(key));
    const finalKeys = new Set(cells.map(key));
    expect(finalKeys).toEqual(originalKeys);
  });
});
