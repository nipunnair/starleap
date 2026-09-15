import { project, type Cube } from '../../engine/coords';
import type { Move } from '../../engine/moves';
import { CELL_SPACING } from './boardGeometry';

/**
 * Static path preview (SPEC.md §4.5): dotted arcs for every hop in order, numbered, pivots
 * highlighted. Animated motion arrives in Phase 5 — this is the pre-animation visual only.
 */
export function PathPreview({ move }: { move: Move }) {
  if (move.type === 'step') {
    const from = project(move.from, CELL_SPACING);
    const to = project(move.to, CELL_SPACING);
    return (
      <line
        x1={from.px}
        y1={from.py}
        x2={to.px}
        y2={to.py}
        stroke="#ffd166"
        strokeWidth={2}
        strokeDasharray="4 4"
        data-testid="path-preview-step"
      />
    );
  }

  let current: Cube = move.from;

  return (
    <g data-testid="path-preview-chain">
      {move.hops.map((hop, i) => {
        const fromP = project(current, CELL_SPACING);
        const toP = project(hop.landing, CELL_SPACING);
        const pivotP = project(hop.pivot, CELL_SPACING);
        current = hop.landing;
        const midX = (fromP.px + toP.px) / 2;
        const midY = (fromP.py + toP.py) / 2;

        return (
          <g key={i} data-testid={`path-preview-hop-${i + 1}`}>
            <line
              x1={fromP.px}
              y1={fromP.py}
              x2={toP.px}
              y2={toP.py}
              stroke="#ffd166"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            <circle cx={pivotP.px} cy={pivotP.py} r={5} fill="#ff6b6b" data-testid={`path-preview-pivot-${i + 1}`} />
            <circle cx={midX} cy={midY} r={9} fill="#1a1a2e" stroke="#ffd166" strokeWidth={1.5} />
            <text x={midX} y={midY + 3.5} fontSize={10} fill="#ffd166" textAnchor="middle">
              {i + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
}
