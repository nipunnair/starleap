#!/usr/bin/env tsx
/** `npm run puzzle-gen -- --seed N --count N --min 5` — scatter pivots, solve exactly, keep hard layouts. */
import { analyzePuzzle } from '../src/progression/puzzleSolver';
import type { Puzzle } from '../src/progression/puzzles';
import { BOARD, distance } from '../src/engine';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const seed = Number(arg('seed', '1')), want = Number(arg('count', '6')), min = Number(arg('min', '5'));
const tries = Number(arg('tries', '20000'));
const r = rng(seed);
const hex = [...BOARD.hexagon];
const all = [...BOARD.cells];
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
const found: { p: Puzzle; a: ReturnType<typeof analyzePuzzle> }[] = [];
const ck = (c: { x: number; y: number }): string => `${c.x},${c.y}`;
function score(p: Puzzle): { a: ReturnType<typeof analyzePuzzle>; s: number } {
  const a = analyzePuzzle(p);
  if (a.optimum === null) return { a, s: -1 };
  const cells = [p.start, ...a.route];
  const steps = cells.slice(1).filter((c, i) => distance(cells[i]!, c) === 1).length;
  const gap = (a.greedyMoves ?? a.optimum + 4) - a.optimum;
  return { a, s: a.optimum * 10 + Math.min(gap, 4) * 2 - Math.max(0, steps - 2) * 6 - Math.min(a.optimalRoutes, 6) - a.firstMoveHitRate * 4 };
}
function accept(p: Puzzle, a: ReturnType<typeof analyzePuzzle>): boolean {
  if (a.optimum === null || a.optimum < min || a.optimalRoutes > 3) return false;
  if ((a.greedyMoves ?? 99) - a.optimum < Number(arg('gap', '2'))) return false;
  if (a.firstMoveCount < 3) return false; // enough choices that the first move matters
  const cells = [p.start, ...a.route];
  return cells.slice(1).filter((c, i) => distance(cells[i]!, c) === 1).length <= Number(arg('steps', '2'));
}
const climb = Number(arg('climb', '150'));
for (let t = 0; t < tries && found.length < want; t++) {
  const k = 6 + Math.floor(r() * 7);
  const pv = new Map<string, (typeof hex)[number]>();
  while (pv.size < k) { const c = pick(hex); pv.set(ck(c), c); }
  const start = pick(all), goal = pick(all);
  if (pv.has(ck(start)) || pv.has(ck(goal)) || ck(start) === ck(goal)) continue;
  let cur: Puzzle = { id: `gen-${seed}-${t}`, version: 1, title: 'x', lesson: '', start, goal, pivots: [...pv.values()], targetMoves: 0, reference: [] };
  let best = score(cur);
  for (let i = 0; i < climb; i++) {
    const piv = [...cur.pivots]; let st = cur.start, gl = cur.goal;
    const m = r();
    if (m < 0.7) piv[Math.floor(r() * piv.length)] = pick(hex);
    else if (m < 0.85) st = pick(all); else gl = pick(all);
    const occ = new Set(piv.map(ck));
    if (occ.size !== piv.length || occ.has(ck(st)) || occ.has(ck(gl)) || ck(st) === ck(gl)) continue;
    const cand = { ...cur, start: st, goal: gl, pivots: piv };
    const sc = score(cand);
    if (sc.s >= best.s) { cur = cand; best = sc; }
  }
  if (process.env.GEN_DEBUG) console.error('best', best.a.optimum, best.a.optimalRoutes, best.a.greedyMoves, best.a.firstMoveHitRate.toFixed(2));
  if (accept(cur, best.a)) found.push({ p: cur, a: best.a });
}
for (const { p, a } of found) {
  console.log(JSON.stringify({ start: p.start, goal: p.goal, pivots: p.pivots, optimum: a.optimum, routes: a.optimalRoutes, greedy: a.greedyMoves, firstMoves: a.firstMoveCount, hit: +a.firstMoveHitRate.toFixed(2), route: a.route }));
}
console.error(`${found.length}/${want} found`);
