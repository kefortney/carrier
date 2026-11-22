// Step timing. Pure functions; times in seconds.

/** One 16th note. */
export function stepDuration(bpm: number): number {
  return 60 / bpm / 4;
}

/**
 * How late an off-beat 16th lands. `swing` is the classic percentage: 50 = straight,
 * 66.7 = triplet feel, 75 = dotted. Even steps never move.
 */
export function swingOffset(step: number, bpm: number, swing: number): number {
  if (step % 2 === 0) return 0;
  const s = Math.min(75, Math.max(50, swing));
  return ((s - 50) / 50) * stepDuration(bpm);
}

/**
 * When the bass gate closes. A slide into the next step holds the gate open through it,
 * as on a 303; otherwise the note is half a step long.
 */
export function gateLength(bpm: number, nextSlides: boolean): number {
  const d = stepDuration(bpm);
  return nextSlides ? d * 1.05 : d * 0.5;
}

/** MIDI clock runs at 24 pulses per quarter note: 6 per 16th step. */
export const CLOCKS_PER_STEP = 6;

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export function noteName(midi: number): string {
  return `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}
