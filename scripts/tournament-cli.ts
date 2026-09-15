#!/usr/bin/env tsx
/**
 * `npm run tournament -- --games N [--players 2] [--scale 1.0]`
 * Round-robin across all four tiers (IMPLEMENTATION_PLAN.md P3.7-P3.9): reports the win-rate
 * matrix plus illegal-move/non-terminating/p95-movegen stats, and checks SPEC.md §3.4's
 * monotonic-strength requirement (each tier beats the tier directly below it at >=60%).
 *
 * `--scale` multiplies every tier's timeBudgetMs (default 1.0 = the real SPEC.md §3.3 values).
 * The real budgets (up to 2.5s/move) are sized for human-facing gameplay, not for running
 * hundreds of automated games — see DECISIONS.md for the actual scale factor used for the
 * committed gate run and why.
 */
import { playHeadlessGame, type AIPlayer } from '../src/ai/selfplay';
import { chooseTieredMove, TIERS, TIER_ORDER, type TierName, type TierConfig } from '../src/ai/tiers';
import type { PlayerCount } from '../src/engine/state';

function parseArg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1]! : fallback;
}

const games = Number(parseArg('games', '20'));
const playerCount = Number(parseArg('players', '2')) as PlayerCount;
const scale = Number(parseArg('scale', '1'));

function scaledTier(tier: TierConfig): TierConfig {
  return { ...tier, timeBudgetMs: Math.max(5, Math.round(tier.timeBudgetMs * scale)) };
}

function playerFor(tierName: TierName): AIPlayer {
  const tier = scaledTier(TIERS[tierName]);
  return (state, player, visitedHashes) =>
    chooseTieredMove(state, player, playerCount, tier, undefined, undefined, visitedHashes).move;
}

interface PairingResult {
  readonly a: TierName;
  readonly b: TierName;
  readonly aWins: number;
  readonly bWins: number;
  readonly draws: number;
  readonly illegalMoves: number;
  readonly moveGenTimings: number[];
}

function runPairing(a: TierName, b: TierName, n: number): PairingResult {
  let aWins = 0;
  let bWins = 0;
  let draws = 0;
  let illegalMoves = 0;
  const moveGenTimings: number[] = [];

  for (let i = 0; i < n; i++) {
    // Alternate who plays player 0 to cancel out first-move advantage.
    const aIsFirst = i % 2 === 0;
    const players: AIPlayer[] = aIsFirst ? [playerFor(a), playerFor(b)] : [playerFor(b), playerFor(a)];

    const result = playHeadlessGame(playerCount, players);
    illegalMoves += result.illegalMoveCount;
    moveGenTimings.push(...result.moveGenTimesMs);

    if (result.winner === null) {
      draws += 1;
    } else {
      const winnerIsA = aIsFirst ? result.winner === 0 : result.winner === 1;
      if (winnerIsA) aWins += 1;
      else bWins += 1;
    }
  }

  return { a, b, aWins, bWins, draws, illegalMoves, moveGenTimings };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}

console.log(`STARLEAP tournament: ${games} games/pairing, ${playerCount} players, time scale ${scale}x`);
console.log('Tiers (scaled):', TIER_ORDER.map((t) => `${t}=${scaledTier(TIERS[t]).timeBudgetMs}ms`).join(', '));
console.log('');

const allTimings: number[] = [];
let totalIllegal = 0;
const results: PairingResult[] = [];

for (let i = 0; i < TIER_ORDER.length; i++) {
  for (let j = i + 1; j < TIER_ORDER.length; j++) {
    const a = TIER_ORDER[i]!;
    const b = TIER_ORDER[j]!;
    const result = runPairing(a, b, games);
    results.push(result);
    allTimings.push(...result.moveGenTimings);
    totalIllegal += result.illegalMoves;

    const aWinRate = (result.aWins / games) * 100;
    const bWinRate = (result.bWins / games) * 100;
    console.log(
      `${a.padEnd(7)} vs ${b.padEnd(7)}  ${a}:${result.aWins} (${aWinRate.toFixed(1)}%)  ${b}:${result.bWins} (${bWinRate.toFixed(1)}%)  draws:${result.draws}`,
    );
  }
}

allTimings.sort((a, b) => a - b);
console.log('');
console.log(`Total illegal moves: ${totalIllegal}`);
console.log(`Move-gen p95: ${percentile(allTimings, 95).toFixed(3)}ms  (max ${(allTimings[allTimings.length - 1] ?? 0).toFixed(3)}ms)`);

console.log('');
console.log('Monotonic-strength check (each tier must beat the tier directly below at >=60%):');
let monotonic = true;
for (let i = 0; i < TIER_ORDER.length - 1; i++) {
  const lower = TIER_ORDER[i]!;
  const higher = TIER_ORDER[i + 1]!;
  const pairing = results.find((r) => r.a === lower && r.b === higher)!;
  const higherWinRate = (pairing.bWins / games) * 100;
  const pass = higherWinRate >= 60;
  monotonic &&= pass;
  console.log(`  ${higher} beats ${lower}: ${higherWinRate.toFixed(1)}% ${pass ? 'PASS' : 'FAIL'}`);
}

console.log('');
console.log(monotonic && totalIllegal === 0 ? 'GATE: PASS' : 'GATE: FAIL');
if (!monotonic || totalIllegal > 0) process.exitCode = 1;
