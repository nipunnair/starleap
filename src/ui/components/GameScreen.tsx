import { useEffect, useState } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import { useAIWorker } from '../hooks/useAIWorker';
import { rank } from '../../engine/terminal';
import type { PlayerCount } from '../../engine/state';
import type { Move } from '../../engine/moves';
import type { TierName } from '../../ai/tiers';
import { Board } from './Board';

export type SeatConfig = 'human' | TierName;

export interface GameScreenProps {
  readonly playerCount: PlayerCount;
  readonly seats: readonly SeatConfig[];
  readonly onExit: () => void;
}

export function GameScreen({ playerCount, seats, onExit }: GameScreenProps) {
  const engine = useGameEngine(playerCount);
  const ai = useAIWorker();
  const [previewMove, setPreviewMove] = useState<Move | null>(null);
  // The player who configured the game already holds the device for their own first turn — no
  // pass prompt needed until the active seat actually changes to someone else.
  const [dismissedPassScreenFor, setDismissedPassScreenFor] = useState<number | null>(engine.game.currentPlayer);

  const currentSeat = seats[engine.game.currentPlayer];
  const isAITurn = currentSeat !== 'human';
  const humanSeatCount = seats.filter((s) => s === 'human').length;
  const needsPassScreen =
    !engine.gameOver && !isAITurn && humanSeatCount > 1 && dismissedPassScreenFor !== engine.game.currentPlayer;

  // Trigger AI moves.
  useEffect(() => {
    if (engine.gameOver || !isAITurn) return;
    const tier = currentSeat as TierName;
    let cancelled = false;

    ai.findMove(engine.game, engine.game.currentPlayer, playerCount, tier).then((result) => {
      if (!cancelled) engine.applyMove(result.move);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.game, isAITurn]);

  function handleCellClick(cellKey: string) {
    if (isAITurn || needsPassScreen) return;

    const destinationMove = engine.legalMoves.find((m) => `${m.to.x},${m.to.y},${m.to.z}` === cellKey);
    if (engine.selectedPegId && destinationMove) {
      engine.applyMove(destinationMove);
      setPreviewMove(null);
      return;
    }

    const pegHere = engine.game.pegs.find((p) => `${p.cell.x},${p.cell.y},${p.cell.z}` === cellKey);
    if (pegHere && pegHere.owner === engine.game.currentPlayer) {
      engine.select(pegHere.id);
    } else {
      engine.deselect();
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
      <Board
        game={engine.game}
        selectedPegId={engine.selectedPegId}
        legalMoves={engine.legalMoves}
        previewMove={previewMove}
        onCellClick={handleCellClick}
        onDestinationHover={setPreviewMove}
      />
      <button onClick={onExit}>Quit</button>
    </div>
  );
}
