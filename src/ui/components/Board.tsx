import { key, type Cube } from '../../engine/coords';
import type { GameState } from '../../engine/state';
import type { Move } from '../../engine/moves';
import type { ToneSequencer } from '../audio/tones';
import { BOARD_VIEWBOX, CELL_RADIUS, PROJECTED_CELLS, PLAYER_COLORS } from './boardGeometry';
import { Peg } from './Peg';
import { PathPreview } from './PathPreview';
import { AnimatedPeg } from './AnimatedPeg';

export interface ActiveAnimation {
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

export function Board({ game, selectedPegId, legalMoves, previewMove, onCellClick, onDestinationHover, animation }: BoardProps) {
  const legalDestinationsByKey = new Map<string, Move>(legalMoves.map((m) => [key(m.to), m]));
  const pegByCellKey = new Map(game.pegs.map((p) => [key(p.cell), p]));
  const interactive = !animation;

  const { minX, minY, width, height } = BOARD_VIEWBOX;

  return (
    <svg
      role="group"
      aria-label="STARLEAP board"
      viewBox={`${minX} ${minY} ${width} ${height}`}
      style={{ width: '100%', height: 'auto', maxWidth: 640, touchAction: 'manipulation' }}
    >
      {PROJECTED_CELLS.map(({ cell, px, py }) => {
        const k = key(cell);
        const isDestination = interactive && legalDestinationsByKey.has(k);
        return (
          <circle
            key={k}
            data-cell={k}
            data-testid={`cell-${k}`}
            cx={px}
            cy={py}
            r={CELL_RADIUS}
            fill={isDestination ? 'rgba(80, 200, 140, 0.35)' : 'rgba(255,255,255,0.06)'}
            stroke={isDestination ? '#50c88c' : 'rgba(255,255,255,0.15)'}
            strokeWidth={isDestination ? 2 : 1}
            onClick={() => interactive && onCellClick(k)}
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
            onClick={() => interactive && onCellClick(key(peg.cell))}
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
