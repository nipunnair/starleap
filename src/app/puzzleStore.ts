import { applyPuzzleMove, findPuzzle, puzzleAward, startPuzzle, undoPuzzle, type PuzzleAttempt } from '../progression/puzzles';
import type { Move } from '../engine/moves';
export type PuzzleAction = { type: 'move'; move: Move } | { type: 'undo' };
export interface PuzzleSave { version: 1; kind: 'puzzle'; sessionId: string; puzzleId: string; actions: PuzzleAction[] }
export interface LoadedPuzzle { save: PuzzleSave; attempt: PuzzleAttempt }
const KEY = 'starleap.save.v2';
const AWARDS = 'starleap.puzzle-awards.v1';
export interface PuzzleRecord { bestMoves: number; efficiency: boolean }
export function replayPuzzle(save: PuzzleSave): PuzzleAttempt {
  if (save?.kind !== 'puzzle' || save.version !== 1 || typeof save.sessionId !== 'string' || !save.sessionId ||
      !Array.isArray(save.actions) || save.actions.length > 2000) throw new Error('Unknown puzzle save');
  const puzzle = findPuzzle(save.puzzleId, save.version);
  if (!puzzle) throw new Error('Unknown puzzle version');
  let attempt = startPuzzle(puzzle);
  for (const action of save.actions) {
    if (action.type === 'move') attempt = applyPuzzleMove(puzzle, attempt, action.move);
    else if (action.type === 'undo' && attempt.previous) attempt = undoPuzzle(attempt);
    else throw new Error('Invalid puzzle history');
  }
  return attempt;
}
export function loadPuzzle(): LoadedPuzzle | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || raw.length > 500000) return null;
    const save = JSON.parse(raw) as PuzzleSave;
    return { save, attempt: replayPuzzle(save) };
  } catch { return null; }
}
export function hasActiveSave(): boolean {
  try { return !!(localStorage.getItem(KEY) || localStorage.getItem('starleap.save.v1')); } catch { return false; }
}
export function newPuzzleSave(id: string): LoadedPuzzle {
  const save: PuzzleSave = { version: 1, kind: 'puzzle', sessionId: crypto.randomUUID(), puzzleId: id, actions: [] };
  return { save, attempt: replayPuzzle(save) };
}
export function readPuzzleAwards(): Record<string, PuzzleRecord> {
  const raw = localStorage.getItem(AWARDS);
  if (!raw) return {};
  if (raw.length > 500000) throw new Error('Oversized awards');
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.version !== 1 || typeof parsed.records !== 'object' || !parsed.records || Array.isArray(parsed.records)) throw new Error('Unreadable awards');
  for (const [id, value] of Object.entries(parsed.records)) {
    const r = value as PuzzleRecord;
    if (!findPuzzle(id) || !r || !Number.isSafeInteger(r.bestMoves) || r.bestMoves < 1 || typeof r.efficiency !== 'boolean') throw new Error('Invalid award');
  }
  return parsed.records;
}
/** Save replayable attempt before awarding. Monotonic best/medal merge is idempotent. */
export function persistPuzzle(model: LoadedPuzzle): boolean {
  try {
    const attempt = replayPuzzle(model.save);
    localStorage.setItem(KEY, JSON.stringify(model.save));
    localStorage.removeItem('starleap.save.v1');
    const puzzle = findPuzzle(model.save.puzzleId)!;
    const award = puzzleAward(puzzle, attempt);
    if (award !== 'none') {
      const records = readPuzzleAwards();
      const previous = records[puzzle.id];
      records[puzzle.id] = { bestMoves: Math.min(previous?.bestMoves ?? Infinity, attempt.moves),
        efficiency: !!previous?.efficiency || award === 'efficiency' };
      localStorage.setItem(AWARDS, JSON.stringify({ version: 1, records }));
    }
    return true;
  } catch { return false; }
}
