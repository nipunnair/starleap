/**
 * Turns a Move into a timed sequence of hop segments for animation playback. Pure/testable —
 * no DOM, no timers. See docs/SPEC.md §4.4 (chain pacing).
 */
import { distance, type Cube } from '../../engine/coords';
import type { Move } from '../../engine/moves';
import { hopDuration } from './hopPhysics';

export interface HopSegment {
  readonly from: Cube;
  readonly to: Cube;
  readonly startDelayMs: number;
  readonly durationMs: number;
  readonly hopIndex: number;
}

const INITIAL_GAP_MS = 70;
const GAP_DECAY = 0.92; // -8% per hop, per SPEC §4.4

/**
 * Every hop in `move`, each carrying its own cumulative start delay and duration. Gaps between
 * hops shrink 8% per hop so long chains visibly accelerate. Pixel distance per hop is derived
 * from cube distance (exact for a straight-line hop of any span) times `spacing`.
 */
export function buildChainSegments(move: Move, spacing: number): HopSegment[] {
  if (move.type === 'step') {
    const cellDistance = distance(move.from, move.to);
    return [
      {
        from: move.from,
        to: move.to,
        startDelayMs: 0,
        durationMs: hopDuration(cellDistance * spacing, spacing),
        hopIndex: 0,
      },
    ];
  }

  const segments: HopSegment[] = [];
  let current = move.from;
  let cumulative = 0;
  let gap = INITIAL_GAP_MS;

  move.hops.forEach((hop, i) => {
    const cellDistance = distance(current, hop.landing);
    const durationMs = hopDuration(cellDistance * spacing, spacing);
    segments.push({ from: current, to: hop.landing, startDelayMs: cumulative, durationMs, hopIndex: i });
    cumulative += durationMs;
    if (i < move.hops.length - 1) {
      cumulative += gap;
      gap *= GAP_DECAY;
    }
    current = hop.landing;
  });

  return segments;
}

/** SPEC.md §4.6: 3px screen shake on chains of 5+ hops. */
const SHAKE_HOP_THRESHOLD = 5;

export function shouldShakeForMove(move: Move): boolean {
  return move.type === 'jump' && move.hops.length >= SHAKE_HOP_THRESHOLD;
}

export function totalChainDurationMs(segments: readonly HopSegment[]): number {
  const last = segments[segments.length - 1];
  return last ? last.startDelayMs + last.durationMs : 0;
}

/** Which segment is active (and its local progress t in [0,1]) at `elapsedMs` since chain start. */
export function segmentAt(
  segments: readonly HopSegment[],
  elapsedMs: number,
): { segment: HopSegment; t: number } | null {
  for (const segment of segments) {
    const localElapsed = elapsedMs - segment.startDelayMs;
    if (localElapsed < 0) return null; // still in the inter-hop gap before this segment
    if (localElapsed <= segment.durationMs) {
      return { segment, t: segment.durationMs === 0 ? 1 : localElapsed / segment.durationMs };
    }
  }
  return null; // past the end
}
