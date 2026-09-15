/**
 * Public API surface of the STARLEAP engine. UI and AI code should import from here rather
 * than reaching into individual engine modules directly. Zero imports outside engine/**.
 */
export type { Cube } from './coords';
export { onBoard, neighbors, distance, rotate60, project, NEIGHBOR_DIRECTIONS } from './coords';

export type { Board, CornerId } from './board';
export { BOARD, CORNER_IDS, OPPOSITE_CORNER, CORNER_APEX, cornerOf, isOnBoard } from './board';

export type { GameState, Seat, Peg, PlayerCount } from './state';
export { createInitialState, SEATING_PLANS, seatOf, pegAt, pegsOf } from './state';

export type { Move, StepMove, JumpChainMove, Hop } from './moves';
export {
  buildOccupancy,
  generateSteps,
  legalHopsFrom,
  generateJumpChains,
  generateLegalMoves,
  isLegalRestingCell,
  MAX_CHAIN_HOPS,
} from './moves';

export { applyMove, advanceTurnWithoutMove } from './apply';

export { ZOBRIST_TABLE, zobristHashOf, zobristUpdateForMove } from './zobrist';

export type { RankingEntry } from './terminal';
export {
  hasWon,
  isStalemate,
  isGameOver,
  playersFinished,
  rank,
  STALEMATE_ROUND_CAP,
} from './terminal';
