/**
 * Zobrist hashing for the AI's transposition table (SPEC.md §3.2). Zero imports outside
 * coords.ts/board.ts/state.ts (all themselves zero-import).
 */
import { key } from './coords';
import { BOARD } from './board';
import type { GameState, Peg } from './state';
import type { Move } from './moves';

/**
 * Deterministic 64-bit splitmix64 PRNG — reproducible across runs (useful for tests) without
 * needing a platform random source. Not cryptographic; that's not a requirement here.
 */
function splitmix64(seed: bigint): () => bigint {
  let state = seed;
  const MASK = (1n << 64n) - 1n;
  return () => {
    state = (state + 0x9e3779b97f4a7c15n) & MASK;
    let z = state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK;
    return z ^ (z >> 31n);
  };
}

const MAX_PLAYERS = 6;

interface ZobristTable {
  /** keyed by `${cellKey}|${player}|${hasLeftStart ? 1 : 0}` */
  readonly pegEntries: ReadonlyMap<string, bigint>;
  readonly turnEntries: readonly bigint[];
}

function buildTable(seed = 0x5eedn): ZobristTable {
  const rand = splitmix64(seed);
  const pegEntries = new Map<string, bigint>();

  for (const cell of BOARD.cells) {
    const cellKey = key(cell);
    for (let player = 0; player < MAX_PLAYERS; player++) {
      for (const hasLeftStart of [false, true]) {
        pegEntries.set(`${cellKey}|${player}|${hasLeftStart ? 1 : 0}`, rand());
      }
    }
  }

  const turnEntries = Array.from({ length: MAX_PLAYERS }, () => rand());

  return { pegEntries, turnEntries };
}

export const ZOBRIST_TABLE: ZobristTable = buildTable();

function pegEntry(table: ZobristTable, peg: Peg): bigint {
  const k = `${key(peg.cell)}|${peg.owner}|${peg.hasLeftStart ? 1 : 0}`;
  const value = table.pegEntries.get(k);
  if (value === undefined) throw new Error(`no zobrist entry for ${k}`);
  return value;
}

/** Full hash computation: O(pegs). Use for the initial hash of a game; prefer the incremental
 * update below on every subsequent move. */
export function zobristHashOf(state: GameState, table: ZobristTable = ZOBRIST_TABLE): bigint {
  let hash = 0n;
  for (const peg of state.pegs) {
    hash ^= pegEntry(table, peg);
  }
  hash ^= table.turnEntries[state.currentPlayer]!;
  return hash;
}

/**
 * Incremental update: given the hash of `prevState`, the move applied, and the resulting
 * `nextState`, returns the new hash in O(1) rather than recomputing from scratch. Only the
 * moved peg's entry and the turn entry change; every other peg's contribution is unaffected.
 */
export function zobristUpdateForMove(
  prevHash: bigint,
  prevState: GameState,
  move: Move,
  nextState: GameState,
  table: ZobristTable = ZOBRIST_TABLE,
): bigint {
  const prevPeg = prevState.pegs.find((p) => p.id === move.pegId);
  const nextPeg = nextState.pegs.find((p) => p.id === move.pegId);
  if (!prevPeg || !nextPeg) throw new Error(`peg ${move.pegId} not found for zobrist update`);

  let hash = prevHash;
  hash ^= pegEntry(table, prevPeg);
  hash ^= pegEntry(table, nextPeg);
  hash ^= table.turnEntries[prevState.currentPlayer]!;
  hash ^= table.turnEntries[nextState.currentPlayer]!;
  return hash;
}
