import { BOARD } from '../../engine/board';
import { createInitialState } from '../../engine/state';
import { createSessionStats, RECORD_VERSIONS, type SessionContext } from '../sessionStats';

export function outcome(id = 'one', winner = 0, context: Partial<SessionContext> = {}, moves = 30, chain = 3) {
  const game = createInitialState(2);
  let home = 0, other = 0;
  const gameState = { ...game, pegs: game.pegs.map(p => ({ ...p, hasLeftStart: true,
    cell: p.owner === winner ? BOARD.corners[game.seats[winner]!.targetCorner][home++]! : BOARD.hexagon[other++]!,
  })) };
  const stats = { ...createSessionStats({ sessionId: id, startedAt: 100, mode: 'standard', playerCount: 2,
    controllers: ['human', 'Nova'], cordonNeutralCorners: true, versions: RECORD_VERSIONS, ...context }),
    lastEventSequence: 100, seats: [{ moves, longestChain: chain, longHops: 1 }, { moves: 20, longestChain: 8, longHops: 3 }] };
  return { version: 2 as const, playerCount: 2 as const, seats: stats.context.controllers, gameState, savedAt: 500,
    snapshot: { game: gameState, stats, previousGame: null, canUndo: false } };
}
