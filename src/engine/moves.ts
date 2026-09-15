/**
 * Move generation: steps and long-jump chains. See docs/SPEC.md §2.2-2.3.
 * Zero imports outside coords.ts/board.ts/state.ts (all themselves zero-import).
 */
import { type Cube, add, scale, onBoard, key, NEIGHBOR_DIRECTIONS } from './coords';
import type { GameState, Peg } from './state';

export function buildOccupancy(state: GameState): ReadonlySet<string> {
  return new Set(state.pegs.map((p) => key(p.cell)));
}

/** Adjacent empty on-board cells a peg may STEP to. SPEC §2.2. */
export function generateSteps(cell: Cube, occupied: ReadonlySet<string>): Cube[] {
  const steps: Cube[] = [];
  for (const d of NEIGHBOR_DIRECTIONS) {
    const to = add(cell, d);
    if (onBoard(to) && !occupied.has(key(to))) {
      steps.push(to);
    }
  }
  return steps;
}

export function pegsAsOccupancyLookup(state: GameState): ReadonlyMap<string, Peg> {
  const map = new Map<string, Peg>();
  for (const p of state.pegs) map.set(key(p.cell), p);
  return map;
}

export interface Hop {
  readonly direction: Cube;
  readonly span: number;
  readonly pivot: Cube;
  readonly landing: Cube;
}

/**
 * Board diameter never exceeds ~17 cells across, so no legal hop's span can exceed this.
 * A generous static bound avoids unbounded loops without needing per-call geometry math.
 */
const MAX_HOP_SPAN = 16;

/**
 * Every legal hop from `cell` in every direction and span, per SPEC §2.3:
 *   pivot = c + n*d on board and occupied
 *   the n-1 cells strictly between c and pivot on board and empty (approach gap)
 *   landing = c + 2n*d on board and empty
 *   the n-1 cells strictly between pivot and landing on board and empty (departure gap)
 * n=1 is the classic short jump and falls out of this as the base case.
 */
export function legalHopsFrom(cell: Cube, occupied: ReadonlySet<string>): Hop[] {
  const hops: Hop[] = [];

  for (const d of NEIGHBOR_DIRECTIONS) {
    for (let n = 1; n <= MAX_HOP_SPAN; n++) {
      const pivot = add(cell, scale(d, n));
      if (!onBoard(pivot)) break; // direction is axis-monotonic: once off-board, stays off-board
      if (!occupied.has(key(pivot))) continue; // pivot must be occupied; a longer span might work

      let approachClear = true;
      for (let k = 1; k < n; k++) {
        const gapCell = add(cell, scale(d, k));
        if (!onBoard(gapCell) || occupied.has(key(gapCell))) {
          approachClear = false;
          break;
        }
      }
      if (!approachClear) continue;

      const landing = add(cell, scale(d, 2 * n));
      if (!onBoard(landing) || occupied.has(key(landing))) continue;

      let departClear = true;
      for (let k = n + 1; k < 2 * n; k++) {
        const gapCell = add(cell, scale(d, k));
        if (!onBoard(gapCell) || occupied.has(key(gapCell))) {
          departClear = false;
          break;
        }
      }
      if (!departClear) continue;

      hops.push({ direction: d, span: n, pivot, landing });
    }
  }

  return hops;
}

/** Hard cap per SPEC §2.3 — no legal position should approach it; it bounds worst-case search. */
export const MAX_CHAIN_HOPS = 24;

export interface JumpChainMove {
  readonly type: 'jump';
  readonly pegId: string;
  readonly from: Cube;
  readonly to: Cube;
  readonly hops: readonly Hop[];
}

/**
 * Every jump-chain move available from a peg's current cell: one entry per cell the chain
 * could legally stop at (SPEC §2.3 — "you may stop at any point"), each carrying the full
 * hop-by-hop path taken to reach it. DFS with a per-chain visited-cell guard (no cell may be
 * visited twice within one chain) and the 24-hop cap.
 */
export function generateJumpChains(peg: Peg, occupied: ReadonlySet<string>): JumpChainMove[] {
  const results: JumpChainMove[] = [];
  const visited = new Set<string>([key(peg.cell)]);
  const path: Hop[] = [];

  function dfs(current: Cube): void {
    if (path.length >= MAX_CHAIN_HOPS) return;

    for (const hop of legalHopsFrom(current, occupied)) {
      const landingKey = key(hop.landing);
      if (visited.has(landingKey)) continue;

      path.push(hop);
      visited.add(landingKey);

      results.push({
        type: 'jump',
        pegId: peg.id,
        from: peg.cell,
        to: hop.landing,
        hops: [...path],
      });

      dfs(hop.landing);

      path.pop();
      visited.delete(landingKey);
    }
  }

  dfs(peg.cell);
  return results;
}
