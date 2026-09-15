import { useEffect, useRef } from 'react';
import { project, type Cube } from '../../engine/coords';
import type { Move } from '../../engine/moves';
import { buildChainSegments, segmentAt, totalChainDurationMs } from '../animation/chainAnimation';
import { hopPosition, apexHeight, squashStretchScaleY, shadowFactor } from '../animation/hopPhysics';
import type { ToneSequencer } from '../audio/tones';
import { CELL_SPACING, CELL_RADIUS } from './boardGeometry';

export interface AnimatedPegProps {
  readonly move: Move;
  readonly color: string;
  readonly reducedMotion: boolean;
  readonly toneSequencer: ToneSequencer;
  readonly onComplete: () => void;
  /** Fires once per completed hop landing. */
  readonly onHopLanding: (landedCell: Cube, hopIndex: number, totalHops: number) => void;
}

/**
 * Animates one peg through its move's hop-by-hop path (SPEC.md §4.1-4.4). Position/scale/shadow
 * are written directly to DOM refs every animation frame rather than through React state — a
 * chain can be many hops long, and re-rendering the whole tree every frame for one peg would be
 * wasteful (matches the "not React state" performance guidance from §5.3's particle canvas).
 */
export function AnimatedPeg({ move, color, reducedMotion, toneSequencer, onComplete, onHopLanding }: AnimatedPegProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);
  const onCompleteRef = useRef(onComplete);
  const onHopLandingRef = useRef(onHopLanding);
  onCompleteRef.current = onComplete;
  onHopLandingRef.current = onHopLanding;

  const startPos = project(move.from, CELL_SPACING);
  const totalHops = move.type === 'jump' ? move.hops.length : 1;

  useEffect(() => {
    const segments = buildChainSegments(move, CELL_SPACING);
    const total = totalChainDurationMs(segments);

    if (reducedMotion) {
      const finalPos = project(move.to, CELL_SPACING);
      circleRef.current?.setAttribute('cx', String(finalPos.px));
      circleRef.current?.setAttribute('cy', String(finalPos.py));
      circleRef.current?.removeAttribute('transform');
      onHopLandingRef.current(move.to, totalHops - 1, totalHops);
      onCompleteRef.current();
      return;
    }

    let raf = 0;
    let startTime: number | null = null;
    const playedTones = new Set<number>();
    let lastCompletedHop = -1;

    function completedHopCount(elapsed: number): number {
      let count = 0;
      for (const s of segments) {
        if (elapsed >= s.startDelayMs + s.durationMs) count = s.hopIndex + 1;
      }
      return count;
    }

    function tick(now: number) {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const active = segmentAt(segments, elapsed);

      if (active) {
        const { segment, t } = active;
        if (!playedTones.has(segment.hopIndex)) {
          playedTones.add(segment.hopIndex);
          toneSequencer.playHopTone(segment.hopIndex);
        }

        const from = project(segment.from, CELL_SPACING);
        const to = project(segment.to, CELL_SPACING);
        const pixelDistance = Math.hypot(to.px - from.px, to.py - from.py);
        const apex = apexHeight(pixelDistance, CELL_SPACING);
        const pos = hopPosition(t, { x: from.px, y: from.py }, { x: to.px, y: to.py }, apex);
        const scaleY = squashStretchScaleY(t);
        const shadowScale = shadowFactor(t, apex);
        const groundX = from.px + (to.px - from.px) * t;
        const groundY = from.py + (to.py - from.py) * t;

        if (circleRef.current) {
          circleRef.current.setAttribute('cx', String(pos.x));
          circleRef.current.setAttribute('cy', String(pos.y));
          circleRef.current.setAttribute(
            'transform',
            `translate(${pos.x} ${pos.y}) scale(1 ${scaleY}) translate(${-pos.x} ${-pos.y})`,
          );
        }
        if (shadowRef.current) {
          shadowRef.current.setAttribute('cx', String(groundX));
          shadowRef.current.setAttribute('cy', String(groundY + CELL_RADIUS * 0.6));
          shadowRef.current.setAttribute('opacity', String(0.35 * shadowScale));
          shadowRef.current.setAttribute('rx', String(CELL_RADIUS * 0.6 * (0.6 + 0.4 * shadowScale)));
        }
      }

      const completed = completedHopCount(elapsed);
      if (completed > lastCompletedHop) {
        for (let h = lastCompletedHop + 1; h < completed; h++) {
          onHopLandingRef.current(segments[h]!.to, h, totalHops);
        }
        lastCompletedHop = completed - 1;
      }

      if (elapsed >= total) {
        onCompleteRef.current();
        return;
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [move, reducedMotion]);

  return (
    <g data-testid="animated-peg">
      <ellipse
        ref={shadowRef}
        cx={startPos.px}
        cy={startPos.py + CELL_RADIUS * 0.6}
        rx={CELL_RADIUS * 0.6}
        ry={CELL_RADIUS * 0.25}
        fill="rgba(0,0,0,0.5)"
      />
      <circle ref={circleRef} cx={startPos.px} cy={startPos.py} r={CELL_RADIUS * 0.72} fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
    </g>
  );
}
