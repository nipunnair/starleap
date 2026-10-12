/** Pure puzzle adapter: normal engine legality, one movable peg, stationary pivots, no AI. */
import { applyMove } from '../engine/apply';
import { equals, key, type Cube } from '../engine/coords';
import { buildOccupancy, generateLegalMoves, generateSteps, isLegalRestingCell, legalHopsFrom, MAX_CHAIN_HOPS, type Move } from '../engine/moves';
import { CHALLENGE_PUZZLES } from './puzzlesChallenge';
import { createInitialState, type GameState } from '../engine/state';

export interface Puzzle {
  readonly id: string;
  readonly version: 1;
  /** Absent = a guided lesson. Challenge tiers have exact-BFS-proven optima. */
  readonly tier?: 'easy' | 'medium' | 'hard';
  readonly title: string;
  readonly lesson: string;
  readonly start: Cube;
  readonly pivots: readonly Cube[];
  readonly goal: Cube;
  readonly targetMoves: number;
  /** Verification only. Completion never compares the player's route with this route. */
  readonly reference: readonly Cube[];
}
export const PUZZLE_PEG_ID = 'puzzle-mover';
const cell = (x: number, y: number): Cube => ({ x, y, z: -x - y });
export const LESSONS: readonly Puzzle[] = [
  { id: 'first-chain', version: 1, title: 'First Chain', lesson: 'Reach the marker. Two hops can count as one move.',
    start: cell(0, 0), pivots: [cell(1, -1), cell(3, -3)], goal: cell(4, -4), targetMoves: 1, reference: [cell(4, -4)] },
  { id: 'long-leap', version: 1, title: 'Long Leap', lesson: 'Leap over a distant pivot with equal empty space on both sides.',
    start: cell(-2, 2), pivots: [cell(0, 0)], goal: cell(2, -2), targetMoves: 1, reference: [cell(2, -2)] },
  { id: 'turn-the-corner', version: 1, title: 'Turn the Corner', lesson: 'Change direction between hops to reach the marker.',
    start: cell(0, 0), pivots: [cell(1, -1), cell(2, -1)], goal: cell(2, 0), targetMoves: 1, reference: [cell(2, 0)] },
  { id: 'build-the-route', version: 1, title: 'Build the Route', lesson: 'Take a setup step, then use the stationary pivot.',
    start: cell(0, 0), pivots: [cell(2, -1)], goal: cell(3, -1), targetMoves: 2, reference: [cell(1, -1), cell(3, -1)] },
  { id: 'home-stretch', version: 1, title: 'Home Stretch', lesson: 'Reach the marked cell in your home corner.',
    start: cell(-2, 1), pivots: [cell(-4, 2)], goal: cell(-5, 3), targetMoves: 2, reference: [cell(-3, 1), cell(-5, 3)] },
];
export const PUZZLES: readonly Puzzle[] = [...LESSONS, ...CHALLENGE_PUZZLES];
export function findPuzzle(id: string, version = 1): Puzzle | undefined {
  return PUZZLES.find(puzzle => puzzle.id === id && puzzle.version === version);
}
export interface PuzzlePosition {
  readonly game: GameState;
  readonly moves: number;
  readonly hops: number;
}
export interface PuzzleAttempt extends PuzzlePosition {
  readonly puzzleId: string;
  readonly puzzleVersion: number;
  readonly previous: PuzzlePosition | null;
  readonly undoUsed: boolean;
}
export function startPuzzle(puzzle: Puzzle): PuzzleAttempt {
  return {
    puzzleId: puzzle.id, puzzleVersion: puzzle.version, moves: 0, hops: 0, previous: null, undoUsed: false,
    game: { ...createInitialState(2), pegs: [
      { id: PUZZLE_PEG_ID, owner: 0, cell: { ...puzzle.start }, hasLeftStart: true },
      ...puzzle.pivots.map((p, i) => ({ id: `pivot-${i}`, owner: 1, cell: { ...p }, hasLeftStart: true })),
    ] },
  };
}
function matches(puzzle: Puzzle, attempt: PuzzleAttempt): boolean {
  return attempt.puzzleId === puzzle.id && attempt.puzzleVersion === puzzle.version;
}
export function puzzleComplete(puzzle: Puzzle, attempt: PuzzleAttempt): boolean {
  const mover = attempt.game.pegs.find(p => p.id === PUZZLE_PEG_ID);
  return matches(puzzle, attempt) && !!mover && equals(mover.cell, puzzle.goal);
}
export function puzzleAward(puzzle: Puzzle, attempt: PuzzleAttempt): 'none' | 'completion' | 'efficiency' {
  if (!puzzleComplete(puzzle, attempt)) return 'none';
  return !attempt.undoUsed && attempt.moves <= puzzle.targetMoves ? 'efficiency' : 'completion';
}
export function puzzleMoves(puzzle: Puzzle, attempt: PuzzleAttempt): Move[] {
  if (!matches(puzzle, attempt) || puzzleComplete(puzzle, attempt)) return [];
  return generateLegalMoves(attempt.game, 0).filter(move => move.pegId === PUZZLE_PEG_ID);
}
/** Accept any legal hop route, including one deduplicated by the engine's destination list. */
function legalMove(game: GameState, move: Move): boolean {
  if (!move || (move.type !== 'step' && move.type !== 'jump')) return false;
  const peg = game.pegs.find(p => p.id === PUZZLE_PEG_ID);
  if (!peg || move.pegId !== peg.id || !equals(move.from, peg.cell) || !isLegalRestingCell(game, peg, move.to)) return false;
  const occupied = buildOccupancy(game);
  if (move.type === 'step') return generateSteps(peg.cell, occupied).some(to => equals(to, move.to));
  if (move.hops.length === 0 || move.hops.length > MAX_CHAIN_HOPS) return false;
  const visited = new Set([key(peg.cell)]);
  let current = peg.cell;
  for (const hop of move.hops) {
    if (visited.has(key(hop.landing)) || !legalHopsFrom(current, occupied).some(candidate =>
      candidate.span === hop.span && equals(candidate.direction, hop.direction) &&
      equals(candidate.pivot, hop.pivot) && equals(candidate.landing, hop.landing))) return false;
    visited.add(key(hop.landing)); current = hop.landing;
  }
  return equals(current, move.to);
}
export function applyPuzzleMove(puzzle: Puzzle, attempt: PuzzleAttempt, move: Move): PuzzleAttempt {
  if (!matches(puzzle, attempt) || puzzleComplete(puzzle, attempt) || !legalMove(attempt.game, move)) {
    throw new Error('Illegal puzzle move');
  }
  return { ...attempt, previous: { game: attempt.game, moves: attempt.moves, hops: attempt.hops },
    game: { ...applyMove(attempt.game, move), currentPlayer: 0 },
    moves: attempt.moves + 1, hops: attempt.hops + (move.type === 'jump' ? move.hops.length : 0),
  };
}
export function undoPuzzle(attempt: PuzzleAttempt): PuzzleAttempt {
  if (!attempt.previous) return attempt;
  return { ...attempt, ...attempt.previous, previous: null, undoUsed: true };
}
