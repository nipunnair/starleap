import { createInitialState, type GameState, type PlayerCount } from '../engine/state';
import { key, onBoard } from '../engine/coords';
import { isGameOver } from '../engine/terminal';
import { createSessionStats, RECORD_VERSIONS, type SessionStats } from '../progression/sessionStats';
import type { GameSnapshot } from '../ui/hooks/useGameEngine';
import type { SeatConfig } from '../ui/components/GameScreen';

const SAVE_KEY = 'starleap.save.v2';
const LEGACY_KEY = 'starleap.save.v1';
const PENDING_KEY = 'starleap.pending-result.v2';

export interface SavedGame {
  readonly playerCount: PlayerCount;
  readonly seats: readonly SeatConfig[];
  readonly gameState: GameState;
  readonly savedAt: number;
  readonly snapshot?: GameSnapshot;
}
export interface SaveEnvelope extends SavedGame {
  readonly version: 2;
  readonly snapshot: GameSnapshot & { readonly stats: SessionStats };
}
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const natural = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
const controller = (value: unknown) => ['human', 'Nova', 'Vega', 'Rigel', 'Sirius'].includes(value as string);

function validGame(value: unknown, pc: PlayerCount): value is GameState {
  if (!object(value) || value.playerCount !== pc || !natural(value.round) || value.round > 150 ||
      !natural(value.currentPlayer) || value.currentPlayer >= pc ||
      (value.cordonNeutralCorners !== undefined && typeof value.cordonNeutralCorners !== 'boolean') ||
      !Array.isArray(value.seats) || !Array.isArray(value.pegs)) return false;
  const expected = createInitialState(pc).seats;
  if (value.seats.length !== pc || !value.seats.every((s, i) => object(s) &&
      s.player === i && s.startCorner === expected[i]!.startCorner && s.targetCorner === expected[i]!.targetCorner)) return false;
  const ids = new Set<string>();
  const cells = new Set<string>();
  const counts = Array<number>(pc).fill(0);
  for (const p of value.pegs) {
    if (!object(p) || !text(p.id) || ids.has(p.id) || !natural(p.owner) || p.owner >= pc ||
        typeof p.hasLeftStart !== 'boolean' || !object(p.cell)) return false;
    const { x, y, z } = p.cell;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number' ||
        ![x, y, z].every(Number.isSafeInteger) || x + y + z !== 0 || !onBoard({ x, y, z })) return false;
    const cell = key({ x, y, z });
    if (cells.has(cell) || (counts[p.owner] = (counts[p.owner] ?? 0) + 1) > 10) return false;
    cells.add(cell); ids.add(p.id);
  }
  // Debug/tutorial fixtures may contain fewer pegs; eligibility separately excludes them.
  return value.pegs.length > 0;
}

function validStats(value: unknown, save: SavedGame): value is SessionStats {
  if (!object(value) || value.schemaVersion !== 1 || !object(value.context) ||
      !natural(value.lastEventSequence) || typeof value.undoUsed !== 'boolean' ||
      typeof value.historyComplete !== 'boolean') return false;
  const c = value.context;
  if ((c.startedAt !== undefined && !natural(c.startedAt)) || !text(c.sessionId) || !['standard', 'debug', 'puzzle', 'tutorial'].includes(c.mode as string) ||
      c.playerCount !== save.playerCount || c.cordonNeutralCorners !== !!save.gameState.cordonNeutralCorners ||
      !Array.isArray(c.controllers) || JSON.stringify(c.controllers) !== JSON.stringify(save.seats) ||
      !object(c.versions) || !['rules', 'ai', 'records'].every(k => text((c.versions as Record<string, unknown>)[k]))) return false;
  const counters = (seats: unknown) => Array.isArray(seats) && seats.length === save.playerCount &&
    seats.every(s => object(s) && natural(s.moves) && natural(s.longestChain) && s.longestChain <= 24 && natural(s.longHops) &&
      s.moves <= (value.lastEventSequence as number) && (s.moves > 0 || (s.longestChain === 0 && s.longHops === 0)));
  return counters(value.seats) && (value.previousSeats === null || counters(value.previousSeats));
}

function legacySnapshot(save: SavedGame): SaveEnvelope['snapshot'] {
  return { game: save.gameState, previousGame: null, canUndo: false, stats: createSessionStats({
    sessionId: crypto.randomUUID(), mode: 'standard', playerCount: save.playerCount,
    controllers: save.seats, cordonNeutralCorners: !!save.gameState.cordonNeutralCorners,
    versions: RECORD_VERSIONS,
  }, false) };
}

function parse(raw: string | null, legacy = false): SaveEnvelope | null {
  if (!raw || raw.length > 100_000) return null;
  const v: unknown = JSON.parse(raw);
  if (!object(v) || ![2, 3, 4, 6].includes(v.playerCount as number) ||
      !Array.isArray(v.seats) || v.seats.length !== v.playerCount || !v.seats.every(controller) ||
      !natural(v.savedAt) || !validGame(v.gameState, v.playerCount as PlayerCount)) return null;
  const save = v as unknown as SavedGame;
  if (legacy) return { ...save, version: 2, snapshot: legacySnapshot(save) };
  const snap = v.snapshot;
  if (v.version !== 2 || !object(snap) || !validStats(snap.stats, save) ||
      JSON.stringify(snap.game) !== JSON.stringify(save.gameState) || typeof snap.canUndo !== 'boolean' ||
      (snap.previousGame !== null && !validGame(snap.previousGame, save.playerCount)) ||
      (snap.canUndo && (!snap.previousGame || !snap.stats.previousSeats))) return null;
  if (snap.previousGame && (snap.previousGame as GameState).cordonNeutralCorners !== save.gameState.cordonNeutralCorners) return null;
  if (snap.stats.context.mode === 'standard' && save.gameState.pegs.length !== save.playerCount * 10) return null;
  return v as unknown as SaveEnvelope;
}

/** One atomic payload keeps board, counters, undo and identity together. A terminal result is
 * written BEFORE removing the active save. Failed/quota writes leave the old active save intact.
 * P14.3 consumes the pending result idempotently; starting another match never deletes it. */
export function saveGame(save: SavedGame): void {
  try {
    const envelope = { ...save, version: 2, snapshot: save.snapshot ?? legacySnapshot(save) };
    const raw = JSON.stringify(envelope);
    if (!parse(raw)) return;
    if (isGameOver(save.gameState)) {
      localStorage.setItem(PENDING_KEY, raw);
      localStorage.removeItem(SAVE_KEY);
    } else {
      localStorage.setItem(SAVE_KEY, raw);
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* Storage can be unavailable; never interrupt play. */ }
}
export function loadPendingResult(): SaveEnvelope | null {
  try {
    const saved = parse(localStorage.getItem(PENDING_KEY));
    return saved && isGameOver(saved.gameState) ? saved : null;
  } catch { return null; }
}
export function loadGame(): SaveEnvelope | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return parse(raw);
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return parse(legacy, true);
    return loadPendingResult();
  } catch { return null; }
}
export function clearSavedGame(): void {
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(LEGACY_KEY); } catch { /* best effort */ }
}
export function hasSavedGame(): boolean { return loadGame() !== null; }
