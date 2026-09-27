import { StarfieldHero } from './StarfieldHero';
import { TIER_BLURBS } from './ConfigScreen';
import { TIER_ORDER, type TierName } from '../ai/tiers';
import bgUrl from '../assets/landing/bg.webp';
import boardUrl from '../assets/landing/board.webp';
import logoUrl from '../assets/landing/logo.webp';
import novaUrl from '../assets/landing/portrait-nova.webp';
import vegaUrl from '../assets/landing/portrait-vega.webp';
import rigelUrl from '../assets/landing/portrait-rigel.webp';
import siriusUrl from '../assets/landing/portrait-sirius.webp';

// Sliced from art/landing-source.png by scripts/extract-landing-assets.py.
const PORTRAITS: Record<TierName, string> = {
  Nova: novaUrl,
  Vega: vegaUrl,
  Rigel: rigelUrl,
  Sirius: siriusUrl,
};

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
    <main data-testid="menu-screen" className="menu-screen" style={{ backgroundImage: `url(${bgUrl})` }}>
      <StarfieldHero />
      <h1 className="menu-logo">
        <img src={logoUrl} alt="STARLEAP" width={375} height={105} />
      </h1>
      <div className="menu-stage">
        <div className="menu-actions">
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
            <button className="menu-cta menu-cta--quickstart menu-cta--quickstart-alt" onClick={onHumanVsHuman}>
              Human vs Human
            </button>
          </div>
          <div className="menu-secondary-actions">
            <button onClick={onRules}>Rules</button>
            <button onClick={onSettings}>Settings</button>
            <button onClick={onTutorial}>Tutorial</button>
          </div>
        </div>
        <img className="menu-board" src={boardUrl} alt="" width={575} height={365} />
      </div>
      <div className="menu-character-showcase" data-testid="character-showcase">
        {TIER_ORDER.map((tier) => (
          <div key={tier} className="menu-character-showcase__item">
            <img
              className={`menu-character-showcase__portrait menu-character-showcase__portrait--${tier.toLowerCase()}`}
              src={PORTRAITS[tier]}
              alt=""
              width={96}
              height={96}
            />
            <p className="menu-character-showcase__name">{tier}</p>
            <p className="menu-character-showcase__blurb">{TIER_BLURBS[tier]}</p>
          </div>
        ))}
      </div>
      {showOnboardingCallout && (
        <p data-testid="onboarding-callout" className="menu-onboarding">
          New here? <button onClick={onTutorial}>Start with the Tutorial</button>
        </p>
      )}
    </main>
  );
}
