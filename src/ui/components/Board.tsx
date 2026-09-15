import { key } from '../../engine/coords';
import type { GameState } from '../../engine/state';
import type { Move } from '../../engine/moves';
import { BOARD_VIEWBOX, CELL_RADIUS, PROJECTED_CELLS, PLAYER_COLORS } from './boardGeometry';
import { Peg } from './Peg';
import { PathPreview } from './PathPreview';

export interface BoardProps {
  readonly game: GameState;
  readonly selectedPegId: string | null;
  readonly legalMoves: readonly Move[];
  readonly previewMove: Move | null;
  readonly onCellClick: (cellKey: string) => void;
  readonly onDestinationHover: (move: Move | null) => void;
}

export function Board({ game, selectedPegId, legalMoves, previewMove, onCellClick, onDestinationHover }: BoardProps) {
  const legalDestinationsByKey = new Map<string, Move>(legalMoves.map((m) => [key(m.to), m]));
  const pegByCellKey = new Map(game.pegs.map((p) => [key(p.cell), p]));

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
        const isDestination = legalDestinationsByKey.has(k);
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
            onClick={() => onCellClick(k)}
            onMouseEnter={() => {
              const move = legalDestinationsByKey.get(k);
              if (move) onDestinationHover(move);
            }}
            onMouseLeave={() => onDestinationHover(null)}
            style={{ cursor: isDestination || pegByCellKey.has(k) ? 'pointer' : 'default' }}
          />
        );
      })}

      {previewMove && <PathPreview move={previewMove} />}

      {game.pegs.map((peg) => (
        <Peg
          key={peg.id}
          peg={peg}
          color={PLAYER_COLORS[peg.owner % PLAYER_COLORS.length]!}
          selected={peg.id === selectedPegId}
          onClick={() => onCellClick(key(peg.cell))}
        />
      ))}
    </svg>
  );
}
