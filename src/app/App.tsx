import { useState } from 'react';
import { GameScreen, type SeatConfig } from '../ui/components/GameScreen';
import type { PlayerCount } from '../engine/state';

interface GameConfig {
  readonly playerCount: PlayerCount;
  readonly seats: readonly SeatConfig[];
}

export function App() {
  const [config, setConfig] = useState<GameConfig | null>(null);

  if (config) {
    return (
      <GameScreen playerCount={config.playerCount} seats={config.seats} onExit={() => setConfig(null)} />
    );
  }

  return (
    <main data-testid="menu-screen">
      <h1>STARLEAP</h1>
      <button onClick={() => setConfig({ playerCount: 2, seats: ['human', 'Nova'] })}>Play vs Nova</button>
      <button onClick={() => setConfig({ playerCount: 2, seats: ['human', 'human'] })}>Human vs Human</button>
    </main>
  );
}
