import type { BoardTheme, ReducedMotionSetting, Settings } from './settingsStore';

export interface SettingsScreenProps {
  readonly settings: Settings;
  readonly onUpdate: (patch: Partial<Settings>) => void;
  readonly onBack: () => void;
}

const THEMES: readonly BoardTheme[] = ['starleap', 'nakshatra', 'chhalaang'];
const REDUCED_MOTION_OPTIONS: readonly ReducedMotionSetting[] = ['system', 'on', 'off'];

export function SettingsScreen({ settings, onUpdate: update, onBack }: SettingsScreenProps) {
  return (
    <main data-testid="settings-screen">
      <h1>Settings</h1>

      <label>
        <input
          type="checkbox"
          name="audioEnabled"
          checked={settings.audioEnabled}
          onChange={(e) => update({ audioEnabled: e.target.checked })}
        />
        Sound
      </label>

      <label>
        <input
          type="checkbox"
          name="showMoveHints"
          checked={settings.showMoveHints}
          onChange={(e) => update({ showMoveHints: e.target.checked })}
        />
        Show move hints
      </label>

      <fieldset>
        <legend>Reduce motion</legend>
        {REDUCED_MOTION_OPTIONS.map((option) => (
          <label key={option}>
            <input
              type="radio"
              name="reducedMotion"
              value={option}
              checked={settings.reducedMotion === option}
              onChange={() => update({ reducedMotion: option })}
            />
            {option}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Board theme</legend>
        {THEMES.map((theme) => (
          <label key={theme}>
            <input
              type="radio"
              name="theme"
              value={theme}
              checked={settings.theme === theme}
              onChange={() => update({ theme })}
            />
            {theme}
          </label>
        ))}
      </fieldset>

      <button onClick={onBack}>Back</button>
    </main>
  );
}
