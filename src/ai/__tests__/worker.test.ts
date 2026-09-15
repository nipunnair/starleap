import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../engine/state';
import { generateLegalMoves } from '../../engine/moves';
import { computeFindMoveResponse } from '../worker';
import type { WorkerRequest } from '../worker-protocol';

function findMoveRequest(overrides: Partial<Extract<WorkerRequest, { type: 'FIND_MOVE' }>> = {}): Extract<WorkerRequest, { type: 'FIND_MOVE' }> {
  const state = createInitialState(2);
  return {
    type: 'FIND_MOVE',
    requestId: 'req-1',
    state,
    player: 0,
    playerCount: 2,
    tier: 'Nova',
    ...overrides,
  };
}

describe('computeFindMoveResponse (ARCHITECTURE.md worker protocol)', () => {
  it('returns MOVE_FOUND with a legal move for a healthy request', () => {
    const request = findMoveRequest();
    const response = computeFindMoveResponse(request);

    expect(response.type).toBe('MOVE_FOUND');
    if (response.type === 'MOVE_FOUND') {
      const legal = generateLegalMoves(request.state, request.player);
      expect(legal.some((m) => m.pegId === response.move.pegId)).toBe(true);
      expect(response.requestId).toBe('req-1');
    }
  });

  it('works for every tier', () => {
    for (const tier of ['Nova', 'Vega', 'Rigel', 'Sirius'] as const) {
      const response = computeFindMoveResponse(findMoveRequest({ tier, requestId: tier }));
      expect(response.type).toBe('MOVE_FOUND');
      expect(response.requestId).toBe(tier);
    }
  });

  it('works for 3+ player games (max^n dispatch)', () => {
    const state = createInitialState(4);
    const response = computeFindMoveResponse(
      findMoveRequest({ state, playerCount: 4, player: 0, tier: 'Rigel' }),
    );
    expect(response.type).toBe('MOVE_FOUND');
  });

  it('returns ERROR (not a thrown exception) when the player has no legal moves', () => {
    const state = createInitialState(2);
    const empty = { ...state, pegs: state.pegs.filter((p) => p.owner !== 0) };
    const response = computeFindMoveResponse(findMoveRequest({ state: empty }));

    expect(response.type).toBe('ERROR');
    expect(response.requestId).toBe('req-1');
  });
});
