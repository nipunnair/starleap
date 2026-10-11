import { PuzzleScreen } from './PuzzleScreen';
import { PuzzlePicker } from './PuzzlePicker';
import { hasActiveSave, loadPuzzle, newPuzzleSave, type LoadedPuzzle } from './puzzleStore';
import { parsePuzzleLink } from './puzzleSharing';
import { useEffect, useState } from 'react';
import { GameScreen, type SeatConfig } from '../ui/components/GameScreen';
import { ConfigScreen, type GameConfigResult } from './ConfigScreen';
import { ProgressScreen } from './ProgressScreen';
import { commitProgress, processPendingResult, type ProgressCommit } from './progressStore';
import { isGameOver } from '../engine/terminal';
import { MenuScreen } from './MenuScreen';
import { RulesScreen } from './RulesScreen';
import { SettingsScreen } from './SettingsScreen';
import { TutorialScreen } from './TutorialScreen';
import { buildSevenHopChainScenario, buildAlmostWonScenario, buildOnePlayerFinishedScenario } from './debugScenarios';
import { saveGame, loadGame, clearSavedGame, hasSavedGame } from './persistence';
import { hasSeenOnboarding, markOnboardingSeen } from './onboarding';
import { useSettings } from './settingsStore';
import type { GameSnapshot } from '../ui/hooks/useGameEngine';
import type { GameState, PlayerCount } from '../engine/state';

interface GameConfig {
  readonly playerCount: PlayerCount;
  readonly seats: readonly SeatConfig[];
  readonly initialGameState?: GameState;
  readonly initialSnapshot?: GameSnapshot;
}

type Screen = 'menu' | 'config' | 'game' | 'rules' | 'settings' | 'tutorial' | 'progress' | 'puzzles' | 'puzzle';

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
  if (scenario === 'onePlayerFinished') {
    // Player 0 (Sirius) is the already-finished seat; distinct from player 2's tier (Rigel) so
    // e2e assertions can tell the two badges apart unambiguously.
    return {
      playerCount: 3,
      seats: ['Sirius', 'human', 'Rigel'],
      initialGameState: buildOnePlayerFinishedScenario(),
    };
  }
  return null;
}

export function App() {
  const debugScenario = debugScenarioFromUrl();
  const [screen, setScreen] = useState<Screen>(debugScenario ? 'game' : 'menu');
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(debugScenario);
  const [puzzleModel, setPuzzleModel] = useState<LoadedPuzzle | null>(null);
  const [pendingPuzzle, setPendingPuzzle] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [result, setResult] = useState<ProgressCommit | null>(null);
  const [canResume, setCanResume] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<GameConfigResult | null>(null);
  const [showOnboardingCallout, setShowOnboardingCallout] = useState(false);
  const { settings, update: updateSettings } = useSettings();

  useEffect(() => {
    processPendingResult();
    setCanResume(hasSavedGame() || !!loadPuzzle());
    setShowOnboardingCallout(!hasSeenOnboarding());
  }, [screen]);

  useEffect(() => {
    document.body.dataset.theme = settings.theme;
  }, [settings.theme]);

  function startNewGame(config: GameConfigResult) {
    processPendingResult();
    history.replaceState(null, '', location.pathname + location.search);
    clearSavedGame();
    setResult(null);
    setGameKey(key => key + 1);
    markOnboardingSeen();
    setGameConfig(config);
    setScreen('game');
  }

  function startPuzzle(id: string) {
    history.replaceState(null, '', location.pathname + location.search + `#puzzle=${id}&v=1`);
    clearSavedGame(); setPuzzleModel(newPuzzleSave(id)); setGameKey(key => key + 1); setScreen('puzzle');
  }
  function requestPuzzle(id: string) {
    if (hasActiveSave()) {
      // Confirmation temporarily unmounts play; retain its latest durable position for Cancel.
      const puzzle = loadPuzzle();
      if (puzzle) setPuzzleModel(puzzle);
      else {
        const saved = loadGame();
        if (saved) setGameConfig({ playerCount: saved.playerCount, seats: saved.seats,
          initialGameState: saved.gameState, initialSnapshot: saved.snapshot });
      }
      setPendingPuzzle(id);
    } else startPuzzle(id);
  }
  useEffect(() => {
    function route() {
      const route = parsePuzzleLink(window.location.hash);
      setPendingConfig(null);
      setLinkError(route === 'invalid');
      if (route === 'invalid') { setPendingPuzzle(null); setScreen('puzzles'); return; }
      if (!route) { setPendingPuzzle(null); setScreen(current => current === 'puzzle' ? 'puzzles' : current); return; }
      const existing = loadPuzzle();
      if (existing?.save.puzzleId === route.id) { setPendingPuzzle(null); setPuzzleModel(existing); setGameKey(key => key + 1); setScreen('puzzle'); }
      else requestPuzzle(route.id);
    }
    route(); window.addEventListener('hashchange', route);
    return () => window.removeEventListener('hashchange', route);
    // Route reads current durable saves, not captured React state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestNewGame(config: GameConfigResult) {
    if (canResume || hasActiveSave()) {
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
    const puzzle = loadPuzzle();
    if (puzzle) { setPuzzleModel(puzzle); setGameKey(key => key + 1); setScreen('puzzle'); return; }
    const saved = loadGame();
    if (!saved) return;
    setResult(null);
    setGameKey(key => key + 1);
    markOnboardingSeen();
    setGameConfig({ playerCount: saved.playerCount, seats: saved.seats, initialGameState: saved.gameState, initialSnapshot: saved.snapshot });
    setScreen('game');
  }

  function handleStateChange(snapshot: GameSnapshot) {
    if (!gameConfig) return;
    saveGame({ playerCount: gameConfig.playerCount, seats: gameConfig.seats,
      gameState: snapshot.game, snapshot, savedAt: Date.now() });
    if (isGameOver(snapshot.game) && snapshot.stats) {
      setResult(commitProgress({ version: 2, playerCount: gameConfig.playerCount, seats: gameConfig.seats,
        gameState: snapshot.game, snapshot: { ...snapshot, stats: snapshot.stats }, savedAt: Date.now() }));
    }
  }

  if (pendingPuzzle) return <main data-testid="confirm-discard-screen"><p>Starting this puzzle will replace your saved game or puzzle. Continue?</p>
    <button onClick={() => { startPuzzle(pendingPuzzle); setPendingPuzzle(null); }}>Continue</button>
    <button onClick={() => { setPendingPuzzle(null); history.replaceState(null, '', location.pathname + location.search); }}>Cancel</button></main>;
  if (screen === 'puzzle' && puzzleModel) return <PuzzleScreen key={gameKey} initial={puzzleModel} settings={settings} onBack={() => setScreen('puzzles')} />;
  if (screen === 'puzzles') return <>{linkError && <p role="status">This puzzle link is unknown or needs a newer build. Choose a puzzle below.</p>}<PuzzlePicker onChoose={requestPuzzle} onBack={() => setScreen('menu')} /></>;

  if (pendingConfig) {
    return (
      <main data-testid="confirm-discard-screen">
        <p>Starting a new game will discard your saved game. Continue?</p>
        <button className="btn btn-primary" onClick={confirmDiscardAndStart}>
          Continue
        </button>
        <button className="btn btn-secondary" onClick={() => setPendingConfig(null)}>
          Cancel
        </button>
      </main>
    );
  }

  if (screen === 'game' && gameConfig) {
    return (
      <GameScreen
        key={gameKey}
        progressResult={result}
        onRematch={seats => startNewGame({ playerCount: gameConfig.playerCount, seats })}
        playerCount={gameConfig.playerCount}
        seats={gameConfig.seats}
        initialGameState={gameConfig.initialGameState}
        initialSnapshot={gameConfig.initialSnapshot}
        onExit={() => setScreen('menu')}
        onStateChange={handleStateChange}
        reducedMotionOverride={settings.reducedMotion}
        audioEnabled={settings.audioEnabled}
        showHints={settings.showMoveHints}
        cordonNeutralCorners={settings.cordonNeutralCorners}
      />
    );
  }

  if (screen === 'progress') return <ProgressScreen onBack={() => setScreen('menu')} />;

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
    <MenuScreen
      canResume={canResume}
      showOnboardingCallout={showOnboardingCallout}
      onPuzzles={() => setScreen('puzzles')}
      onProgress={() => setScreen('progress')}
      onNewGame={() => setScreen('config')}
      onResume={resumeGame}
      onRules={() => setScreen('rules')}
      onSettings={() => setScreen('settings')}
      onTutorial={() => setScreen('tutorial')}
      onPlayVsNova={() => requestNewGame({ playerCount: 2, seats: ['human', 'Nova'] })}
      onHumanVsHuman={() => requestNewGame({ playerCount: 2, seats: ['human', 'human'] })}
    />
  );
}
