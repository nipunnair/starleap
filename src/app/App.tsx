import { useEffect, useState } from 'react';
import { GameScreen, type SeatConfig } from '../ui/components/GameScreen';
import { ConfigScreen, type GameConfigResult } from './ConfigScreen';
import { RulesScreen } from './RulesScreen';
import { SettingsScreen } from './SettingsScreen';
import { TutorialScreen } from './TutorialScreen';
import { buildSevenHopChainScenario, buildAlmostWonScenario } from './debugScenarios';
import { saveGame, loadGame, clearSavedGame, hasSavedGame } from './persistence';
import { useSettings } from './settingsStore';
import type { GameState, PlayerCount } from '../engine/state';

interface GameConfig {
  readonly playerCount: PlayerCount;
  readonly seats: readonly SeatConfig[];
  readonly initialGameState?: GameState;
}

type Screen = 'menu' | 'config' | 'game' | 'rules' | 'settings' | 'tutorial';

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
  if (scenario === 'almostWon') {
    // Rigel, not Nova: Nova's 35% noise means it doesn't reliably choose the winning move even
    // when available (measured: ~65% win rate here vs Rigel/Sirius's 100% — see DECISIONS.md).
    return {
      playerCount: 2,
      seats: ['human', 'Rigel'],
      initialGameState: buildAlmostWonScenario(),
    };
  }
  return null;
}

export function App() {
  const debugScenario = debugScenarioFromUrl();
  const [screen, setScreen] = useState<Screen>(debugScenario ? 'game' : 'menu');
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(debugScenario);
  const [canResume, setCanResume] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    setCanResume(hasSavedGame());
  }, [screen]);

  useEffect(() => {
    document.body.dataset.theme = settings.theme;
  }, [settings.theme]);

  function startNewGame(config: GameConfigResult) {
    clearSavedGame();
    setGameConfig(config);
    setScreen('game');
  }

  function resumeGame() {
    const saved = loadGame();
    if (!saved) return;
    setGameConfig({ playerCount: saved.playerCount, seats: saved.seats, initialGameState: saved.gameState });
    setScreen('game');
  }

  function handleStateChange(game: GameState, gameOver: boolean) {
    if (!gameConfig) return;
    if (gameOver) {
      clearSavedGame();
    } else {
      saveGame({ playerCount: gameConfig.playerCount, seats: gameConfig.seats, gameState: game, savedAt: Date.now() });
    }
  }

  if (screen === 'game' && gameConfig) {
    return (
      <GameScreen
        playerCount={gameConfig.playerCount}
        seats={gameConfig.seats}
        initialGameState={gameConfig.initialGameState}
        onExit={() => setScreen('menu')}
        onStateChange={handleStateChange}
        reducedMotionOverride={settings.reducedMotion}
        audioEnabled={settings.audioEnabled}
      />
    );
  }

  if (screen === 'config') {
    return <ConfigScreen onStart={startNewGame} onBack={() => setScreen('menu')} />;
  }

  if (screen === 'rules') {
    return <RulesScreen onBack={() => setScreen('menu')} />;
  }

  if (screen === 'settings') {
    return <SettingsScreen onBack={() => setScreen('menu')} />;
  }

  if (screen === 'tutorial') {
    return <TutorialScreen onFinish={() => setScreen('menu')} />;
  }

  return (
    <main data-testid="menu-screen">
      <h1>STARLEAP</h1>
      <button onClick={() => setScreen('config')}>New game</button>
      {canResume && <button onClick={resumeGame}>Resume</button>}
      <button onClick={() => setScreen('rules')}>Rules</button>
      <button onClick={() => setScreen('settings')}>Settings</button>
      <button onClick={() => setScreen('tutorial')}>Tutorial</button>
      <button onClick={() => startNewGame({ playerCount: 2, seats: ['human', 'Nova'] })}>Play vs Nova</button>
      <button onClick={() => startNewGame({ playerCount: 2, seats: ['human', 'human'] })}>Human vs Human</button>
    </main>
  );
}
