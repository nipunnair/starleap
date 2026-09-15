/**
 * Main-thread <-> AI Web Worker message protocol. See docs/ARCHITECTURE.md "Worker protocol".
 * Imported by both worker.ts and the future ui/hooks/useAIWorker — keeps the two sides in sync.
 */
import type { GameState, PlayerCount } from '../engine/state';
import type { Move } from '../engine/moves';
import type { TierName } from './tiers';

export type WorkerRequest =
  | { type: 'FIND_MOVE'; requestId: string; state: GameState; player: number; playerCount: PlayerCount; tier: TierName }
  | { type: 'CANCEL'; requestId: string };

export type WorkerResponse =
  | { type: 'THINKING'; requestId: string }
  | { type: 'MOVE_FOUND'; requestId: string; move: Move; evalScore: number; depthReached: number }
  | { type: 'ERROR'; requestId: string; message: string };
