import { describe, expect, it } from 'vitest';
import { PERSONALITIES } from '../components/characterPersonality';
import { TIER_ORDER } from '../../ai/tiers';

describe('PERSONALITIES (SPEC.md §4.7)', () => {
  it('defines amplitude/frequency for every tier', () => {
    for (const tier of TIER_ORDER) {
      expect(PERSONALITIES[tier].amplitude).toBeGreaterThan(0);
      expect(PERSONALITIES[tier].frequency).toBeGreaterThan(0);
    }
  });

  it('Nova is the most energetic (bounces constantly and broadly)', () => {
    const others = TIER_ORDER.filter((t) => t !== 'Nova');
    for (const tier of others) {
      expect(PERSONALITIES.Nova.amplitude).toBeGreaterThan(PERSONALITIES[tier].amplitude);
    }
  });

  it('Sirius is the least energetic (near-static)', () => {
    const others = TIER_ORDER.filter((t) => t !== 'Sirius');
    for (const tier of others) {
      expect(PERSONALITIES.Sirius.amplitude).toBeLessThan(PERSONALITIES[tier].amplitude);
    }
  });

  it('amplitude ordering matches the ladder: Nova > Vega > Rigel > Sirius', () => {
    expect(PERSONALITIES.Nova.amplitude).toBeGreaterThan(PERSONALITIES.Vega.amplitude);
    expect(PERSONALITIES.Vega.amplitude).toBeGreaterThan(PERSONALITIES.Rigel.amplitude);
    expect(PERSONALITIES.Rigel.amplitude).toBeGreaterThan(PERSONALITIES.Sirius.amplitude);
  });
});
