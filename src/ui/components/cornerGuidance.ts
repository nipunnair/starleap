import { CORNER_IDS, type CornerId } from '../../engine/board';
import type { GameState } from '../../engine/state';

export const CORNER_LABELS: Record<CornerId, string> = {
  'X+': 'A', 'X-': 'D', 'Y+': 'E', 'Y-': 'B', 'Z+': 'C', 'Z-': 'F',
};
export function waypointCorners(game: GameState): readonly CornerId[] {
  return CORNER_IDS.filter(corner => !game.seats.some(seat => seat.startCorner === corner || seat.targetCorner === corner));
}
