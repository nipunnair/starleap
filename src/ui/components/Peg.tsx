import { project } from '../../engine/coords';
import type { Peg as PegModel } from '../../engine/state';
import { CELL_SPACING, CELL_RADIUS } from './boardGeometry';

export interface PegProps {
  readonly peg: PegModel;
  readonly color: string;
  readonly selected: boolean;
  readonly onClick: () => void;
}

export function Peg({ peg, color, selected, onClick }: PegProps) {
  const { px, py } = project(peg.cell, CELL_SPACING);
  const radius = CELL_RADIUS * 0.72;

  return (
    <g data-testid={`peg-${peg.id}`} onClick={onClick} style={{ cursor: 'pointer' }}>
      {selected && (
        <circle cx={px} cy={py} r={radius + 4} fill="none" stroke="#ffffff" strokeWidth={2} opacity={0.85} />
      )}
      <circle cx={px} cy={py} r={radius} fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
    </g>
  );
}
