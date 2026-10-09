import { useEffect, useMemo, useRef, useState } from 'react';
import { PUZZLE_PEG_ID, applyPuzzleMove, findPuzzle, puzzleAward, puzzleComplete, puzzleMoves, undoPuzzle } from '../progression/puzzles';
import { key } from '../engine/coords';
import type { Move } from '../engine/moves';
import { Board } from '../ui/components/Board';
import { useReducedMotion } from '../ui/hooks/useReducedMotion';
import { createWebAudioToneSequencer, SILENT_TONE_SEQUENCER } from '../ui/audio/tones';
import type { Settings } from './settingsStore';
import { newPuzzleSave, persistPuzzle, type LoadedPuzzle } from './puzzleStore';
import { challengeText, shareChallenge } from './puzzleSharing';

export function PuzzleScreen({ initial, settings, onBack }: { initial: LoadedPuzzle; settings: Settings; onBack: () => void }) {
  const puzzle = findPuzzle(initial.save.puzzleId)!;
  const [model, setModel] = useState(initial);
  const [selected, setSelected] = useState<string | null>(PUZZLE_PEG_ID);
  const [preview, setPreview] = useState<Move | null>(null);
  const [pending, setPending] = useState<Move | null>(null);
  const pendingRef = useRef<Move | null>(null);
  const [saved, setSaved] = useState(true);
  const [sharing, setSharing] = useState('');
  const reducedMotion = useReducedMotion(settings.reducedMotion);
  const tones = useMemo(() => settings.audioEnabled && !reducedMotion ? createWebAudioToneSequencer() : SILENT_TONE_SEQUENCER, [settings.audioEnabled, reducedMotion]);
  useEffect(() => { setSaved(persistPuzzle(model)); }, [model]);
  const complete = puzzleComplete(puzzle, model.attempt);
  const moves = selected ? puzzleMoves(puzzle, model.attempt) : [];
  function click(cell: string) {
    if (pendingRef.current || complete) return;
    const move = moves.find(m => key(m.to) === cell);
    if (move) { pendingRef.current = move; setPending(move); setPreview(null); }
    else setSelected(model.attempt.game.pegs.some(p => p.id === PUZZLE_PEG_ID && key(p.cell) === cell) ? PUZZLE_PEG_ID : null);
  }
  function commit(move: Move) {
    if (pendingRef.current !== move) return;
    pendingRef.current = null; setPending(null);
    setModel(current => ({ save: { ...current.save, actions: [...current.save.actions, { type: 'move', move }] },
      attempt: applyPuzzleMove(puzzle, current.attempt, move) }));
  }
  const text = challengeText(puzzle, model.attempt, window.location.href);
  return <main data-testid="puzzle-screen">
    <h1>{puzzle.title}</h1><p>{puzzle.lesson}</p>
    <p>Move the ringed peg to ★. Other pegs stay still. A whole chain is one move.</p>
    <p data-testid="puzzle-counter" aria-live="polite">Moves {model.attempt.moves} · Target {puzzle.targetMoves} · Hops {model.attempt.hops}</p>
    {!saved && <p role="status">Progress could not be saved. You can keep playing.</p>}
    <Board game={model.attempt.game} selectedPegId={selected} legalMoves={moves} previewMove={preview}
      onCellClick={click} onDestinationHover={setPreview} showHints={settings.showMoveHints} goalCell={puzzle.goal}
      animation={pending ? { move: pending, owner: 0, reducedMotion, toneSequencer: tones, onHopLanding: () => {}, onComplete: () => commit(pending) } : null} />
    {complete && <section data-testid="puzzle-complete" aria-live="polite"><h2>Puzzle complete!</h2>
      <p>{puzzleAward(puzzle, model.attempt) === 'efficiency' ? 'Completion medal + efficiency star!' : 'Completion medal! Try again for an efficiency star at the target without undo.'}</p>
      <button className="btn btn-primary" onClick={async () => setSharing(await shareChallenge(text))}>Challenge a friend</button>
      <p role="status">{sharing}</p>
      <label className="puzzle-share-label">Challenge text<textarea readOnly value={text} onFocus={event => event.target.select()} /></label>
      <p>Your friend may need the newer published build. Records stay on this device.</p>
    </section>}
    <div className="puzzle-actions">
      <button className="btn btn-secondary" disabled={!!pending || !model.attempt.previous} onClick={() => { setPreview(null); setModel(current => ({ save: { ...current.save, actions: [...current.save.actions, { type: 'undo' }] }, attempt: undoPuzzle(current.attempt) })); }}>Undo</button>
      <button className="btn btn-secondary" disabled={!!pending} onClick={() => { setModel(newPuzzleSave(puzzle.id)); setSelected(PUZZLE_PEG_ID); setPreview(null); setSharing(''); }}>Retry</button>
      <button className="btn btn-secondary" onClick={onBack}>Back to puzzles</button>
    </div>
  </main>;
}
