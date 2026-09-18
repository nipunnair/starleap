import { useState } from 'react';
import type { PlayerCount } from '../engine/state';
import type { SeatConfig } from '../ui/components/GameScreen';
import { TIER_ORDER, type TierName } from '../ai/tiers';
import { playerLabel } from '../ui/components/boardGeometry';

export const TIER_BLURBS: Readonly<Record<TierName, string>> = {
  Nova: 'Nova plays fast and loose, with plenty of random surprises. Easiest opponent.',
  Vega: 'Vega plans a little further ahead and makes fewer random mistakes than Nova.',
  Rigel: 'Rigel plays a genuinely tactical game with real lookahead. A tough fight.',
  Sirius: 'Sirius searches deep and rarely blunders. The strongest opponent.',
};

export interface GameConfigResult {
  readonly playerCount: PlayerCount;
  readonly seats: readonly SeatConfig[];
}

export interface ConfigScreenProps {
  readonly onStart: (config: GameConfigResult) => void;
  readonly onBack: () => void;
}

const PLAYER_COUNTS: PlayerCount[] = [2, 3, 4, 6];
const SEAT_OPTIONS: readonly SeatConfig[] = ['human', ...TIER_ORDER];

export function ConfigScreen({ onStart, onBack }: ConfigScreenProps) {
  const [playerCount, setPlayerCount] = useState<PlayerCount>(2);
  const [seats, setSeats] = useState<SeatConfig[]>(['human', 'Nova']);

  function changePlayerCount(count: PlayerCount) {
    setPlayerCount(count);
    setSeats((prev) => {
      const next = [...prev];
      while (next.length < count) next.push('Nova');
      return next.slice(0, count);
    });
  }

  function changeSeat(index: number, seat: SeatConfig) {
    setSeats((prev) => prev.map((s, i) => (i === index ? seat : s)));
  }

  return (
    <main data-testid="config-screen">
      <h1>New game</h1>

      <fieldset>
        <legend>Players</legend>
        {PLAYER_COUNTS.map((count) => (
          <label key={count}>
            <input
              type="radio"
              name="playerCount"
              value={count}
              checked={playerCount === count}
              onChange={() => changePlayerCount(count)}
            />
            {count}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Seats</legend>
        {seats.map((seat, i) => (
          <div key={i} data-testid={`seat-config-${i}`}>
            <label>
              {playerLabel(i)}
              <select value={seat} onChange={(e) => changeSeat(i, e.target.value as SeatConfig)}>
                {SEAT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            {seat !== 'human' && (
              <p data-testid={`tier-blurb-${i}`}>{TIER_BLURBS[seat]}</p>
            )}
          </div>
        ))}
      </fieldset>

      <button onClick={() => onStart({ playerCount, seats })}>Start game</button>
      <button onClick={onBack}>Back</button>
    </main>
  );
}
