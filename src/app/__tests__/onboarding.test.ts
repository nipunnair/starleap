import { describe, expect, it, beforeEach } from 'vitest';
import { hasSeenOnboarding, markOnboardingSeen } from '../onboarding';

describe('onboarding (IMPLEMENTATION_PLAN.md P11.5)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to not seen', () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it('reflects seen after marking', () => {
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it('treats malformed stored data as not seen rather than throwing', () => {
    localStorage.setItem('starleap.onboarding.v1', 'not-the-string-true');
    expect(() => hasSeenOnboarding()).not.toThrow();
    expect(hasSeenOnboarding()).toBe(false);
  });
});
