interface MenuScreenProps {
  readonly canResume: boolean;
  readonly showOnboardingCallout: boolean;
  readonly onNewGame: () => void;
  readonly onResume: () => void;
  readonly onRules: () => void;
  readonly onSettings: () => void;
  readonly onTutorial: () => void;
  readonly onPlayVsNova: () => void;
  readonly onHumanVsHuman: () => void;
}

export function MenuScreen({
  canResume,
  showOnboardingCallout,
  onNewGame,
  onResume,
  onRules,
  onSettings,
  onTutorial,
  onPlayVsNova,
  onHumanVsHuman,
}: MenuScreenProps) {
  return (
    <main data-testid="menu-screen">
      <h1>STARLEAP</h1>
      <button onClick={onNewGame}>New game</button>
      {canResume && <button onClick={onResume}>Resume</button>}
      <button onClick={onRules}>Rules</button>
      <button onClick={onSettings}>Settings</button>
      <button onClick={onTutorial}>Tutorial</button>
      <button onClick={onPlayVsNova}>Play vs Nova</button>
      <button onClick={onHumanVsHuman}>Human vs Human</button>
      {showOnboardingCallout && (
        <p data-testid="onboarding-callout">
          New here?{' '}
          <button onClick={onTutorial}>Start with the Tutorial</button>
        </p>
      )}
    </main>
  );
}
