import { describe, it, expect } from 'vitest';
import { equals, key } from '../../engine/coords';
import { cornerOf } from '../../engine/board';
import { PUZZLES, LESSONS, startPuzzle, puzzleMoves, applyPuzzleMove, puzzleComplete, puzzleAward, undoPuzzle, findPuzzle } from '../puzzles';

describe('versioned puzzles (5 lessons + challenge tiers)', () => {
  it.each(PUZZLES)('$title has an engine-legal reference within its target', puzzle => {
    let a = startPuzzle(puzzle);
    expect(puzzleComplete(puzzle, a)).toBe(false);
    expect(puzzle.targetMoves).toBeGreaterThanOrEqual(1); expect(puzzle.targetMoves).toBeLessThanOrEqual(puzzle.tier ? 12 : 4);
    const pivots = a.game.pegs.slice(1);
    for (const destination of puzzle.reference) {
      const move = puzzleMoves(puzzle, a).find(m => equals(m.to, destination));
      expect(move).toBeDefined();
      a = applyPuzzleMove(puzzle, a, move!);
      expect(a.game.currentPlayer).toBe(0);
      expect(a.game.pegs.slice(1)).toEqual(pivots);
    }
    expect(a.moves).toBe(puzzle.reference.length);
    expect(puzzleAward(puzzle, a)).toBe('efficiency');
    expect(puzzleMoves(puzzle, a)).toEqual([]);
    if (puzzle.id === 'first-chain' || puzzle.id === 'turn-the-corner') expect(a.hops).toBe(2);
    if (puzzle.id === 'home-stretch') expect(cornerOf(puzzle.goal)).toBe(a.game.seats[0]!.targetCorner);
  });
  it('IDs are unique and unknown IDs/versions do not resolve', () => {
    expect(new Set(PUZZLES.map(p => p.id)).size).toBe(PUZZLES.length);
    expect(LESSONS).toHaveLength(5);
    expect(findPuzzle('unknown')).toBeUndefined(); expect(findPuzzle('first-chain', 2)).toBeUndefined();
  });
  it('a distant pivot creates an equal-span long hop', () => {
    const p = findPuzzle('long-leap')!;
    const move = puzzleMoves(p, startPuzzle(p)).find(m => equals(m.to, p.goal))!;
    expect(move.type).toBe('jump');
    if (move.type === 'jump') expect(move.hops[0]!.span).toBe(2);
  });
  it('accepts an alternative two-move route and completion beyond the target', () => {
    const p = PUZZLES[0]!; let a = startPuzzle(p);
    for (const destination of [{ x: 2, y: -2, z: 0 }, p.goal]) {
      a = applyPuzzleMove(p, a, puzzleMoves(p, a).find(m => equals(m.to, destination))!);
    }
    expect(a.moves).toBe(2); expect(a.hops).toBe(2);
    expect(puzzleAward(p, a)).toBe('completion');
  });
  it.each(PUZZLES)('$title handles target boundaries and undo without failing completion', p => {
    let a = startPuzzle(p);
    for (const to of p.reference) a = applyPuzzleMove(p, a, puzzleMoves(p, a).find(m => equals(m.to, to))!);
    for (const moves of [p.targetMoves - 1, p.targetMoves, p.targetMoves + 1]) {
      expect(puzzleAward(p, { ...a, moves })).toBe(moves <= p.targetMoves ? 'efficiency' : 'completion');
    }
    expect(puzzleAward(p, { ...a, undoUsed: true })).toBe('completion');
    const undone = undoPuzzle(a);
    expect(puzzleComplete(p, undone)).toBe(false); expect(undone.moves).toBe(a.moves - 1);
    expect(undone.undoUsed).toBe(true); expect(undoPuzzle(undone)).toBe(undone);
    expect(startPuzzle(p).undoUsed).toBe(false);
  });
  it('rejects illegal resting cells, stationary pivots, forged hops and mismatched puzzles', () => {
    const p = PUZZLES[0]!, a = startPuzzle(p), legal = puzzleMoves(p, a)[0]!;
    expect(() => applyPuzzleMove(p, a, { ...legal, pegId: 'pivot-0' })).toThrow();
    expect(() => applyPuzzleMove(p, a, { ...legal, to: { x: 0, y: 5, z: -5 } })).toThrow();
    expect(() => applyPuzzleMove(p, a, { type: 'jump', pegId: legal.pegId, from: legal.from, to: p.goal, hops: [] })).toThrow();
    expect(() => applyPuzzleMove(PUZZLES[1]!, a, legal)).toThrow();
    expect(puzzleComplete(PUZZLES[1]!, a)).toBe(false);
    expect(puzzleMoves(p, a).every(m => cornerOf(m.to) === null || cornerOf(m.to) === 'X-')).toBe(true);
    expect(puzzleAward(p, a)).toBe('none');
  });
  it('Build the Route requires a setup: no one-move solution exists', () => {
    const p = findPuzzle('build-the-route')!;
    expect(puzzleMoves(p, startPuzzle(p)).map(m => key(m.to))).not.toContain(key(p.goal));
  });
});
