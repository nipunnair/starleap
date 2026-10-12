import { describe, it, expect } from 'vitest';
import { PUZZLES, LESSONS } from '../puzzles';
import { CHALLENGE_PUZZLES } from '../puzzlesChallenge';
import { analyzePuzzle } from '../puzzleSolver';

describe('exact puzzle solver', () => {
  it.each(PUZZLES)('$id: stated target equals the proven optimum', puzzle => {
    expect(analyzePuzzle(puzzle).optimum).toBe(puzzle.targetMoves);
  });
  it.each(CHALLENGE_PUZZLES)('$id is a real puzzle, not a tutorial', puzzle => {
    const a = analyzePuzzle(puzzle);
    const min = { easy: 5, medium: 6, hard: 7 }[puzzle.tier!];
    expect(a.optimum).toBeGreaterThanOrEqual(min);
    expect(a.optimalRoutes).toBeLessThanOrEqual(3);
    expect(a.firstMoveCount).toBeGreaterThanOrEqual(3);
    expect(a.greedyMoves === null || a.greedyMoves > a.optimum!).toBe(true);
  });
  it('keeps lessons separate from challenge puzzles', () => {
    expect(LESSONS.every(p => p.tier === undefined)).toBe(true);
    expect(CHALLENGE_PUZZLES.every(p => p.tier !== undefined)).toBe(true);
  });
});
