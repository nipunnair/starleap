import { PUZZLES, type Puzzle } from '../progression/puzzles';
import { readPuzzleAwards, type PuzzleRecord } from './puzzleStore';

const SECTIONS: { title: string; blurb: string; match: (p: Puzzle) => boolean }[] = [
  { title: 'Warm-ups', blurb: 'Short lessons in chains and leaps.', match: p => p.tier === undefined },
  { title: 'Easy', blurb: 'Five-move routes. Plan before you leap.', match: p => p.tier === 'easy' },
  { title: 'Medium', blurb: 'The tempting path is a trap.', match: p => p.tier === 'medium' },
  { title: 'Hard', blurb: 'Seven or more moves. Build a ladder, then ride it.', match: p => p.tier === 'hard' },
];

export function PuzzlePicker({ onChoose, onBack }: { onChoose: (id: string) => void; onBack: () => void }) {
  let awards: Record<string, PuzzleRecord> = {}, unavailable = false;
  try { awards = readPuzzleAwards(); } catch { unavailable = true; }
  return <main data-testid="puzzle-picker"><h1>Puzzles</h1><p>One movable peg. No timer. Match the fewest-move solution for a ★.</p>
    {unavailable && <p role="status">Saved puzzle medals are unavailable. You can still play.</p>}
    {SECTIONS.map(section => {
      const items = PUZZLES.filter(section.match);
      const done = items.filter(p => awards[p.id]).length;
      return <section key={section.title} aria-label={section.title}><h2>{section.title} · {done}/{items.length}</h2><p>{section.blurb}</p>
        <ul className="puzzle-list">{items.map(p => <li key={p.id}><button className="btn btn-secondary" onClick={() => onChoose(p.id)}>{p.title}</button> · Target {p.targetMoves}
          <p>{p.tier ? '' : p.lesson} {awards[p.id] && `Medal earned · Best ${awards[p.id]!.bestMoves} moves${awards[p.id]!.efficiency ? ' · Efficiency star' : ''}`}</p></li>)}</ul></section>;
    })}
    <button className="btn btn-secondary" onClick={onBack}>Back to menu</button></main>;
}
