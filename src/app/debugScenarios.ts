/**
 * Test-only scenario builders, used exclusively by Phase 5's performance E2E gate (P5.9) to
 * exercise a specific 7-hop chain that doesn't reliably occur in natural play within a test's
 * time budget. Only ever reached via an explicit `?e2eScenario=` URL query param (see App.tsx) —
 * inert for every real user. Not part of the documented rules/spec; purely a test fixture.
 */
import { SEATING_PLANS, type GameState, type PlayerCount, type Peg } from '../engine/state';
import { BOARD, OPPOSITE_CORNER, cornerOf } from '../engine/board';
import { neighbors, distance, type Cube } from '../engine/coords';

const ORIGIN: Cube = { x: 0, y: 0, z: 0 };

/**
 * A hand-constructed (and engine-verified — see DECISIONS.md) 7-hop zigzag: player 0's mover
 * peg at the origin, with pivot pegs owned by player 1 placed so exactly one 7-hop chain is
 * available. 6 players seated (SPEC's "6 players animating" performance scenario) but only
 * player 0 and the pivot-owning player 1 have any pegs — the rest are empty seats, which is
 * fine for a move-generation/animation perf test that only exercises one player's turn.
 */
export function buildSevenHopChainScenario(): GameState {
  const playerCount: PlayerCount = 6;
  const plan = SEATING_PLANS[playerCount];
  const seats = plan.map((startCorner, player) => ({
    player,
    startCorner,
    targetCorner: OPPOSITE_CORNER[startCorner],
  }));

  const pivots: Cube[] = [
    { x: 0, y: 1, z: -1 },
    { x: 0, y: 3, z: -3 },
    { x: -1, y: 4, z: -3 },
    { x: -3, y: 5, z: -2 },
    { x: -4, y: 5, z: -1 },
    { x: -4, y: 3, z: 1 },
    { x: -3, y: 1, z: 2 },
  ];

  const pegs: Peg[] = [
    { id: 'mover', owner: 0, cell: { x: 0, y: 0, z: 0 }, hasLeftStart: true },
    ...pivots.map((cell, i) => ({ id: `pivot-${i}`, owner: 1, cell, hasLeftStart: true })),
  ];

  return { playerCount, seats, pegs, currentPlayer: 0, round: 0, cordonNeutralCorners: true };
}

/**
 * 2-player game with player 1 (the AI) one step from winning: 9 of its 10 pegs already resting
 * in its own target corner, the 10th peg adjacent to the single remaining empty target cell.
 * `currentPlayer` is set to 1 so the AI's turn-triggering effect fires as soon as the game
 * screen mounts, letting an E2E test observe the `celebrate` state without playing out a real
 * game. Player 0's pegs are parked in arbitrary hexagon cells — they never get a turn in this
 * scenario, so their exact position doesn't matter, only that they don't collide with player 1's.
 * Used with a noise-free tier (Rigel/Sirius, not Nova — see App.tsx) so the AI reliably picks
 * the winning move.
 */
export function buildAlmostWonScenario(): GameState {
  const playerCount: PlayerCount = 2;
  const plan = SEATING_PLANS[playerCount]; // ['X+', 'X-']
  const seats = plan.map((startCorner, player) => ({
    player,
    startCorner,
    targetCorner: OPPOSITE_CORNER[startCorner],
  }));

  const player1TargetCorner = seats[1]!.targetCorner; // 'X+'
  // Sort by distance from center ascending, so index 0 is a base-row cell (adjacent to the
  // hexagon) and the last few are deeper into the corner (apex-ward, no hexagon-adjacent
  // neighbors) — the empty cell left for the winning move must be a base-row one.
  const targetCells = [...BOARD.corners[player1TargetCorner]].sort((a, b) => distance(ORIGIN, a) - distance(ORIGIN, b));
  const lastTargetCell = targetCells[0]!;
  const homeCells = targetCells.slice(1);
  // A real neighbor (per the engine's own adjacency) of the last empty target cell, itself
  // outside the target corner (so the winning move is a genuine STEP into the corner, not
  // already-resident).
  const finalPeg = neighbors(lastTargetCell).find((c) => cornerOf(c) === null)!;

  const player0Cells = BOARD.hexagon.filter((c) => c.x !== finalPeg.x || c.y !== finalPeg.y || c.z !== finalPeg.z).slice(0, 10);

  const pegs: Peg[] = [
    ...homeCells.map((cell, i) => ({ id: `p1-${i}`, owner: 1, cell, hasLeftStart: true })),
    { id: 'p1-9', owner: 1, cell: finalPeg, hasLeftStart: true },
    ...player0Cells.map((cell, i) => ({ id: `p0-${i}`, owner: 0, cell, hasLeftStart: true })),
  ];

  return { playerCount, seats, pegs, currentPlayer: 1, round: 10, cordonNeutralCorners: true };
}
