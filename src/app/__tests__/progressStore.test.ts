import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { outcome } from '../../progression/__tests__/recordFixture';
import { commitProgress, loadProgress, processPendingResult, PROGRESS_KEY } from '../progressStore';
import { loadPendingResult, saveGame } from '../persistence';

describe('durable local progress store', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());
  it('atomically persists records and receipt, then recovers original awards on retry', () => {
    saveGame(outcome());
    const first = processPendingResult()!;
    expect(first.status).toBe('processed');
    const raw = localStorage.getItem(PROGRESS_KEY);
    expect(processPendingResult()).toMatchObject({ status: 'duplicate', receipt: first.receipt });
    expect(localStorage.getItem(PROGRESS_KEY)).toBe(raw);
    expect(loadProgress()).toMatchObject({ status: 'available', progress: first.progress });
    expect(loadPendingResult()).not.toBeNull();
  });
  it('keeps pending outcome on a quota failure, and retries without false awards', () => {
    saveGame(outcome());
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(processPendingResult()).toEqual({ status: 'unavailable', progress: null, receipt: null });
    expect(loadPendingResult()).not.toBeNull();
    spy.mockRestore();
    expect(processPendingResult()!.status).toBe('processed');
    expect(processPendingResult()!.status).toBe('duplicate');
  });
  it('leaves existing records intact when saving an improvement fails', () => {
    const first = commitProgress(outcome());
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(commitProgress(outcome('improvement', 0, {}, 20, 5)).status).toBe('unavailable');
    spy.mockRestore();
    expect(loadProgress()).toMatchObject({ progress: first.progress });
  });
  it.each(['{', '{"version":99}', '{"version":1,"records":[],"badges":["Unknown"],"receipts":[],"retiredThrough":-1}'])('preserves corrupt or unknown data for recovery: %s', raw => {
    localStorage.setItem(PROGRESS_KEY, raw);
    expect(commitProgress(outcome()).status).toBe('corrupt');
    expect(localStorage.getItem(PROGRESS_KEY)).toBe(raw);
  });
  it('handles unavailable storage without throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('disabled'); });
    expect(loadProgress().status).toBe('unavailable');
    expect(commitProgress(outcome()).status).toBe('unavailable');
  });
  it('returns no outcome when nothing is pending', () => expect(processPendingResult()).toBeNull());
});
