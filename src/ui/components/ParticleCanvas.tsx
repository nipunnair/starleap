import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { BOARD_VIEWBOX } from './boardGeometry';

interface Ripple {
  readonly x: number;
  readonly y: number;
  readonly startedAt: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly startedAt: number;
}

const RIPPLE_DURATION_MS = 500;
const PARTICLE_DURATION_MS = 600;
const PARTICLE_COUNT = 14;

export interface ParticleCanvasHandle {
  ripple(x: number, y: number): void;
  burst(x: number, y: number): void;
}

export interface ParticleCanvasProps {
  readonly reducedMotion: boolean;
}

/**
 * SPEC.md §4.6 landing juice: ring ripple on every hop, particle burst only on target-triangle
 * landings. A single canvas overlay, positioned above the SVG board, driven by its own
 * requestAnimationFrame loop rather than React state — re-rendering React on every animation
 * frame for dozens of short-lived particles would be needlessly expensive (SPEC §5.3).
 */
export const ParticleCanvas = forwardRef<ParticleCanvasHandle, ParticleCanvasProps>(function ParticleCanvas(
  { reducedMotion },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    ripple(x: number, y: number) {
      if (reducedMotion) return;
      ripplesRef.current.push({ x, y, startedAt: performance.now() });
    },
    burst(x: number, y: number) {
      if (reducedMotion) return;
      const now = performance.now();
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const speed = 60 + Math.random() * 40;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          startedAt: now,
        });
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function draw(now: number) {
      const c = canvasRef.current;
      const context = ctx;
      if (!c || !context) return;

      context.clearRect(0, 0, c.width, c.height);
      context.save();
      context.scale(c.width / BOARD_VIEWBOX.width, c.height / BOARD_VIEWBOX.height);
      context.translate(-BOARD_VIEWBOX.minX, -BOARD_VIEWBOX.minY);

      ripplesRef.current = ripplesRef.current.filter((r) => now - r.startedAt < RIPPLE_DURATION_MS);
      for (const r of ripplesRef.current) {
        const t = (now - r.startedAt) / RIPPLE_DURATION_MS;
        context.beginPath();
        context.arc(r.x, r.y, 8 + t * 20, 0, Math.PI * 2);
        context.strokeStyle = `rgba(255, 255, 255, ${1 - t})`;
        context.lineWidth = 2;
        context.stroke();
      }

      particlesRef.current = particlesRef.current.filter((p) => now - p.startedAt < PARTICLE_DURATION_MS);
      for (const p of particlesRef.current) {
        const t = (now - p.startedAt) / PARTICLE_DURATION_MS;
        const dt = now - p.startedAt;
        const px = p.x + p.vx * (dt / 1000);
        const py = p.y + p.vy * (dt / 1000);
        context.beginPath();
        context.arc(px, py, 3 * (1 - t), 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 209, 102, ${1 - t})`;
        context.fill();
      }

      context.restore();
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="particle-canvas"
      width={640}
      height={640}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
});
