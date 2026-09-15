import type { TierName } from '../../ai/tiers';

export interface PersonalityParams {
  /** Multiplier on idle breathing / bounce amplitude. */
  readonly amplitude: number;
  /** Multiplier on animation speed (higher = faster/more energetic). */
  readonly frequency: number;
}

/**
 * SPEC.md §4.7: "personality is expressed through amplitude/frequency of the same six states,
 * not different assets." Nova bounces constantly and broadly; Rigel's motion is minimal and
 * precise; Sirius is near-static except a brief celebrate.
 */
export const PERSONALITIES: Readonly<Record<TierName, PersonalityParams>> = {
  Nova: { amplitude: 1.6, frequency: 1.5 },
  Vega: { amplitude: 1.1, frequency: 1.1 },
  Rigel: { amplitude: 0.5, frequency: 0.8 },
  Sirius: { amplitude: 0.3, frequency: 0.6 },
};
