/**
 * GameState: peg positions, seating, turn/round tracking. See docs/SPEC.md §1.9, §2.6-2.7.
 * Zero imports outside coords.ts/board.ts (both themselves zero-import).
 */
import { type Cube, equals } from './coords';
import { BOARD, type CornerId, OPPOSITE_CORNER } from './board';

export type PlayerCount = 2 | 3 | 4 | 6;

/**
 * Which corners are used as start corners, indexed by player number, for each seat count.
 * 2P: one opposite pair. 3P: the three "positive" corners (SPEC §1.9), evenly spaced 120° apart.
 * 4P: two opposite pairs, interleaved so consecutive players aren't opposite each other.
 * 6P: all six, in true geometric (60°-rotation) cyclic order around the star.
 */
export const SEATING_PLANS: Readonly<Record<PlayerCount, readonly CornerId[]>> = {
  2: ['X+', 'X-'],
  3: ['X+', 'Y+', 'Z+'],
  4: ['X+', 'Y+', 'X-', 'Y-'],
  6: ['X+', 'Y-', 'Z+', 'X-', 'Y+', 'Z-'],
};

export interface Seat {
  readonly player: number;
  readonly startCorner: CornerId;
  readonly targetCorner: CornerId;
}

export interface Peg {
  readonly id: string;
  readonly owner: number;
  readonly cell: Cube;
  readonly hasLeftStart: boolean;
}

export interface GameState {
  readonly playerCount: PlayerCount;
  readonly seats: readonly Seat[];
  readonly pegs: readonly Peg[];
  readonly currentPlayer: number;
  readonly round: number;
}

export function createInitialState(playerCount: PlayerCount): GameState {
  const plan = SEATING_PLANS[playerCount];
  const seats: Seat[] = plan.map((startCorner, player) => ({
    player,
    startCorner,
    targetCorner: OPPOSITE_CORNER[startCorner],
  }));

  const pegs: Peg[] = [];
  for (const seat of seats) {
    const cellsAtStart = BOARD.corners[seat.startCorner];
    cellsAtStart.forEach((cell, i) => {
      pegs.push({ id: `p${seat.player}-${i}`, owner: seat.player, cell, hasLeftStart: false });
    });
  }

  return { playerCount, seats, pegs, currentPlayer: 0, round: 0 };
}

export function seatOf(state: GameState, player: number): Seat {
  const seat = state.seats.find((s) => s.player === player);
  if (!seat) throw new Error(`no seat for player ${player}`);
  return seat;
}

export function pegAt(state: GameState, cell: Cube): Peg | undefined {
  return state.pegs.find((p) => equals(p.cell, cell));
}

export function pegsOf(state: GameState, player: number): Peg[] {
  return state.pegs.filter((p) => p.owner === player);
}
