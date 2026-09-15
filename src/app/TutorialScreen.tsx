import { useEffect, useState } from 'react';
import { useGameEngine } from '../ui/hooks/useGameEngine';
import { Board } from '../ui/components/Board';
import { key } from '../engine/coords';
import { SEATING_PLANS, type GameState } from '../engine/state';
import { OPPOSITE_CORNER } from '../engine/board';

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
  };
}

type Stage = 'step' | 'longJump' | 'done';

export function TutorialScreen({ onFinish }: TutorialScreenProps) {
  const [stage, setStage] = useState<Stage>('step');
  const engine = useGameEngine(2, buildStepScenario());
  const [previewMove, setPreviewMove] = useState<Parameters<typeof Board>[0]['previewMove']>(null);

  // useReducer's lazy initializer only runs once on mount — switching stages needs an explicit
  // reset via loadState, not just passing a new initial state through (which useGameEngine would
  // silently ignore on a re-render). Found via a failing E2E test, not by inspection alone.
  useEffect(() => {
    if (stage === 'longJump') engine.loadState(buildLongJumpScenario());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function handleCellClick(cellKey: string) {
    const destinationMove = engine.legalMoves.find((m) => key(m.to) === cellKey);
    if (engine.selectedPegId && destinationMove) {
      engine.applyMove(destinationMove, true);
      setPreviewMove(null);
      setStage((s) => (s === 'step' ? 'longJump' : 'done'));
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
        <h1>Tutorial complete</h1>
        <p>You've made a step and a long jump. You're ready to play.</p>
        <button onClick={onFinish}>Done</button>
      </main>
    );
  }

  return (
    <main data-testid="tutorial-screen">
      <h1>Tutorial</h1>
      <p data-testid="tutorial-instruction">
        {stage === 'step'
          ? 'Click your peg, then click the highlighted cell to step into it.'
          : "Now try a long jump: click your peg, then click the far highlighted cell — you'll hop clear over the other peg, even though it's two cells away."}
      </p>
      <Board
        game={engine.game}
        selectedPegId={engine.selectedPegId}
        legalMoves={engine.legalMoves}
        previewMove={previewMove}
        onCellClick={handleCellClick}
        onDestinationHover={setPreviewMove}
      />
      <button onClick={onFinish}>Skip tutorial</button>
    </main>
  );
}
