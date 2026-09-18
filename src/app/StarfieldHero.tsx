interface Star {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly delay: number;
  readonly duration: number;
}

const STAR_COUNT = 40;

// Deterministic pseudo-random layout (sine-based, not Math.random) so the hero renders
// identically on every load rather than reshuffling on each mount.
function makeStars(count: number): Star[] {
  const frac = (n: number) => ((Math.sin(n) * 10000) % 1 + 1) % 1;
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const seed = i * 12.9898;
    stars.push({
      x: frac(seed) * 100,
      y: frac(seed + 1) * 100,
      radius: 0.4 + frac(seed + 2) * 0.9,
      delay: frac(seed + 3) * 4,
      duration: 2 + frac(seed + 4) * 3,
    });
  }
  return stars;
}

const STARS = makeStars(STAR_COUNT);

/**
 * P13.3: lightweight CSS-animated star field behind the menu header. Pure SVG + CSS
 * `@keyframes` (no canvas, no reuse of the gameplay `ParticleCanvas`). Twinkle animation is
 * disabled under `prefers-reduced-motion` by the existing blanket rule in global.css (same
 * pattern as P5.7/P8.5), leaving static stars.
 */
export function StarfieldHero() {
  return (
    <svg
      className="starleap-starfield"
      data-testid="starfield-hero"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {STARS.map((star, i) => (
        <circle
          key={i}
          className="starleap-star"
          cx={star.x}
          cy={star.y}
          r={star.radius}
          style={{
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </svg>
  );
}
