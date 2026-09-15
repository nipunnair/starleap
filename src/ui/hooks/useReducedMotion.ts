import { useEffect, useState } from 'react';

export type ReducedMotionOverride = 'system' | 'on' | 'off';

/**
 * SPEC.md §4.8: arcs become instant, particles off, characters static. Non-optional as an OS
 * setting, but Phase 7's settings screen adds an in-app override on top of it — 'on'/'off'
 * force the behavior regardless of the OS preference, 'system' (default) just follows it.
 */
export function useReducedMotion(override: ReducedMotionOverride = 'system'): boolean {
  const [systemReduced, setSystemReduced] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  if (override === 'on') return true;
  if (override === 'off') return false;
  return systemReduced;
}
