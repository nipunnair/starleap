import { describe, expect, it } from 'vitest';
import { createInitialState, SEATING_PLANS, type PlayerCount } from '../state';
import { OPPOSITE_CORNER } from '../board';
import { key } from '../coords';

describe('createInitialState (SPEC.md §1.9)', () => {
  const counts: PlayerCount[] = [2, 3, 4, 6];

  it.each(counts)('seats exactly %i players with 10 pegs each, all in their start corner', (n) => {
    const state = createInitialState(n);
    expect(state.seats.length).toBe(n);
    expect(state.pegs.length).toBe(n * 10);

    for (const seat of state.seats) {
      expect(seat.targetCorner).toBe(OPPOSITE_CORNER[seat.startCorner]);
      const pegs = state.pegs.filter((p) => p.owner === seat.player);
      expect(pegs.length).toBe(10);
      for (const peg of pegs) {
        expect(peg.hasLeftStart).toBe(false);
      }
    }
  });

  it.each(counts)('every peg starts on a distinct cell (%i players)', (n) => {
    const state = createInitialState(n);
    const seen = new Set<string>();
    for (const peg of state.pegs) {
      const k = key(peg.cell);
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
  });

  it('every seating plan uses each corner at most once', () => {
    for (const plan of Object.values(SEATING_PLANS)) {
      expect(new Set(plan).size).toBe(plan.length);
    }
  });

  it('starts on player 0, round 0', () => {
    const state = createInitialState(4);
    expect(state.currentPlayer).toBe(0);
    expect(state.round).toBe(0);
  });
});
