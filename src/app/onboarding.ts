/**
 * Versioned key name (same reasoning as persistence.ts's SAVE_KEY): a future incompatible
 * format bumps this to `.v2`, and old values simply become invisible (treated as "not seen")
 * rather than needing an explicit version-field check.
 */
const ONBOARDING_KEY = 'starleap.onboarding.v1';

/** All localStorage access is best-effort: private browsing, quota, or disabled storage must
 * never crash the game — a failed read/write just falls back to "not yet seen." */
export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // ignored — see comment above
  }
}
