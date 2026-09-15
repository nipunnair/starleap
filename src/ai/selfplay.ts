/**
 * Headless self-play game runner. Used both by the `npm run selfplay`/`npm run tournament`
 * CLIs and by vitest for AI-quality gates. Imports engine only, never ui/.
 */
import { createInitialState, type PlayerCount } from '../engine/state';
import { generateLegalMoves, type Move } from '../engine/moves';
import { key } from '../engine/coords';
import { applyMove, advanceTurnWithoutMove } from '../engine/apply';
import { isGameOver, isStalemate, rank, type RankingEntry } from '../engine/terminal';

export type AIPlayer = (state: import('../engine/state').GameState, player: number) => Move | null;

export interface GameResult {
  readonly rounds: number;
  readonly plies: number;
  readonly stalemate: boolean;
  readonly illegalMoveCount: number;
  readonly moveGenTimesMs: number[];
  readonly ranking: readonly RankingEntry[];
  readonly winner: number | null;
}

function isMoveInSet(move: Move, legal: readonly Move[]): boolean {
  return legal.some((m) => m.pegId === move.pegId && key(m.to) === key(move.to));
}

/**
 * Plays one game to completion (a real win reduces the field to one unfinished player) or to
 * the 150-round stalemate cap, using `players[i]` to choose player i's move each turn.
 */
export function playHeadlessGame(playerCount: PlayerCount, players: readonly AIPlayer[]): GameResult {
  let state = createInitialState(playerCount);
  let illegalMoveCount = 0;
  let plies = 0;
  const moveGenTimesMs: number[] = [];

  while (!isGameOver(state)) {
    const player = state.currentPlayer;

    const t0 = performance.now();
    const legalMoves = generateLegalMoves(state, player);
    moveGenTimesMs.push(performance.now() - t0);

    if (legalMoves.length === 0) {
      // Theoretically reachable boxed-in edge case (SPEC.md defines no "pass" move) — advance
      // the turn rather than hang. See DECISIONS.md.
      state = advanceTurnWithoutMove(state);
      continue;
    }

    const chosen = players[player]!(state, player);
    if (chosen === null || !isMoveInSet(chosen, legalMoves)) {
      illegalMoveCount += 1;
      state = applyMove(state, legalMoves[0]!); // keep the game moving; still recorded as illegal
    } else {
      state = applyMove(state, chosen);
    }

    plies += 1;
  }

  const ranking = rank(state);
  return {
    rounds: state.round,
    plies,
    stalemate: isStalemate(state),
    illegalMoveCount,
    moveGenTimesMs,
    ranking,
    winner: ranking[0]!.pegsHome === 10 ? ranking[0]!.player : null,
  };
}
