import { useState } from 'react';
import { GameScreen, type SeatConfig } from '../ui/components/GameScreen';
import { buildSevenHopChainScenario } from './debugScenarios';
import type { GameState, PlayerCount } from '../engine/state';

interface GameConfig {
  readonly playerCount: PlayerCount;
  readonly seats: readonly SeatConfig[];
  readonly initialGameState?: GameState;
}

/** Test-only debug scenarios, reached only via an explicit URL query param — see debugScenarios.ts. */
function debugScenarioFromUrl(): GameConfig | null {
  if (typeof window === 'undefined') return null;
  const scenario = new URLSearchParams(window.location.search).get('e2eScenario');
  if (scenario === 'sevenHopChain') {
    return {
      playerCount: 6,
      seats: ['human', 'human', 'human', 'human', 'human', 'human'],
      initialGameState: buildSevenHopChainScenario(),
    };
  }
  return null;
}

export function App() {
  const [config, setConfig] = useState<GameConfig | null>(debugScenarioFromUrl);

  if (config) {
    return (
      <GameScreen
        playerCount={config.playerCount}
        seats={config.seats}
        initialGameState={config.initialGameState}
        onExit={() => setConfig(null)}
      />
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
