import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../engine/state';
import { CORNER_APEX } from '../../engine/board';
import { evaluate } from '../../ai/eval';

/**
 * GameScreen's `worried` trigger compares an AI's own post-move evaluate() score to its
 * previous move's score, firing when it drops by more than WORRIED_EVAL_DROP_THRESHOLD (10 —
 * a documented judgment call, SPEC.md §4.7 only says "drops sharply"). The threshold comparison
 * itself is a two-line inline check in GameScreen, not worth extracting a module for, but the
 * evaluate() score delta it depends on is worth locking in: this test confirms a real "the AI
 * lost ground" scenario (pegs moved back toward the start corner) produces a large negative
 * score delta relative to a "the AI made progress" scenario, so the threshold has a meaningful
 * signal to compare against.
 */
describe('worried trigger inputs (SPEC.md §4.7)', () => {
  it('moving pegs toward the target scores higher than the initial position', () => {
    const state = createInitialState(2);
    const seat0 = state.seats.find((s) => s.player === 0)!;
    const targetApex = CORNER_APEX[seat0.targetCorner];

    const initialScore = evaluate(state, 0);
    const advanced = {
      ...state,
      pegs: state.pegs.map((p) => (p.owner === 0 ? { ...p, cell: targetApex, hasLeftStart: true } : p)),
    };
    const advancedScore = evaluate(advanced, 0);

    expect(advancedScore).toBeGreaterThan(initialScore);
  });

  it('a regression back toward the start corner is a large negative delta from an advanced position', () => {
    const state = createInitialState(2);
    const seat0 = state.seats.find((s) => s.player === 0)!;
    const targetApex = CORNER_APEX[seat0.targetCorner];

    const advanced = {
      ...state,
      pegs: state.pegs.map((p) => (p.owner === 0 ? { ...p, cell: targetApex, hasLeftStart: true } : p)),
    };
    const advancedScore = evaluate(advanced, 0);
    const regressedScore = evaluate(state, 0); // back to the initial (start-corner) position

    const delta = regressedScore - advancedScore;
    expect(delta).toBeLessThan(-10); // comfortably past GameScreen's worried threshold
  });
});
