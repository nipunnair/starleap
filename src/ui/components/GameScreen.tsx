import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import { useAIWorker } from '../hooks/useAIWorker';
import { useReducedMotion, type ReducedMotionOverride } from '../hooks/useReducedMotion';
import { rank, hasWon, isGameOver } from '../../engine/terminal';
import { cornerOf } from '../../engine/board';
import { key, project, type Cube } from '../../engine/coords';
import { seatOf, type PlayerCount, type GameState } from '../../engine/state';
import { applyMove } from '../../engine/apply';
import type { Move } from '../../engine/moves';
import type { TierName } from '../../ai/tiers';
import { evaluate } from '../../ai/eval';
import { createWebAudioToneSequencer, SILENT_TONE_SEQUENCER } from '../audio/tones';
import { shouldShakeForMove } from '../animation/chainAnimation';
import { describeMove } from '../animation/describeMove';
import { Board } from './Board';
import { ParticleCanvas, type ParticleCanvasHandle } from './ParticleCanvas';
import { CharacterAvatar, type CharacterState } from './CharacterAvatar';
import { CELL_SPACING } from './boardGeometry';

export type SeatConfig = 'human' | TierName;

export interface GameStats {
  readonly plyCount: number;
  readonly longestChainHops: number;
  readonly durationMs: number;
}

export interface GameScreenProps {
  readonly playerCount: PlayerCount;
  readonly seats: readonly SeatConfig[];
  readonly onExit: () => void;
  /** Test-only: see src/app/debugScenarios.ts. */
  readonly initialGameState?: GameState;
  /** Called after every committed move (human or AI) so a parent can persist progress
   * (ARCHITECTURE.md's save/resume) without GameScreen itself knowing about localStorage. */
  readonly onStateChange?: (game: GameState, gameOver: boolean) => void;
  /** Phase 7 settings screen: 'system' (default) follows the OS, 'on'/'off' force it. */
  readonly reducedMotionOverride?: ReducedMotionOverride;
  readonly audioEnabled?: boolean;
}

const SHAKE_DURATION_MS = 300;
/** SPEC.md §4.7: a floor of ~400ms of visible thinking even if the worker answers faster. */
const MIN_THINKING_MS = 400;
const FOUND_IT_DISPLAY_MS = 200;
/** How much an AI's own post-move eval must drop from its last move to trigger `worried`.
 * Not spec-mandated (SPEC only says "drops sharply") — a documented judgment call. */
const WORRIED_EVAL_DROP_THRESHOLD = 10;
/** How long the `celebrate` state is visible before actually revealing the win screen — without
 * this, committing the winning move flips `gameOver` true on the very next render and the win
 * screen replaces the avatar before `celebrate` is ever shown. Not spec-mandated (SPEC just says
 * "fires when the AI completes its win condition"); a documented judgment call. */
const CELEBRATE_BEFORE_WIN_SCREEN_MS = 1200;

export function GameScreen({
  playerCount,
  seats,
  onExit,
  initialGameState,
  onStateChange,
  reducedMotionOverride = 'system',
  audioEnabled = true,
}: GameScreenProps) {
  const engine = useGameEngine(playerCount, initialGameState);
  const ai = useAIWorker();
  const reducedMotion = useReducedMotion(reducedMotionOverride);
  const toneSequencer = useMemo(
    () => (reducedMotion || !audioEnabled ? SILENT_TONE_SEQUENCER : createWebAudioToneSequencer()),
    [reducedMotion, audioEnabled],
  );
  const particlesRef = useRef<ParticleCanvasHandle>(null);
  const [previewMove, setPreviewMove] = useState<Move | null>(null);
  const [shaking, setShaking] = useState(false);
  const [celebratingWin, setCelebratingWin] = useState(false);
  const [characterState, setCharacterState] = useState<CharacterState>('idle');
  const lastOwnEvalRef = useRef<Map<number, number>>(new Map());
  // The player who configured the game already holds the device for their own first turn — no
  // pass prompt needed until the active seat actually changes to someone else.
  const [dismissedPassScreenFor, setDismissedPassScreenFor] = useState<number | null>(engine.game.currentPlayer);
  const [pendingMove, setPendingMove] = useState<{ move: Move; owner: number } | null>(null);

  // Post-game stats (P7.8): plies played, longest chain used, wall-clock duration.
  const gameStartedAtRef = useRef(Date.now());
  const plyCountRef = useRef(0);
  const longestChainHopsRef = useRef(0);
  const [finalStats, setFinalStats] = useState<GameStats | null>(null);
  const [moveAnnouncement, setMoveAnnouncement] = useState('');

  const currentSeat = seats[engine.game.currentPlayer];
  const isAITurn = currentSeat !== 'human';
  const humanSeatCount = seats.filter((s) => s === 'human').length;
  const needsPassScreen =
    !engine.gameOver &&
    !isAITurn &&
    !pendingMove &&
    humanSeatCount > 1 &&
    dismissedPassScreenFor !== engine.game.currentPlayer;
  const opponentTier = seats.find((s): s is TierName => s !== 'human') ?? null;

  // Trigger AI moves: thinking fires immediately at dispatch time; found-it/move only after the
  // worker resolves AND the minimum visible-thinking floor has elapsed (SPEC §4.7).
  useEffect(() => {
    if (engine.gameOver || !isAITurn || pendingMove) return;
    const tier = currentSeat as TierName;
    const mover = engine.game.currentPlayer;
    const state = engine.game;
    let cancelled = false;
    const timeouts: number[] = [];
    const thinkingStartedAt = performance.now();
    setCharacterState('thinking');

    ai.findMove(state, mover, playerCount, tier).then((result) => {
      if (cancelled) return;
      const remaining = Math.max(0, MIN_THINKING_MS - (performance.now() - thinkingStartedAt));

      timeouts.push(
        window.setTimeout(() => {
          if (cancelled) return;

          const previewState = applyMove(state, result.move);
          const newEval = evaluate(previewState, mover);
          const prevEval = lastOwnEvalRef.current.get(mover);
          lastOwnEvalRef.current.set(mover, newEval);
          setCharacterState(prevEval !== undefined && newEval < prevEval - WORRIED_EVAL_DROP_THRESHOLD ? 'worried' : 'found-it');

          timeouts.push(
            window.setTimeout(() => {
              if (cancelled) return;
              setCharacterState('move');
              setPendingMove({ move: result.move, owner: mover });
            }, FOUND_IT_DISPLAY_MS),
          );
        }, remaining),
      );
    });

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
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

  function handleMoveAnimationComplete(move: Move, owner: number) {
    const nextState = applyMove(engine.game, move);
    engine.applyMove(move, seats[owner] === 'human');
    setPendingMove(null);
    setMoveAnnouncement(describeMove(move, seats[owner] === 'human' ? `Player ${owner}` : (seats[owner] as string)));

    plyCountRef.current += 1;
    const hopCount = move.type === 'jump' ? move.hops.length : 0;
    if (hopCount > longestChainHopsRef.current) longestChainHopsRef.current = hopCount;

    const gameOver = isGameOver(nextState);
    onStateChange?.(nextState, gameOver);
    if (gameOver) {
      setFinalStats({
        plyCount: plyCountRef.current,
        longestChainHops: longestChainHopsRef.current,
        durationMs: Date.now() - gameStartedAtRef.current,
      });
    }

    const aiWon = seats[owner] !== 'human' && hasWon(nextState, owner);
    setCharacterState(aiWon ? 'celebrate' : 'idle');
    if (aiWon) {
      // Committing the move above already flips engine.gameOver true — without this delay the
      // win screen would replace the avatar on the very next render and `celebrate` would never
      // actually be visible (found via manual browser verification, see DECISIONS.md).
      setCelebratingWin(true);
      setTimeout(() => setCelebratingWin(false), CELEBRATE_BEFORE_WIN_SCREEN_MS);
    }
  }

  if (engine.gameOver && !celebratingWin) {
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
        {finalStats && (
          <dl data-testid="post-game-stats">
            <dt>Total moves</dt>
            <dd data-testid="stat-ply-count">{finalStats.plyCount}</dd>
            <dt>Longest chain</dt>
            <dd data-testid="stat-longest-chain">{finalStats.longestChainHops} hops</dd>
            <dt>Duration</dt>
            <dd data-testid="stat-duration">{Math.round(finalStats.durationMs / 1000)}s</dd>
          </dl>
        )}
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
      <div aria-live="polite" className="sr-only" data-testid="move-announcer">
        {moveAnnouncement}
      </div>
      {opponentTier && (
        <CharacterAvatar
          tier={opponentTier}
          // `celebrate` must survive even after currentPlayer advances past the winner (which
          // happens the instant the winning move commits) — otherwise isAITurn flips false and
          // the avatar would snap back to idle before celebrate is ever visible.
          state={characterState === 'celebrate' ? 'celebrate' : isAITurn ? characterState : 'idle'}
        />
      )}
      <p data-testid="turn-indicator">
        {isAITurn
          ? characterState === 'thinking'
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
                  onComplete: () => handleMoveAnimationComplete(pendingMove.move, pendingMove.owner),
                }
              : null
          }
        />
        <ParticleCanvas ref={particlesRef} reducedMotion={reducedMotion} />
      </div>
      {engine.canUndo && !pendingMove && (
        <button data-testid="undo-button" onClick={() => engine.undo()}>
          Undo
        </button>
      )}
      <button onClick={onExit}>Quit</button>
    </div>
  );
}
