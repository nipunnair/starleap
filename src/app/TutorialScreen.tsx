import { useEffect, useState } from 'react';
import { useGameEngine } from '../ui/hooks/useGameEngine';
import { Board } from '../ui/components/Board';
import { key } from '../engine/coords';
import { SEATING_PLANS, type GameState } from '../engine/state';
import { OPPOSITE_CORNER } from '../engine/board';
import { findPuzzle, startPuzzle } from '../progression/puzzles';
import { StarfieldHero } from './StarfieldHero';

export interface TutorialScreenProps {
  readonly onFinish: () => void;
}

function buildSeats() {
  return SEATING_PLANS[2].map((startCorner, player) => ({
    player,
    startCorner,
    targetCorner: OPPOSITE_CORNER[startCorner],
  }));
}

/** A single peg with one empty neighbor — teaches the basic STEP. */
function buildStepScenario(): GameState {
  return {
    playerCount: 2,
    seats: buildSeats(),
    pegs: [{ id: 'tutorial-peg', owner: 0, cell: { x: 0, y: 0, z: 0 }, hasLeftStart: true }],
    currentPlayer: 0,
    round: 0,
    cordonNeutralCorners: true,
  };
}

/**
 * A genuine long jump (span n=2, not just the classic adjacent-peg case) — teaches STARLEAP's
 * distinctive mechanic: the pivot peg doesn't have to be right next to you. Direction (1,-1,0),
 * mover at origin, pivot at (2,-2,0) with the approach gap at (1,-1,0) empty, landing at
 * (4,-4,0) with the departure gap at (3,-3,0) empty — all within the central hexagon, so
 * residency never restricts it.
 */
function buildLongJumpScenario(): GameState {
  return {
    playerCount: 2,
    seats: buildSeats(),
    pegs: [
      { id: 'tutorial-peg', owner: 0, cell: { x: 0, y: 0, z: 0 }, hasLeftStart: true },
      { id: 'tutorial-pivot', owner: 1, cell: { x: 2, y: -2, z: 0 }, hasLeftStart: true },
    ],
    currentPlayer: 0,
    round: 0,
    cordonNeutralCorners: true,
  };
}

type Stage = 'step' | 'longJump' | 'chain' | 'home' | 'done';
function buildPuzzleScenario(id: string, home = false): GameState {
  const game = startPuzzle(findPuzzle(id)!).game;
  return { ...game, pegs: game.pegs.map((peg, i) => i === 0
    ? { ...peg, id: 'tutorial-peg', ...(home ? { cell: { x: -3, y: 1, z: 2 } } : {}) } : peg) };
}
const GOALS = { step: { x: 1, y: -1, z: 0 }, longJump: { x: 4, y: -4, z: 0 },
  chain: { x: 4, y: -4, z: 0 }, home: { x: -5, y: 3, z: 2 } };
const INSTRUCTIONS = {
  step: 'Click your peg, then the starred neighboring cell to make a step.',
  longJump: 'Now try a long jump to the star. The pivot is two cells away; leave equal space on both sides.',
  chain: 'Make a two-hop chain to the star. An entire chain counts as one move. Choose the final landing cell.',
  home: 'Land on the star in your target corner. In a full game, bring all ten pegs home to the opposite corner to win.',
};

export function TutorialScreen({ onFinish }: TutorialScreenProps) {
  const [feedback, setFeedback] = useState('');
  const [stage, setStage] = useState<Stage>('step');
  const engine = useGameEngine(2, buildStepScenario());
  const [previewMove, setPreviewMove] = useState<Parameters<typeof Board>[0]['previewMove']>(null);

  // useReducer's lazy initializer only runs once on mount — switching stages needs an explicit
  // reset via loadState, not just passing a new initial state through (which useGameEngine would
  // silently ignore on a re-render). Found via a failing E2E test, not by inspection alone.
  useEffect(() => {
    if (stage === 'longJump') engine.loadState(buildLongJumpScenario());
    if (stage === 'chain') engine.loadState(buildPuzzleScenario('first-chain'));
    if (stage === 'home') engine.loadState(buildPuzzleScenario('home-stretch', true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function handleCellClick(cellKey: string) {
    const destinationMove = engine.legalMoves.find((m) => key(m.to) === cellKey);
    if (engine.selectedPegId && destinationMove) {
      if (stage === 'done') return;
      const objectiveMet = key(destinationMove.to) === key(GOALS[stage]) &&
        (stage !== 'chain' || (destinationMove.type === 'jump' && destinationMove.hops.length >= 2)) &&
        (stage !== 'longJump' || (destinationMove.type === 'jump' && destinationMove.hops[0]!.span === 2));
      if (!objectiveMet) { setFeedback('That move is legal. For this lesson, reach the star using the stated move.'); return; }
      setFeedback('');
      engine.applyMove(destinationMove, true);
      setPreviewMove(null);
      setStage(stage === 'step' ? 'longJump' : stage === 'longJump' ? 'chain' : stage === 'chain' ? 'home' : 'done');
      return;
    }
    const pegHere = engine.game.pegs.find((p) => key(p.cell) === cellKey);
    if (pegHere && pegHere.owner === engine.game.currentPlayer) {
      engine.select(pegHere.id);
    } else {
      engine.deselect();
    }
  }

  if (stage === 'done') {
    return (
      <main data-testid="tutorial-screen">
        <StarfieldHero />
        <h1>Tutorial complete</h1>
        <p>You've made a step, a long jump, a chain and a home landing. Bring all ten pegs home to win.</p>
        <button className="btn btn-primary" onClick={onFinish}>
          Done
        </button>
      </main>
    );
  }

  return (
    <main data-testid="tutorial-screen">
      <StarfieldHero />
      <h1>Tutorial</h1>
      <p data-testid="tutorial-instruction">
        {INSTRUCTIONS[stage]}
      </p>
      <p role="status">{feedback}</p>
      <Board
        goalCell={GOALS[stage]}
        game={engine.game}
        selectedPegId={engine.selectedPegId}
        legalMoves={engine.legalMoves}
        previewMove={previewMove}
        onCellClick={handleCellClick}
        onDestinationHover={setPreviewMove}
      />
      <button className="btn btn-secondary" onClick={onFinish}>
        Skip tutorial
      </button>
    </main>
  );
}
