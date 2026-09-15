import type { CSSProperties } from 'react';
import type { TierName } from '../../ai/tiers';
import { PERSONALITIES } from './characterPersonality';

export type CharacterState = 'idle' | 'thinking' | 'found-it' | 'move' | 'celebrate' | 'worried';

export interface CharacterAvatarProps {
  readonly tier: TierName;
  readonly state: CharacterState;
}

export function CharacterAvatar({ tier, state }: CharacterAvatarProps) {
  const personality = PERSONALITIES[tier];

  return (
    <svg
      data-testid="character-avatar"
      data-state={state}
      data-tier={tier}
      viewBox="0 0 100 100"
      width={64}
      height={64}
      style={
        {
          '--amplitude': personality.amplitude,
          '--frequency': personality.frequency,
        } as CSSProperties
      }
      className={`starleap-avatar starleap-avatar--${state}`}
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
