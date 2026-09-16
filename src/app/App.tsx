import { useEffect, useState } from 'react';
import { GameScreen, type SeatConfig } from '../ui/components/GameScreen';
import { ConfigScreen, type GameConfigResult } from './ConfigScreen';
import { RulesScreen } from './RulesScreen';
import { SettingsScreen } from './SettingsScreen';
import { TutorialScreen } from './TutorialScreen';
import { buildSevenHopChainScenario, buildAlmostWonScenario } from './debugScenarios';
import { saveGame, loadGame, clearSavedGame, hasSavedGame } from './persistence';
import { hasSeenOnboarding, markOnboardingSeen } from './onboarding';
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
  const [pendingConfig, setPendingConfig] = useState<GameConfigResult | null>(null);
  const [showOnboardingCallout, setShowOnboardingCallout] = useState(false);
  const { settings, update: updateSettings } = useSettings();

  useEffect(() => {
    setCanResume(hasSavedGame());
    setShowOnboardingCallout(!hasSeenOnboarding());
  }, [screen]);

  useEffect(() => {
    document.body.dataset.theme = settings.theme;
  }, [settings.theme]);

  function startNewGame(config: GameConfigResult) {
    clearSavedGame();
    markOnboardingSeen();
    setGameConfig(config);
    setScreen('game');
  }

  function requestNewGame(config: GameConfigResult) {
    if (canResume) {
      setPendingConfig(config);
    } else {
      startNewGame(config);
    }
  }

  function confirmDiscardAndStart() {
    if (!pendingConfig) return;
    startNewGame(pendingConfig);
    setPendingConfig(null);
  }

  function resumeGame() {
    const saved = loadGame();
    if (!saved) return;
    markOnboardingSeen();
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

  if (pendingConfig) {
    return (
      <main data-testid="confirm-discard-screen">
        <p>Starting a new game will discard your saved game. Continue?</p>
        <button onClick={confirmDiscardAndStart}>Continue</button>
        <button onClick={() => setPendingConfig(null)}>Cancel</button>
      </main>
    );
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
        showHints={settings.showMoveHints}
      />
    );
  }

  if (screen === 'config') {
    return <ConfigScreen onStart={requestNewGame} onBack={() => setScreen('menu')} />;
  }

  if (screen === 'rules') {
    return <RulesScreen onBack={() => setScreen('menu')} />;
  }

  if (screen === 'settings') {
    return <SettingsScreen settings={settings} onUpdate={updateSettings} onBack={() => setScreen('menu')} />;
  }

  if (screen === 'tutorial') {
    return (
      <TutorialScreen
        onFinish={() => {
          markOnboardingSeen();
          setScreen('menu');
        }}
      />
    );
  }

  return (
    <main data-testid="menu-screen">
      <h1>STARLEAP</h1>
      <button onClick={() => setScreen('config')}>New game</button>
      {canResume && <button onClick={resumeGame}>Resume</button>}
      <button onClick={() => setScreen('rules')}>Rules</button>
      <button onClick={() => setScreen('settings')}>Settings</button>
      <button onClick={() => setScreen('tutorial')}>Tutorial</button>
      <button onClick={() => requestNewGame({ playerCount: 2, seats: ['human', 'Nova'] })}>Play vs Nova</button>
      <button onClick={() => requestNewGame({ playerCount: 2, seats: ['human', 'human'] })}>Human vs Human</button>
      {showOnboardingCallout && (
        <p data-testid="onboarding-callout">
          New here?{' '}
          <button onClick={() => setScreen('tutorial')}>Start with the Tutorial</button>
        </p>
      )}
    </main>
  );
}
