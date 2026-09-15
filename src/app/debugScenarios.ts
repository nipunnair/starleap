/**
 * Test-only scenario builders, used exclusively by Phase 5's performance E2E gate (P5.9) to
 * exercise a specific 7-hop chain that doesn't reliably occur in natural play within a test's
 * time budget. Only ever reached via an explicit `?e2eScenario=` URL query param (see App.tsx) —
 * inert for every real user. Not part of the documented rules/spec; purely a test fixture.
 */
import { SEATING_PLANS, type GameState, type PlayerCount, type Peg } from '../engine/state';
import { OPPOSITE_CORNER } from '../engine/board';
import type { Cube } from '../engine/coords';

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

  return { playerCount, seats, pegs, currentPlayer: 0, round: 0 };
}
