/**
 * AI Web Worker entry point. See docs/ARCHITECTURE.md "Worker protocol".
 *
 * The actual search dispatch (`computeFindMoveResponse`) is a plain, synchronous, directly
 * testable function with no worker-global dependency — a real `Worker` is unreliable to
 * construct inside vitest/jsdom, so tests exercise this function directly rather than a live
 * worker round-trip. The `self.onmessage` wiring below it is thin glue, guarded so it only
 * activates in an actual worker global scope (never during tests or a normal page load).
 */
import { chooseTieredMove, TIERS } from './tiers';
import type { WorkerRequest, WorkerResponse } from './worker-protocol';

type FindMoveRequest = Extract<WorkerRequest, { type: 'FIND_MOVE' }>;

export function computeFindMoveResponse(request: FindMoveRequest): WorkerResponse {
  try {
    const tier = TIERS[request.tier];
    const result = chooseTieredMove(request.state, request.player, request.playerCount, tier);
    return {
      type: 'MOVE_FOUND',
      requestId: request.requestId,
      move: result.move,
      evalScore: result.evalScore,
      depthReached: result.depthReached,
    };
  } catch (err) {
    return {
      type: 'ERROR',
      requestId: request.requestId,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

// `self` typed loosely here: DOM lib (needed by the rest of the app) and WebWorker lib declare
// incompatible ambient `self` types, so this file can't strongly type DedicatedWorkerGlobalScope
// without a second tsconfig project. `importScripts` only exists in a real worker global scope,
// which is what gates this wiring from ever running outside one (including in tests).
declare const self: {
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: { data: WorkerRequest }) => void) | null;
  importScripts?: unknown;
};

const cancelledRequestIds = new Set<string>();

if (typeof self !== 'undefined' && typeof self.importScripts === 'function') {
  self.onmessage = (event) => {
    const request = event.data;

    if (request.type === 'CANCEL') {
      cancelledRequestIds.add(request.requestId);
      return;
    }

    self.postMessage({ type: 'THINKING', requestId: request.requestId });
    const response = computeFindMoveResponse(request);

    // Search is synchronous and runs to completion before the next queued message (including
    // any CANCEL) is even dequeued — true mid-search interruption isn't possible in a single
    // worker thread. This check only guards the (normally unreachable) case where a CANCEL for
    // this exact requestId was already queued ahead of processing finishing. Real cancellation
    // is handled by tearing down and recreating the worker (see ARCHITECTURE.md).
    if (cancelledRequestIds.has(request.requestId)) {
      cancelledRequestIds.delete(request.requestId);
      return;
    }

    self.postMessage(response);
  };
}
