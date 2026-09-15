import { useCallback, useState } from 'react';

export type ReducedMotionSetting = 'system' | 'on' | 'off';
/** STARLEAP default plus the two fallback board themes named in buildkit.md Part 0. */
export type BoardTheme = 'starleap' | 'nakshatra' | 'chhalaang';

export interface Settings {
  readonly audioEnabled: boolean;
  readonly reducedMotion: ReducedMotionSetting;
  readonly theme: BoardTheme;
}

const SETTINGS_KEY = 'starleap.settings.v1';

const DEFAULT_SETTINGS: Settings = {
  audioEnabled: true,
  reducedMotion: 'system',
  theme: 'starleap',
};

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // best-effort — see persistence.ts for the same rationale
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(readSettings);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeSettings(next);
      return next;
    });
  }, []);

  return { settings, update };
}
