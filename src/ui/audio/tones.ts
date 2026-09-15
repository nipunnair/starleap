/**
 * Web Audio oscillator-based hop tones (SPEC.md §4.4): one tone per hop, ascending a pentatonic
 * scale, wrapping/octave-shifting past 5 hops. The pure note-selection logic is separated from
 * AudioContext usage so it's testable without a real audio backend.
 */

/** C major pentatonic (C, D, E, G, A), in semitones above a base note. */
export const PENTATONIC_STEPS: readonly number[] = [0, 2, 4, 7, 9];

const BASE_FREQUENCY_HZ = 440; // A4

export function frequencyForHopIndex(hopIndex: number): number {
  const octave = Math.floor(hopIndex / PENTATONIC_STEPS.length);
  const step = PENTATONIC_STEPS[hopIndex % PENTATONIC_STEPS.length]!;
  const semitones = step + octave * 12;
  return BASE_FREQUENCY_HZ * Math.pow(2, semitones / 12);
}

export interface ToneSequencer {
  playHopTone(hopIndex: number): void;
}

/** Real Web Audio implementation. Constructing this touches `window.AudioContext`. */
export function createWebAudioToneSequencer(): ToneSequencer {
  let ctx: AudioContext | null = null;

  function getContext(): AudioContext {
    if (!ctx) ctx = new AudioContext();
    return ctx;
  }

  return {
    playHopTone(hopIndex: number) {
      const audioCtx = getContext();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequencyForHopIndex(hopIndex);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      oscillator.connect(gain).connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.18);
    },
  };
}

export const SILENT_TONE_SEQUENCER: ToneSequencer = { playHopTone: () => {} };
