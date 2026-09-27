import type { CSSProperties } from 'react';
import type { TierName } from '../../ai/tiers';
import { PERSONALITIES } from './characterPersonality';

export type CharacterState = 'idle' | 'thinking' | 'found-it' | 'move' | 'celebrate' | 'worried';

const CHARACTER_STATES: readonly CharacterState[] = [
  'idle',
  'thinking',
  'found-it',
  'move',
  'celebrate',
  'worried',
];

export interface CharacterAvatarProps {
  readonly tier: TierName;
  readonly state: CharacterState;
  /** Pixel width/height (square). Defaults to 64 — the original single fixed size. */
  readonly size?: number;
}

// Nano Banana-generated per-state portraits (art/avatars/<tier>-sheet.png, sliced by
// scripts/extract-avatar-sheet.py into src/assets/avatars/<tier>-<state>.webp). Tiers graduate to
// portrait mode as soon as all six of their state images exist; until then they fall back to the
// procedural SVG below unchanged, so this rolls out one character at a time.
const PORTRAIT_MODULES = import.meta.glob<string>('../../assets/avatars/*.webp', {
  eager: true,
  import: 'default',
});

function portraitFor(tier: TierName, state: CharacterState): string | undefined {
  const suffix = `/${tier.toLowerCase()}-${state}.webp`;
  const key = Object.keys(PORTRAIT_MODULES).find((k) => k.endsWith(suffix));
  return key ? PORTRAIT_MODULES[key] : undefined;
}

function hasFullPortraitSet(tier: TierName): boolean {
  return CHARACTER_STATES.every((s) => portraitFor(tier, s) !== undefined);
}

export function CharacterAvatar({ tier, state, size = 64 }: CharacterAvatarProps) {
  const personality = PERSONALITIES[tier];
  const style = {
    '--amplitude': personality.amplitude,
    '--frequency': personality.frequency,
  } as CSSProperties;
  const className = `starleap-avatar starleap-avatar--${state}`;

  if (hasFullPortraitSet(tier)) {
    return (
      <span
        data-testid="character-avatar"
        data-state={state}
        data-tier={tier}
        style={{ ...style, width: size, height: size }}
        className={`${className} starleap-avatar--portrait`}
      >
        <img className="starleap-avatar__face" src={portraitFor(tier, state)} alt="" width={size} height={size} />
        {state === 'thinking' && (
          <svg
            className="starleap-avatar__thinking-dots"
            data-testid="avatar-thinking-dots"
            viewBox="0 0 100 100"
            width={size}
            height={size}
          >
            <circle cx="50" cy="10" r="4" fill="#ffd166" />
            <circle cx="83" cy="50" r="4" fill="#ffd166" />
            <circle cx="17" cy="50" r="4" fill="#ffd166" />
          </svg>
        )}
      </span>
    );
  }

  return (
    <svg
      data-testid="character-avatar"
      data-state={state}
      data-tier={tier}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={style}
      className={className}
    >
      <circle className="starleap-avatar__face" cx="50" cy="50" r="40" fill="#2a2f4a" stroke="#4f8ff7" strokeWidth="3" />

      {state === 'thinking' && (
        <g className="starleap-avatar__thinking-dots" data-testid="avatar-thinking-dots">
          <circle cx="50" cy="18" r="3" fill="#ffd166" />
          <circle cx="76" cy="50" r="3" fill="#ffd166" />
          <circle cx="24" cy="50" r="3" fill="#ffd166" />
        </g>
      )}

      <g className="starleap-avatar__eyes">
        <circle cx="36" cy="45" r={state === 'worried' ? 6 : 4} fill="#f4f4f8" />
        <circle cx="64" cy="45" r={state === 'worried' ? 6 : 4} fill="#f4f4f8" />
      </g>

      <path
        className="starleap-avatar__mouth"
        d={
          state === 'worried'
            ? 'M 35 68 Q 50 58 65 68' // frown
            : state === 'celebrate'
              ? 'M 32 60 Q 50 82 68 60' // big grin
              : 'M 35 62 Q 50 70 65 62' // neutral/content
        }
        fill="none"
        stroke="#f4f4f8"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
