import { PUZZLES } from '../progression/puzzles';
import { readPuzzleAwards, type PuzzleRecord } from './puzzleStore';
export function PuzzlePicker({ onChoose, onBack }: { onChoose: (id: string) => void; onBack: () => void }) {
  let awards: Record<string, PuzzleRecord> = {}, unavailable = false;
  try { awards = readPuzzleAwards(); } catch { unavailable = true; }
  return <main data-testid="puzzle-picker"><h1>Five short puzzles</h1><p>One movable peg. No timer. Reach ★ in your own way.</p>
    {unavailable && <p role="status">Saved puzzle medals are unavailable. You can still play.</p>}
    <ul>{PUZZLES.map(p => <li key={p.id}><button onClick={() => onChoose(p.id)}>{p.title}</button> · Target {p.targetMoves}
      <p>{p.lesson} {awards[p.id] && `Medal earned · Best ${awards[p.id]!.bestMoves} moves${awards[p.id]!.efficiency ? ' · Efficiency star' : ''}`}</p></li>)}</ul>
    <button onClick={onBack}>Back to menu</button></main>;
}
