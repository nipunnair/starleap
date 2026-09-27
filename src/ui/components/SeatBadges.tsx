import type { CSSProperties } from 'react';
import { CORNER_APEX } from '../../engine/board';
import { project } from '../../engine/coords';
import type { GameState } from '../../engine/state';
import { CharacterAvatar, type CharacterState } from './CharacterAvatar';
import { BOARD_VIEWBOX, CELL_SPACING, PLAYER_COLORS, playerLabel } from './boardGeometry';
import type { SeatConfig } from './GameScreen';

const BADGE_SIZE = 44;
/** How far past each corner's outermost cell to push the badge — clears that corner's own peg
 * cluster instead of sitting on top of it, without drifting outside the board's SVG viewBox
 * (which already has generous padding — see boardGeometry.ts). */
const OUTWARD_OFFSET = 20;

export interface SeatBadgesProps {
  readonly game: GameState;
  readonly seats: readonly SeatConfig[];
  /** The seat to highlight as active — deliberately a separate prop rather than always reading
   * game.currentPlayer: the caller needs to keep highlighting a just-won seat through the
   * celebrate animation, after currentPlayer has already advanced past them. */
  readonly activePlayer: number;
  /** State to show for the active seat, if it's AI-controlled; every other seat renders 'idle'.
   * Ignored for human seats, which have no expression states. */
  readonly activeCharacterState: CharacterState;
}

/**
 * One identity badge per seat (AI portrait or a plain human marker), positioned at that player's
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

        return (
          <div
            key={seat.player}
            data-testid={`seat-badge-${seat.player}`}
            className={`seat-badge${isActive ? ' seat-badge--active' : ''}`}
            style={{ left: `${left}%`, top: `${top}%`, '--seat-color': color } as CSSProperties}
          >
            <div className="seat-badge__ring">
              {config === 'human' ? (
                <div className="seat-badge__human" data-testid="seat-badge-human">
                  <svg viewBox="0 0 24 24" width={BADGE_SIZE * 0.55} height={BADGE_SIZE * 0.55} aria-hidden="true">
                    <circle cx="12" cy="8" r="4" fill="currentColor" />
                    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="currentColor" />
                  </svg>
                </div>
              ) : (
                <CharacterAvatar tier={config} state={isActive ? activeCharacterState : 'idle'} size={BADGE_SIZE} />
              )}
            </div>
            <span className="seat-badge__label" data-testid={`seat-badge-label-${seat.player}`}>
              {playerLabel(seat.player)}
            </span>
          </div>
        );
      })}
    </>
  );
}
