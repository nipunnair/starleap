import type { TierName } from '../../ai/tiers';

export interface PersonalityParams {
  /** Multiplier on idle breathing / bounce amplitude. */
  readonly amplitude: number;
  /** Multiplier on animation speed (higher = faster/more energetic). */
  readonly frequency: number;
}

/** The four AI difficulty tiers, plus 'Astro' — the human player's own character, not a
 * difficulty (never appears in ai/tiers.ts's TierName or TIER_ORDER). CharacterAvatar and its
 * per-state portrait set treat all five identically; only ConfigScreen's difficulty picker cares
 * about the AI-only TierName distinction. */
export type CharacterId = TierName | 'Astro';

/**
 * SPEC.md §4.7: "personality is expressed through amplitude/frequency of the same six states,
 * not different assets." Nova bounces constantly and broadly; Rigel's motion is minimal and
 * precise; Sirius is near-static except a brief celebrate. Astro (composed, dignified per its
 * own portrait set's flavor text) sits with Sirius at the still end of that range.
 */
export const PERSONALITIES: Readonly<Record<CharacterId, PersonalityParams>> = {
  Nova: { amplitude: 1.6, frequency: 1.5 },
  Vega: { amplitude: 1.1, frequency: 1.1 },
  Rigel: { amplitude: 0.5, frequency: 0.8 },
  Sirius: { amplitude: 0.3, frequency: 0.6 },
  Astro: { amplitude: 0.35, frequency: 0.65 },
};
