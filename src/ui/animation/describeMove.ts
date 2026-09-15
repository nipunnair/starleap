import type { Cube } from '../../engine/coords';
import type { Move } from '../../engine/moves';

/** Plain-language cell label for screen-reader announcements (SPEC.md P8.4). */
function describeCell(cell: Cube): string {
  return `cell ${cell.x}, ${cell.y}, ${cell.z}`;
}

/**
 * A plain-language description of a committed move, for an `aria-live` announcer.
 * `moverLabel` is whatever the UI already calls that seat (e.g. "Player 0" or "Nova").
 */
export function describeMove(move: Move, moverLabel: string): string {
  if (move.type === 'step') {
    return `${moverLabel} steps to ${describeCell(move.to)}.`;
  }
  const hopWord = move.hops.length === 1 ? 'hop' : 'hops';
  return `${moverLabel} jumps from ${describeCell(move.from)} to ${describeCell(move.to)}, ${move.hops.length} ${hopWord}.`;
}
