import { findPuzzle, type Puzzle, type PuzzleAttempt } from '../progression/puzzles';
export const PUBLIC_PUZZLE_BASE = 'https://nipunnair.github.io/starleap/';
export function parsePuzzleLink(hash: string): { id: string } | null | 'invalid' {
  if (!hash || hash === '#') return null;
  const match = /^#puzzle=([a-z-]{1,40})&v=1$/.exec(hash);
  return match && findPuzzle(match[1]!) ? { id: match[1]! } : 'invalid';
}
export function puzzleLink(puzzle: Puzzle, href: string): string {
  const location = new URL(href);
  const base = location.protocol === 'file:' ? new URL(PUBLIC_PUZZLE_BASE) : location;
  base.search = ''; base.hash = `puzzle=${puzzle.id}&v=${puzzle.version}`;
  return base.href;
}
export function challengeText(puzzle: Puzzle, attempt: PuzzleAttempt, href: string): string {
  return `${puzzle.title}: ${attempt.moves} moves, target ${puzzle.targetMoves}. ${attempt.undoUsed ? 'Practice with undo' : 'No undo'}. Friendly, unverified challenge. Can you reach the marker? ${puzzleLink(puzzle, href)}`;
}
export async function shareChallenge(text: string): Promise<string> {
  try {
    if (typeof navigator.share === 'function') { await navigator.share({ title: 'STARLEAP puzzle', text }); return 'Shared'; }
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return 'Copied challenge'; }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'Sharing cancelled';
    return 'Sharing unavailable. Select and copy the challenge below.';
  }
  return 'Select and copy the challenge below.';
}
