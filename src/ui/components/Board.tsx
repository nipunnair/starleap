import { useState, type KeyboardEvent } from 'react';
import { key, add, onBoard, type Cube } from '../../engine/coords';
import type { GameState } from '../../engine/state';
import type { Move } from '../../engine/moves';
import type { ToneSequencer } from '../audio/tones';
import { BOARD_VIEWBOX, HIT_RADIUS, PROJECTED_CELLS, PLAYER_COLORS } from './boardGeometry';
import { Peg } from './Peg';
import { PathPreview } from './PathPreview';
import { AnimatedPeg } from './AnimatedPeg';

interface ActiveAnimation {
  readonly move: Move;
  readonly owner: number;
  readonly reducedMotion: boolean;
  readonly toneSequencer: ToneSequencer;
  readonly onComplete: () => void;
  readonly onHopLanding: (landedCell: Cube, hopIndex: number, totalHops: number) => void;
}

export interface BoardProps {
  readonly game: GameState;
  readonly selectedPegId: string | null;
  readonly legalMoves: readonly Move[];
  readonly previewMove: Move | null;
  readonly onCellClick: (cellKey: string) => void;
  readonly onDestinationHover: (move: Move | null) => void;
  readonly animation?: ActiveAnimation | null;
}

/**
 * SPEC.md P8.3: keyboard navigation. The hex lattice has only 2 degrees of freedom (x+y+z=0),
 * so these 4 directions — 2 independent axes and their opposites — can reach every cell on the
 * board via combinations (e.g. up-right = ArrowUp then ArrowRight), even though only 4 of the
 * 6 neighbor directions have dedicated keys.
 */
const ARROW_KEY_DIRECTIONS: Record<string, Cube> = {
  ArrowRight: { x: 1, y: -1, z: 0 },
  ArrowLeft: { x: -1, y: 1, z: 0 },
  ArrowUp: { x: 0, y: 1, z: -1 },
  ArrowDown: { x: 0, y: -1, z: 1 },
};

export function Board({ game, selectedPegId, legalMoves, previewMove, onCellClick, onDestinationHover, animation }: BoardProps) {
  const legalDestinationsByKey = new Map<string, Move>(legalMoves.map((m) => [key(m.to), m]));
  const pegByCellKey = new Map(game.pegs.map((p) => [key(p.cell), p]));
  const interactive = !animation;
  const [focusedCell, setFocusedCell] = useState<Cube>(PROJECTED_CELLS[Math.floor(PROJECTED_CELLS.length / 2)]!.cell);

  const { minX, minY, width, height } = BOARD_VIEWBOX;

  function handleKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    if (!interactive) return;
    const direction = ARROW_KEY_DIRECTIONS[e.key];
    if (direction) {
      e.preventDefault();
      const next = add(focusedCell, direction);
      if (onBoard(next)) setFocusedCell(next);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCellClick(key(focusedCell));
    }
  }

  return (
    <svg
      role="group"
      aria-label="STARLEAP board. Use arrow keys to move focus, Enter to select a peg or confirm a destination."
      viewBox={`${minX} ${minY} ${width} ${height}`}
      style={{ width: '100%', height: 'auto', maxWidth: 640, touchAction: 'manipulation' }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {PROJECTED_CELLS.map(({ cell, px, py }) => {
        const k = key(cell);
        const isDestination = interactive && legalDestinationsByKey.has(k);
        const isFocused = interactive && k === key(focusedCell);
        return (
          <circle
            key={k}
            data-cell={k}
            data-testid={`cell-${k}`}
            cx={px}
            cy={py}
            r={HIT_RADIUS}
            fill={isDestination ? 'rgba(80, 200, 140, 0.35)' : 'rgba(255,255,255,0.06)'}
            stroke={isFocused ? '#ffd166' : isDestination ? '#50c88c' : 'rgba(255,255,255,0.15)'}
            strokeWidth={isFocused ? 2.5 : isDestination ? 2 : 1}
            onClick={() => {
              if (!interactive) return;
              setFocusedCell(cell);
              onCellClick(k);
            }}
            onMouseEnter={() => {
              if (!interactive) return;
              const move = legalDestinationsByKey.get(k);
              if (move) onDestinationHover(move);
            }}
            onMouseLeave={() => interactive && onDestinationHover(null)}
            style={{ cursor: interactive && (isDestination || pegByCellKey.has(k)) ? 'pointer' : 'default' }}
          />
        );
      })}

      {previewMove && interactive && <PathPreview move={previewMove} />}

      {game.pegs.map((peg) => {
        if (animation && peg.id === animation.move.pegId) return null; // rendered via AnimatedPeg below
        return (
          <Peg
            key={peg.id}
            peg={peg}
            color={PLAYER_COLORS[peg.owner % PLAYER_COLORS.length]!}
            selected={peg.id === selectedPegId}
            onClick={() => {
              if (!interactive) return;
              setFocusedCell(peg.cell);
              onCellClick(key(peg.cell));
            }}
          />
        );
      })}

      {animation && (
        <AnimatedPeg
          move={animation.move}
          color={PLAYER_COLORS[animation.owner % PLAYER_COLORS.length]!}
          reducedMotion={animation.reducedMotion}
          toneSequencer={animation.toneSequencer}
          onComplete={animation.onComplete}
          onHopLanding={animation.onHopLanding}
        />
      )}
    </svg>
  );
}
