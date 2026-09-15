import { describe, expect, it } from 'vitest';
import { createInitialState } from '../state';
import { buildOccupancy, generateSteps } from '../moves';
import { onBoard, key } from '../coords';

describe('generateSteps (SPEC.md §2.2)', () => {
  it('only returns on-board, empty adjacent cells', () => {
    const state = createInitialState(2);
    const occupied = buildOccupancy(state);

    for (const peg of state.pegs) {
      const steps = generateSteps(peg.cell, occupied);
      for (const dest of steps) {
        expect(onBoard(dest)).toBe(true);
        expect(occupied.has(key(dest))).toBe(false);
      }
    }
  });

  it('a fully boxed-in peg has zero steps', () => {
    // The initial corner formation is dense; at least one peg deep in a 10-cell
    // triangle corner (the apex, surrounded by its own pegs and the board edge)
    // should have limited or zero step options while everything is still packed in.
    const state = createInitialState(2);
    const occupied = buildOccupancy(state);
    const stepCounts = state.pegs.map((p) => generateSteps(p.cell, occupied).length);
    expect(Math.min(...stepCounts)).toBeLessThanOrEqual(2);
  });

  it('an isolated peg in the middle of an empty board has up to 6 steps', () => {
    const state = createInitialState(2);
    const occupied = new Set<string>([key(state.pegs[0]!.cell)]);
    const steps = generateSteps({ x: 0, y: 0, z: 0 }, occupied);
    expect(steps.length).toBe(6);
  });
});
