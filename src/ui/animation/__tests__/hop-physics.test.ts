import { describe, expect, it } from 'vitest';
import {
  apexHeight,
  hopDuration,
  verticalOffset,
  easeInOutSine,
  hopPosition,
  squashStretchScaleY,
  shadowFactor,
  MIN_HOP_DURATION_MS,
  MAX_HOP_DURATION_MS,
} from '../hopPhysics';

describe('hop physics (SPEC.md §4.1-4.3)', () => {
  it('apexHeight grows with hop distance', () => {
    const spacing = 32;
    expect(apexHeight(spacing, spacing)).toBeCloseTo(spacing * 0.45, 5);
    expect(apexHeight(spacing * 4, spacing)).toBeGreaterThan(apexHeight(spacing, spacing));
  });

  it('hopDuration is clamped to [180, 420]ms', () => {
    const spacing = 32;
    expect(hopDuration(spacing, spacing)).toBeGreaterThanOrEqual(MIN_HOP_DURATION_MS);
    expect(hopDuration(spacing * 1000, spacing)).toBe(MAX_HOP_DURATION_MS);
  });

  it('verticalOffset peaks at t=0.5 and is zero at the endpoints', () => {
    const apex = 20;
    expect(verticalOffset(0, apex)).toBe(0);
    expect(verticalOffset(1, apex)).toBe(0);
    expect(verticalOffset(0.5, apex)).toBeCloseTo(apex, 5);
  });

  it('easeInOutSine passes through 0 and 1 at the endpoints', () => {
    expect(easeInOutSine(0)).toBeCloseTo(0, 5);
    expect(easeInOutSine(1)).toBeCloseTo(1, 5);
    expect(easeInOutSine(0.5)).toBeCloseTo(0.5, 5);
  });

  it('hopPosition starts at `from` and ends at `to`, arcing upward mid-flight', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const apex = 30;

    const start = hopPosition(0, from, to, apex);
    const end = hopPosition(1, from, to, apex);
    const mid = hopPosition(0.5, from, to, apex);

    expect(start.x).toBeCloseTo(0, 5);
    expect(start.y).toBeCloseTo(0, 5);
    expect(end.x).toBeCloseTo(100, 5);
    expect(end.y).toBeCloseTo(0, 5);
    expect(mid.y).toBeLessThan(0); // screen y decreases upward
    expect(mid.x).toBeCloseTo(50, 5);
  });

  it('squashStretchScaleY is 0.85 at takeoff/landing and 1.08 at apex', () => {
    expect(squashStretchScaleY(0)).toBeCloseTo(0.85, 5);
    expect(squashStretchScaleY(1)).toBeCloseTo(0.85, 5);
    expect(squashStretchScaleY(0.5)).toBeCloseTo(1.08, 5);
  });

  it('shadowFactor is 1 at ground level and 0 at the apex', () => {
    const apex = 20;
    expect(shadowFactor(0, apex)).toBeCloseTo(1, 5);
    expect(shadowFactor(1, apex)).toBeCloseTo(1, 5);
    expect(shadowFactor(0.5, apex)).toBeCloseTo(0, 5);
  });
});
