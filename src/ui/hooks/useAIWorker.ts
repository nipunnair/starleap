import { useCallback, useEffect, useRef, useState } from 'react';
import AIWorker from '../../ai/worker.ts?worker&inline';
import type { GameState, PlayerCount } from '../../engine/state';
import type { Move } from '../../engine/moves';
import type { TierName } from '../../ai/tiers';
import type { WorkerRequest, WorkerResponse } from '../../ai/worker-protocol';

export interface AIWorkerResult {
  readonly move: Move;
  readonly evalScore: number;
  readonly depthReached: number;
}

/**
 * Wraps the AI Web Worker per ARCHITECTURE.md's protocol. One worker per hook instance, torn
 * down and recreated by React only on unmount/remount (a new game/tier change in the app is
 * handled by the caller simply issuing a new findMove call — see DECISIONS.md on why CANCEL
 * doesn't try to interrupt an in-progress search).
 */
export function useAIWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [thinking, setThinking] = useState(false);
  const resolverRef = useRef<((result: AIWorkerResult) => void) | null>(null);
  const requestIdRef = useRef<string | null>(null);

  useEffect(() => {
    // `?worker&inline` base64-embeds the worker's bundled source directly into the importing
    // chunk instead of emitting it as a separate file referenced by URL — required for the
    // singlefile build (opened via `file://`, which can't load a worker from a relative script
    // URL or a cross-origin blob in most browsers) and works identically in the normal multi-file
    // build, so both build targets share this one code path (see DECISIONS.md P9.2).
    const worker = new AIWorker();

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.requestId !== requestIdRef.current) return; // stale response, ignore

      if (response.type === 'THINKING') {
        setThinking(true);
      } else if (response.type === 'MOVE_FOUND') {
        setThinking(false);
        resolverRef.current?.({
          move: response.move,
          evalScore: response.evalScore,
          depthReached: response.depthReached,
        });
        resolverRef.current = null;
      } else if (response.type === 'ERROR') {
        setThinking(false);
        console.error('AI worker error:', response.message);
        resolverRef.current = null;
      }
    };

    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const findMove = useCallback(
    (state: GameState, player: number, playerCount: PlayerCount, tier: TierName): Promise<AIWorkerResult> => {
      return new Promise((resolve) => {
        const requestId = `${Date.now()}-${Math.random()}`;
        requestIdRef.current = requestId;
        resolverRef.current = resolve;
        const request: WorkerRequest = { type: 'FIND_MOVE', requestId, state, player, playerCount, tier };
        workerRef.current?.postMessage(request);
      });
    },
    [],
  );

  return { thinking, findMove };
}
