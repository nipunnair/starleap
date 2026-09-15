import { describe, expect, it } from 'vitest';
import { frequencyForHopIndex, PENTATONIC_STEPS, SILENT_TONE_SEQUENCER } from '../tones';

describe('frequencyForHopIndex (SPEC.md §4.4)', () => {
  it('ascends within the first pentatonic octave', () => {
    const freqs = Array.from({ length: PENTATONIC_STEPS.length }, (_, i) => frequencyForHopIndex(i));
    for (let i = 1; i < freqs.length; i++) {
      expect(freqs[i]!).toBeGreaterThan(freqs[i - 1]!);
    }
  });

  it('wraps to a higher octave past the pentatonic scale length (a 7-hop chain keeps ascending)', () => {
    const hop5 = frequencyForHopIndex(5); // wraps to step 0, one octave up
    const hop0 = frequencyForHopIndex(0);
    expect(hop5).toBeCloseTo(hop0 * 2, 5);

    const hop6 = frequencyForHopIndex(6);
    expect(hop6).toBeGreaterThan(hop5);
  });

  it('is deterministic (same hop index always gives the same frequency)', () => {
    expect(frequencyForHopIndex(3)).toBe(frequencyForHopIndex(3));
  });
});

describe('SILENT_TONE_SEQUENCER', () => {
  it('never throws (used under prefers-reduced-motion / audio-off settings)', () => {
    expect(() => SILENT_TONE_SEQUENCER.playHopTone(0)).not.toThrow();
  });
});
