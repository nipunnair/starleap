import { project } from '../../engine/coords';
import type { Peg as PegModel } from '../../engine/state';
import { CELL_SPACING, CELL_RADIUS, HIT_RADIUS } from './boardGeometry';

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
      {/* Invisible hit target, larger than the visible peg (SPEC.md P8.2 — see boardGeometry.ts
          for why HIT_RADIUS falls short of the 44px guideline on this board). fill="transparent"
          (not "none") so it still participates in click hit-testing. */}
      <circle cx={px} cy={py} r={HIT_RADIUS} fill="transparent" />
      {selected && (
        <circle cx={px} cy={py} r={radius + 4} fill="none" stroke="#ffffff" strokeWidth={2} opacity={0.85} />
      )}
      <circle cx={px} cy={py} r={radius} fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
    </g>
  );
}
