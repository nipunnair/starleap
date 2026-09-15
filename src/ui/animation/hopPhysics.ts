/**
 * Hop physics per SPEC.md §4.1. Pure functions — no DOM, no timers — so they're directly
 * testable and reusable by both the SVG peg animation and (later) any canvas overlay work.
 */

export const MIN_HOP_DURATION_MS = 180;
export const MAX_HOP_DURATION_MS = 420;

/** Apex height for a hop of `hopDistance` px at the board's cell `spacing` px. */
export function apexHeight(hopDistance: number, spacing: number): number {
  return spacing * 0.45 * Math.sqrt(hopDistance / spacing);
}

/** Duration in ms, clamped to [180, 420]. */
export function hopDuration(hopDistance: number, spacing: number): number {
  const duration = MIN_HOP_DURATION_MS + 40 * Math.sqrt(hopDistance / spacing);
  return Math.min(duration, MAX_HOP_DURATION_MS);
}

/** Vertical offset at normalized time t in [0,1]: a parabola peaking at `apex` when t=0.5. */
export function verticalOffset(t: number, apex: number): number {
  return 4 * apex * t * (1 - t);
}

/** Eases so the hop reads as a launch/landing rather than a linear slide. */
export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export interface HopPosition {
  readonly x: number;
  readonly y: number;
}

/**
 * Full interpolated screen position at normalized time t for a hop from (x0,y0) to (x1,y1),
 * with the vertical parabolic arc layered on top of the eased horizontal path.
 */
export function hopPosition(t: number, from: HopPosition, to: HopPosition, apex: number): HopPosition {
  const eased = easeInOutSine(t);
  const x = from.x + (to.x - from.x) * eased;
  const yLinear = from.y + (to.y - from.y) * eased;
  const y = yLinear - verticalOffset(t, apex);
  return { x, y };
}

/** Squash/stretch scaleY per SPEC §4.2: 0.85 at takeoff/landing, 1.08 at apex. */
export function squashStretchScaleY(t: number): number {
  const takeoffLanding = 0.85;
  const apexScale = 1.08;
  // Parabolic interpolation peaking at t=0.5, matching the same shape as the height arc.
  const arc = 4 * t * (1 - t);
  return takeoffLanding + (apexScale - takeoffLanding) * arc;
}

/** Shadow opacity/scale are inversely proportional to current height (SPEC §4.3). */
export function shadowFactor(t: number, apex: number): number {
  if (apex === 0) return 1;
  const height = verticalOffset(t, apex);
  return Math.max(0, 1 - height / apex);
}
