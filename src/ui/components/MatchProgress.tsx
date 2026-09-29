import { CORNER_LABELS, waypointCorners } from './cornerGuidance';
import { cornerOf } from '../../engine/board';
import type { GameState } from '../../engine/state';
import type { SeatConfig } from './GameScreen';

export function MatchProgress({ game, seats }: { game: GameState; seats: readonly SeatConfig[] }) {
  const soloHuman = seats.filter(seat => seat === 'human').length === 1;
  const waypoints = waypointCorners(game);
  return <section className="match-progress" aria-label="Home progress and targets">
    <ul>
      {game.seats.map(seat => {
        const controller = seats[seat.player];
        const label = controller === 'human' ? soloHuman ? 'You' : `Human ${seat.player + 1}` : controller;
        const home = game.pegs.filter(peg => peg.owner === seat.player && cornerOf(peg.cell) === seat.targetCorner).length;
        return <li key={seat.player} data-testid={`home-progress-${seat.player}`}>
          <strong>{label}</strong>: Home {home}/10 · Target {CORNER_LABELS[seat.targetCorner]}
        </li>;
      })}
    </ul>
    <p>Corner letters mark your destinations.{waypoints.length > 0 && ` ${waypoints.map(c => CORNER_LABELS[c]).join(', ')}: ${game.cordonNeutralCorners ? 'waypoints only — pass through, do not stop' : 'open corners — stops allowed'}.`}</p>
  </section>;
}
