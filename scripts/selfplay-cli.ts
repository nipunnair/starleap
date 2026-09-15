#!/usr/bin/env tsx
/**
 * `npm run selfplay -- --games N [--players 2|3|4|6]`
 * Runs N headless greedy-vs-greedy games and reports the Phase 2 gate metrics
 * (IMPLEMENTATION_PLAN.md P2.4-P2.5): illegal-move count, stalemate count, and
 * p50/p95/p99 move-generation time.
 */
import { playHeadlessGame, type AIPlayer } from '../src/ai/selfplay';
import { chooseGreedyMove } from '../src/ai/greedy';
import type { PlayerCount } from '../src/engine/state';

function parseArg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1]! : fallback;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}

const games = Number(parseArg('games', '20'));
const playerCount = Number(parseArg('players', '2')) as PlayerCount;
const greedyPlayer: AIPlayer = (state, player) => chooseGreedyMove(state, player);
const players: AIPlayer[] = Array.from({ length: playerCount }, () => greedyPlayer);

let illegalMoveCount = 0;
let stalemateCount = 0;
let moveCapHits = 0;
let totalPlies = 0;
const allTimings: number[] = [];

const start = performance.now();
for (let i = 0; i < games; i++) {
  const result = playHeadlessGame(playerCount, players);
  illegalMoveCount += result.illegalMoveCount;
  totalPlies += result.plies;
  allTimings.push(...result.moveGenTimesMs);
  if (result.stalemate) {
    stalemateCount += 1;
    moveCapHits += 1;
  }
}
const elapsedMs = performance.now() - start;

allTimings.sort((a, b) => a - b);

console.log(`STARLEAP self-play: ${games} games, ${playerCount} players`);
console.log(`  wall time:          ${(elapsedMs / 1000).toFixed(2)}s (${(elapsedMs / games).toFixed(1)}ms/game)`);
console.log(`  total plies:        ${totalPlies} (avg ${(totalPlies / games).toFixed(1)}/game)`);
console.log(`  illegal moves:      ${illegalMoveCount}`);
console.log(`  stalemates:         ${stalemateCount} / ${games}`);
console.log(`  move-cap hits:      ${moveCapHits} / ${games}`);
console.log(`  move-gen p50:       ${percentile(allTimings, 50).toFixed(3)}ms`);
console.log(`  move-gen p95:       ${percentile(allTimings, 95).toFixed(3)}ms`);
console.log(`  move-gen p99:       ${percentile(allTimings, 99).toFixed(3)}ms`);
console.log(`  move-gen max:       ${(allTimings[allTimings.length - 1] ?? 0).toFixed(3)}ms`);

if (illegalMoveCount > 0 || moveCapHits > 0) {
  process.exitCode = 1;
}
