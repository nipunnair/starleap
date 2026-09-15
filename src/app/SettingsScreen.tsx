import { useSettings, type BoardTheme } from './settingsStore';
import type { ReducedMotionSetting } from './settingsStore';

export interface SettingsScreenProps {
  readonly onBack: () => void;
}

const THEMES: readonly BoardTheme[] = ['starleap', 'nakshatra', 'chhalaang'];
const REDUCED_MOTION_OPTIONS: readonly ReducedMotionSetting[] = ['system', 'on', 'off'];

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { settings, update } = useSettings();

  return (
    <main data-testid="settings-screen">
      <h1>Settings</h1>

      <label>
        <input
          type="checkbox"
          checked={settings.audioEnabled}
          onChange={(e) => update({ audioEnabled: e.target.checked })}
        />
        Sound
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
