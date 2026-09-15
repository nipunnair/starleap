import { describe, expect, it } from 'vitest';
import { describeMove } from '../describeMove';
import type { StepMove, JumpChainMove } from '../../../engine/moves';

describe('describeMove (SPEC.md P8.4)', () => {
  it('describes a step', () => {
    const move: StepMove = { type: 'step', pegId: 'p', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: -1, z: 0 } };
    expect(describeMove(move, 'Player 0')).toBe('Player 0 steps to cell 1, -1, 0.');
  });

  it('describes a single-hop jump using singular "hop"', () => {
    const move: JumpChainMove = {
      type: 'jump',
      pegId: 'p',
      from: { x: 0, y: 0, z: 0 },
      to: { x: 2, y: -2, z: 0 },
      hops: [{ direction: { x: 1, y: -1, z: 0 }, span: 1, pivot: { x: 1, y: -1, z: 0 }, landing: { x: 2, y: -2, z: 0 } }],
    };
    expect(describeMove(move, 'Nova')).toBe('Nova jumps from cell 0, 0, 0 to cell 2, -2, 0, 1 hop.');
  });

  it('describes a multi-hop chain using plural "hops"', () => {
    const move: JumpChainMove = {
      type: 'jump',
      pegId: 'p',
      from: { x: 0, y: 0, z: 0 },
      to: { x: 4, y: -4, z: 0 },
      hops: [
        { direction: { x: 1, y: -1, z: 0 }, span: 1, pivot: { x: 1, y: -1, z: 0 }, landing: { x: 2, y: -2, z: 0 } },
        { direction: { x: 1, y: -1, z: 0 }, span: 1, pivot: { x: 3, y: -3, z: 0 }, landing: { x: 4, y: -4, z: 0 } },
      ],
    };
    expect(describeMove(move, 'Nova')).toBe('Nova jumps from cell 0, 0, 0 to cell 4, -4, 0, 2 hops.');
  });
});
