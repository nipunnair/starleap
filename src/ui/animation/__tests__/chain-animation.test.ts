import { describe, expect, it } from 'vitest';
import { buildChainSegments, totalChainDurationMs, segmentAt, shouldShakeForMove } from '../chainAnimation';
import type { JumpChainMove, StepMove } from '../../../engine/moves';

const SPACING = 32;

function hop(from: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, n: number) {
  const scale = (c: typeof dir, k: number) => ({ x: c.x * k, y: c.y * k, z: c.z * k });
  const add = (a: typeof from, b: typeof dir) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
  const pivot = add(from, scale(dir, n));
  const landing = add(from, scale(dir, 2 * n));
  return { direction: dir, span: n, pivot, landing };
}

describe('buildChainSegments (SPEC.md §4.4)', () => {
  it('a step move produces a single segment with zero start delay', () => {
    const move: StepMove = { type: 'step', pegId: 'p', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: -1, z: 0 } };
    const segments = buildChainSegments(move, SPACING);
    expect(segments.length).toBe(1);
    expect(segments[0]!.startDelayMs).toBe(0);
    expect(segments[0]!.from).toEqual(move.from);
    expect(segments[0]!.to).toEqual(move.to);
  });

  it('a multi-hop chain has decreasing gaps between hops (8% decay)', () => {
    const dir = { x: 1, y: -1, z: 0 };
    const start = { x: -4, y: 4, z: 0 };
    const h1 = hop(start, dir, 1);
    const h2 = hop(h1.landing, dir, 1);
    const h3 = hop(h2.landing, dir, 1);
    const move: JumpChainMove = {
      type: 'jump',
      pegId: 'p',
      from: start,
      to: h3.landing,
      hops: [h1, h2, h3],
    };

    const segments = buildChainSegments(move, SPACING);
    expect(segments.length).toBe(3);

    const gap1 = segments[1]!.startDelayMs - (segments[0]!.startDelayMs + segments[0]!.durationMs);
    const gap2 = segments[2]!.startDelayMs - (segments[1]!.startDelayMs + segments[1]!.durationMs);
    expect(gap1).toBeCloseTo(70, 5);
    expect(gap2).toBeCloseTo(70 * 0.92, 5);
    expect(gap2).toBeLessThan(gap1);
  });

  it('totalChainDurationMs spans from the first segment start to the last segment end', () => {
    const move: StepMove = { type: 'step', pegId: 'p', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: -1, z: 0 } };
    const segments = buildChainSegments(move, SPACING);
    expect(totalChainDurationMs(segments)).toBe(segments[0]!.durationMs);
  });

  it('segmentAt finds the active segment and null during inter-hop gaps', () => {
    const dir = { x: 1, y: -1, z: 0 };
    const start = { x: -4, y: 4, z: 0 };
    const h1 = hop(start, dir, 1);
    const h2 = hop(h1.landing, dir, 1);
    const move: JumpChainMove = { type: 'jump', pegId: 'p', from: start, to: h2.landing, hops: [h1, h2] };
    const segments = buildChainSegments(move, SPACING);

    // Mid-first-hop.
    const mid1 = segmentAt(segments, segments[0]!.durationMs / 2);
    expect(mid1?.segment.hopIndex).toBe(0);
    expect(mid1!.t).toBeGreaterThan(0);
    expect(mid1!.t).toBeLessThan(1);

    // During the gap between hop 1 and hop 2.
    const gapMoment = segments[0]!.durationMs + 1;
    expect(segmentAt(segments, gapMoment)).toBeNull();

    // Mid-second-hop.
    const mid2 = segmentAt(segments, segments[1]!.startDelayMs + segments[1]!.durationMs / 2);
    expect(mid2?.segment.hopIndex).toBe(1);

    // Past the end.
    const total = totalChainDurationMs(segments);
    expect(segmentAt(segments, total + 100)).toBeNull();
  });
});

describe('shouldShakeForMove (SPEC.md §4.6)', () => {
  it('never shakes for a step', () => {
    const move: StepMove = { type: 'step', pegId: 'p', from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: -1, z: 0 } };
    expect(shouldShakeForMove(move)).toBe(false);
  });

  function buildStraightChain(hopCount: number): JumpChainMove {
    const dir = { x: 1, y: -1, z: 0 };
    const start = { x: -4, y: 4, z: 0 };
    let current = start;
    const hops = [];
    for (let i = 0; i < hopCount; i++) {
      const h = hop(current, dir, 1);
      hops.push(h);
      current = h.landing;
    }
    return { type: 'jump', pegId: 'p', from: start, to: current, hops };
  }

  it('does not shake for chains under 5 hops', () => {
    expect(shouldShakeForMove(buildStraightChain(4))).toBe(false);
  });

  it('shakes for chains of 5 or more hops', () => {
    expect(shouldShakeForMove(buildStraightChain(5))).toBe(true);
  });
});
