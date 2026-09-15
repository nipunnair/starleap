import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import { useAIWorker } from '../hooks/useAIWorker';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { rank } from '../../engine/terminal';
import { cornerOf } from '../../engine/board';
import { key, project, type Cube } from '../../engine/coords';
import { seatOf } from '../../engine/state';
import type { PlayerCount } from '../../engine/state';
import type { Move } from '../../engine/moves';
import type { TierName } from '../../ai/tiers';
import { createWebAudioToneSequencer, SILENT_TONE_SEQUENCER } from '../audio/tones';
import { shouldShakeForMove } from '../animation/chainAnimation';
import { Board } from './Board';
import { ParticleCanvas, type ParticleCanvasHandle } from './ParticleCanvas';
import { CELL_SPACING } from './boardGeometry';

export type SeatConfig = 'human' | TierName;

export interface GameScreenProps {
  readonly playerCount: PlayerCount;
  readonly seats: readonly SeatConfig[];
  readonly onExit: () => void;
  /** Test-only: see src/app/debugScenarios.ts. */
  readonly initialGameState?: import('../../engine/state').GameState;
}

const SHAKE_DURATION_MS = 300;

export function GameScreen({ playerCount, seats, onExit, initialGameState }: GameScreenProps) {
  const engine = useGameEngine(playerCount, initialGameState);
  const ai = useAIWorker();
  const reducedMotion = useReducedMotion();
  const toneSequencer = useMemo(() => (reducedMotion ? SILENT_TONE_SEQUENCER : createWebAudioToneSequencer()), [reducedMotion]);
  const particlesRef = useRef<ParticleCanvasHandle>(null);
  const [previewMove, setPreviewMove] = useState<Move | null>(null);
  const [shaking, setShaking] = useState(false);
  // The player who configured the game already holds the device for their own first turn — no
  // pass prompt needed until the active seat actually changes to someone else.
  const [dismissedPassScreenFor, setDismissedPassScreenFor] = useState<number | null>(engine.game.currentPlayer);
  const [pendingMove, setPendingMove] = useState<{ move: Move; owner: number } | null>(null);

  const currentSeat = seats[engine.game.currentPlayer];
  const isAITurn = currentSeat !== 'human';
  const humanSeatCount = seats.filter((s) => s === 'human').length;
  const needsPassScreen =
    !engine.gameOver &&
    !isAITurn &&
    !pendingMove &&
    humanSeatCount > 1 &&
    dismissedPassScreenFor !== engine.game.currentPlayer;

  // Trigger AI moves.
  useEffect(() => {
    if (engine.gameOver || !isAITurn || pendingMove) return;
    const tier = currentSeat as TierName;
    let cancelled = false;

    ai.findMove(engine.game, engine.game.currentPlayer, playerCount, tier).then((result) => {
      if (!cancelled) setPendingMove({ move: result.move, owner: engine.game.currentPlayer });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.game, isAITurn, pendingMove]);

  function commitMove(move: Move, owner: number) {
    if (shouldShakeForMove(move) && !reducedMotion) {
      setShaking(true);
      setTimeout(() => setShaking(false), SHAKE_DURATION_MS);
    }
    setPendingMove({ move, owner });
  }

  function handleCellClick(cellKey: string) {
    if (isAITurn || needsPassScreen || pendingMove) return;

    const destinationMove = engine.legalMoves.find((m) => key(m.to) === cellKey);
    if (engine.selectedPegId && destinationMove) {
      commitMove(destinationMove, engine.game.currentPlayer);
      setPreviewMove(null);
      return;
    }

    const pegHere = engine.game.pegs.find((p) => key(p.cell) === cellKey);
    if (pegHere && pegHere.owner === engine.game.currentPlayer) {
      engine.select(pegHere.id);
    } else {
      engine.deselect();
    }
  }

  function handleHopLanding(landedCell: Cube, owner: number) {
    const { px, py } = project(landedCell, CELL_SPACING);
    particlesRef.current?.ripple(px, py);
    const seat = seatOf(engine.game, owner);
    if (cornerOf(landedCell) === seat.targetCorner) {
      particlesRef.current?.burst(px, py);
    }
  }

  if (engine.gameOver) {
    const ranking = rank(engine.game);
    return (
      <div data-testid="win-screen">
        <h2>Game over</h2>
        <ol>
          {ranking.map((entry) => (
            <li key={entry.player} data-testid={`ranking-${entry.player}`}>
              Player {entry.player}: {entry.pegsHome} pegs home, distance {entry.totalDistance}
            </li>
          ))}
        </ol>
        <button onClick={onExit}>Back to menu</button>
      </div>
    );
  }

  if (needsPassScreen) {
    return (
      <div data-testid="pass-and-play-screen">
        <p>Pass the device to Player {engine.game.currentPlayer}</p>
        <button onClick={() => setDismissedPassScreenFor(engine.game.currentPlayer)}>Ready</button>
      </div>
    );
  }

  return (
    <div data-testid="game-screen">
      <p data-testid="turn-indicator">
        {isAITurn
          ? ai.thinking
            ? `${currentSeat} is thinking...`
            : `${currentSeat}'s turn`
          : `Player ${engine.game.currentPlayer}'s turn`}
      </p>
      <div
        data-testid="board-wrapper"
        style={{
          position: 'relative',
          maxWidth: 640,
          animation: shaking ? 'starleap-shake 0.3s' : undefined,
        }}
      >
        <Board
          game={engine.game}
          selectedPegId={engine.selectedPegId}
          legalMoves={engine.legalMoves}
          previewMove={previewMove}
          onCellClick={handleCellClick}
          onDestinationHover={setPreviewMove}
          animation={
            pendingMove
              ? {
                  move: pendingMove.move,
                  owner: pendingMove.owner,
                  reducedMotion,
                  toneSequencer,
                  onHopLanding: (cell) => handleHopLanding(cell, pendingMove.owner),
                  onComplete: () => {
                    engine.applyMove(pendingMove.move);
                    setPendingMove(null);
                  },
                }
              : null
          }
        />
        <ParticleCanvas ref={particlesRef} reducedMotion={reducedMotion} />
      </div>
      <button onClick={onExit}>Quit</button>
    </div>
  );
}
