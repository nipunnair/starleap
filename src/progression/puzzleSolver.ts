/** Exact puzzle solver: BFS over the mover's resting cells using the real engine move rules. */
import { distance, equals, key, type Cube } from '../engine/coords';
import { puzzleMoves, startPuzzle, type Puzzle } from './puzzles';
import type { PuzzleAttempt } from './puzzles';
import { PUZZLE_PEG_ID } from './puzzles';

export interface PuzzleAnalysis {
  /** Fewest moves (one chain = one move) from start to goal; null when unreachable. */
  readonly optimum: number | null;
  /** Number of distinct shortest move sequences (capped at 1000). */
  readonly optimalRoutes: number;
  /** One shortest route as resting cells. */
  readonly route: readonly Cube[];
  /** Moves taken by "always land closest to the goal"; null if it never arrives. */
  readonly greedyMoves: number | null;
  /** Share of first moves that lie on some shortest route (lower = more decoys). */
  readonly firstMoveHitRate: number;
  readonly firstMoveCount: number;
}

const ROUTE_CAP = 1000;

function destinations(puzzle: Puzzle, at: Cube): Cube[] {
  const base = startPuzzle({ ...puzzle, start: at });
  const attempt: PuzzleAttempt = base;
  const seen = new Set<string>();
  const out: Cube[] = [];
  for (const m of puzzleMoves({ ...puzzle, start: at }, attempt)) {
    if (m.pegId !== PUZZLE_PEG_ID || seen.has(key(m.to))) continue;
    seen.add(key(m.to));
    out.push(m.to);
  }
  return out;
}

export function analyzePuzzle(puzzle: Puzzle): PuzzleAnalysis {
  const graph = new Map<string, Cube[]>();
  const next = (c: Cube): Cube[] => {
    const k = key(c);
    let d = graph.get(k);
    if (!d) { d = destinations(puzzle, c); graph.set(k, d); }
    return d;
  };
  const dist = new Map<string, number>([[key(puzzle.start), 0]]);
  const ways = new Map<string, number>([[key(puzzle.start), 1]]);
  const parent = new Map<string, Cube>();
  let frontier: Cube[] = [puzzle.start];
  while (frontier.length > 0 && !dist.has(key(puzzle.goal))) {
    const nextFrontier: Cube[] = [];
    for (const c of frontier) {
      const dc = dist.get(key(c))!;
      for (const to of next(c)) {
        const kt = key(to);
        if (!dist.has(kt)) { dist.set(kt, dc + 1); ways.set(kt, 0); parent.set(kt, c); nextFrontier.push(to); }
        if (dist.get(kt) === dc + 1) ways.set(kt, Math.min(ROUTE_CAP, ways.get(kt)! + ways.get(key(c))!));
      }
    }
    frontier = nextFrontier;
  }
  const gk = key(puzzle.goal);
  const optimum = dist.get(gk) ?? null;
  const route: Cube[] = [];
  if (optimum !== null) {
    let c: Cube | undefined = puzzle.goal;
    while (c && !equals(c, puzzle.start)) { route.unshift(c); c = parent.get(key(c)); }
  }
  // Greedy baseline.
  let greedyMoves: number | null = null;
  { let cur = puzzle.start; const seen = new Set([key(cur)]);
    for (let i = 1; i <= 40; i++) {
      const opts = next(cur).filter(c => !seen.has(key(c)));
      if (opts.length === 0) break;
      cur = opts.reduce((a, b) => (distance(b, puzzle.goal) < distance(a, puzzle.goal) ? b : a));
      seen.add(key(cur));
      if (equals(cur, puzzle.goal)) { greedyMoves = i; break; }
    } }
  // First-move decoy ratio: BFS distance-to-goal from each first move.
  const first = next(puzzle.start);
  let hits = 0;
  if (optimum !== null) {
    for (const f of first) {
      const sub = analyzeFrom(puzzle, f, optimum - 1, next);
      if (sub) hits++;
    }
  }
  return { optimum, optimalRoutes: ways.get(gk) ?? 0, route, greedyMoves,
    firstMoveHitRate: first.length ? hits / first.length : 0, firstMoveCount: first.length };
}

function analyzeFrom(puzzle: Puzzle, from: Cube, budget: number, next: (c: Cube) => Cube[]): boolean {
  if (equals(from, puzzle.goal)) return budget >= 0;
  let frontier = [from]; const seen = new Set([key(from)]);
  for (let d = 0; d < budget; d++) {
    const nf: Cube[] = [];
    for (const c of frontier) for (const t of next(c)) {
      if (equals(t, puzzle.goal)) return true;
      if (!seen.has(key(t))) { seen.add(key(t)); nf.push(t); }
    }
    frontier = nf;
  }
  return false;
}
