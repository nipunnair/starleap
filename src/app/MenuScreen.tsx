import { StarfieldHero } from './StarfieldHero';
import { TIER_BLURBS } from './ConfigScreen';
import { TIER_ORDER } from '../ai/tiers';
import { CharacterAvatar } from '../ui/components/CharacterAvatar';

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
      <div className="menu-hero">
        <StarfieldHero />
        <h1>STARLEAP</h1>
      </div>
      <div className="menu-primary-actions">
        <button className="menu-cta menu-cta--primary" onClick={onNewGame}>
          New game
        </button>
        {canResume && (
          <button className="menu-cta menu-cta--resume" onClick={onResume}>
            Resume
          </button>
        )}
        <button className="menu-cta menu-cta--quickstart" onClick={onPlayVsNova}>
          Play vs Nova
        </button>
        <button className="menu-cta menu-cta--quickstart" onClick={onHumanVsHuman}>
          Human vs Human
        </button>
      </div>
      <div className="menu-secondary-actions">
        <button onClick={onRules}>Rules</button>
        <button onClick={onSettings}>Settings</button>
        <button onClick={onTutorial}>Tutorial</button>
      </div>
      <div className="menu-character-showcase" data-testid="character-showcase">
        {TIER_ORDER.map((tier) => (
          <div key={tier} className="menu-character-showcase__item">
            <CharacterAvatar tier={tier} state="idle" />
            <p className="menu-character-showcase__name">{tier}</p>
            <p className="menu-character-showcase__blurb">{TIER_BLURBS[tier]}</p>
          </div>
        ))}
      </div>
      {showOnboardingCallout && (
        <p data-testid="onboarding-callout">
          New here?{' '}
          <button onClick={onTutorial}>Start with the Tutorial</button>
        </p>
      )}
    </main>
  );
}
