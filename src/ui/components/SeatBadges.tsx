import type { CSSProperties } from 'react';
import { CORNER_APEX } from '../../engine/board';
import { project } from '../../engine/coords';
import type { GameState } from '../../engine/state';
import { CharacterAvatar, type CharacterState } from './CharacterAvatar';
import { BOARD_VIEWBOX, CELL_SPACING, PLAYER_COLORS } from './boardGeometry';
import type { SeatConfig } from './GameScreen';

/** Smaller than the in-game single-avatar's old fixed 64px, deliberately: the badge's own size is
 * fixed CSS px (unlike the board, which scales with the viewport), so a smaller badge needs less
 * outward push to clear the corner's topmost peg — and has a smaller footprint to overflow a
 * narrow viewport with (see OUTWARD_OFFSET; the previous, larger size overflowed at 360px). */
const BADGE_SIZE = 36;
/** How far past each corner's outermost cell to push the badge — clears that corner's own peg
 * cluster instead of sitting on top of it. The peg at the corner's apex cell has visual radius
 * `CELL_RADIUS * 0.72` (~9.4 viewBox units, see Peg.tsx); tuned against the actual rendered
 * result (a smaller starting value visibly overlapped) rather than computed exactly, since the
 * badge's fixed-px size vs. the board's own responsive scale makes an exact figure viewport-
 * dependent anyway. */
const OUTWARD_OFFSET = 28;
/** The human seat's own character — see characterPersonality.ts. Not a TierName (never
 * selectable as an AI difficulty); just another CharacterId as far as CharacterAvatar cares. */
const HUMAN_CHARACTER = 'Astro';

export interface SeatBadgesProps {
  readonly game: GameState;
  readonly seats: readonly SeatConfig[];
  /** The seat to highlight as active — deliberately a separate prop rather than always reading
   * game.currentPlayer: the caller needs to keep highlighting a just-won seat through the
   * celebrate animation, after currentPlayer has already advanced past them. */
  readonly activePlayer: number;
  /** State to show for the active seat. GameScreen only ever drives 'thinking'/'found-it' for an
   * AI-controlled seat (a human doesn't run a search to reveal), but 'move'/'celebrate'/'worried'
   * apply to either. */
  readonly activeCharacterState: CharacterState;
}

/**
 * One identity badge per seat (each seat's own character portrait), positioned at that player's
 * own starting corner — replaces the old single fixed "the opponent" avatar, which only ever
 * showed the first AI seat and never updated for the others in 3+-player games (see
 * DECISIONS.md).
 */
export function SeatBadges({ game, seats, activePlayer, activeCharacterState }: SeatBadgesProps) {
  const { minX, minY, width, height } = BOARD_VIEWBOX;

  return (
    <>
      {game.seats.map((seat) => {
        const config = seats[seat.player];
        if (!config) return null;

        const apex = project(CORNER_APEX[seat.startCorner], CELL_SPACING);
        const dist = Math.hypot(apex.px, apex.py) || 1;
        const px = apex.px + (apex.px / dist) * OUTWARD_OFFSET;
        const py = apex.py + (apex.py / dist) * OUTWARD_OFFSET;
        const left = ((px - minX) / width) * 100;
        const top = ((py - minY) / height) * 100;
        const isActive = seat.player === activePlayer;
        const color = PLAYER_COLORS[seat.player % PLAYER_COLORS.length]!;
        const tier = config === 'human' ? HUMAN_CHARACTER : config;

        return (
          <div
            key={seat.player}
            data-testid={`seat-badge-${seat.player}`}
            className={`seat-badge${isActive ? ' seat-badge--active' : ''}`}
            style={{ left: `${left}%`, top: `${top}%`, '--seat-color': color } as CSSProperties}
          >
            <div className="seat-badge__ring">
              <CharacterAvatar tier={tier} state={isActive ? activeCharacterState : 'idle'} size={BADGE_SIZE} />
            </div>
            <span className="seat-badge__label" data-testid={`seat-badge-label-${seat.player}`}>
              {tier}
            </span>
          </div>
        );
      })}
    </>
  );
}
