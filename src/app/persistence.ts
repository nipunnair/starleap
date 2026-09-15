import type { GameState, PlayerCount } from '../engine/state';
import type { SeatConfig } from '../ui/components/GameScreen';

/**
 * Versioned key name (ARCHITECTURE.md persistence section): a future incompatible save format
 * bumps this to `.v2`, and old saves simply become invisible (loadGame returns null) rather
 * than needing an explicit version-field check that could throw on malformed old data.
 */
const SAVE_KEY = 'starleap.save.v1';

export interface SavedGame {
  readonly playerCount: PlayerCount;
  readonly seats: readonly SeatConfig[];
  readonly gameState: GameState;
  readonly savedAt: number;
}

/** All localStorage access is best-effort: private browsing, quota, or disabled storage must
 * never crash the game — a failed save/load is just treated as "no save." */
export function saveGame(save: SavedGame): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // ignored — see comment above
  }
}

export function loadGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedGame;
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignored
  }
}

export function hasSavedGame(): boolean {
  return loadGame() !== null;
}
