// Acid bass: one oscillator into a resonant low-pass filter, with accent and slide.
// The sequenced voice is mono and persistent, so a slide can bend the running
// oscillator into the next note without retriggering the envelopes.

import { midiToFreq } from '../seq/timing';
import { audio } from './audio';

export interface AcidParams {
  wave: 'sawtooth' | 'square';
  /** Base filter cutoff, 0..1 (mapped to about 60 Hz..6 kHz). */
  cutoff: number;
  /** 0..1 */
  resonance: number;
  /** How far the filter envelope opens, 0..1. */
  envMod: number;
  /** Filter envelope decay, 0..1 (about 0.08..1.2 s). */
  decay: number;
  /** How much harder accented notes hit, 0..1. */
  accent: number;
}

export function cutoffHz(x: number): number {
  return 60 * 100 ** Math.min(1, Math.max(0, x));
}

interface Voice {
  osc: OscillatorNode;
  filter: BiquadFilterNode;
  amp: GainNode;
}

let voice: Voice | null = null;

function makeVoice(ctx: AudioContext, out: AudioNode, p: AcidParams): Voice {
  const osc = ctx.createOscillator();
  osc.type = p.wave;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.7 + p.resonance * 18;
  filter.frequency.value = cutoffHz(p.cutoff);
  const amp = ctx.createGain();
  amp.gain.value = 0;
  osc.connect(filter).connect(amp).connect(out);
  return { osc, filter, amp };
}

function seqVoice(p: AcidParams): Voice {
  const { ctx, bass } = audio();
  if (!voice) {
    voice = makeVoice(ctx, bass, p);
    voice.osc.start();
  }
  return voice;
}

/** Apply sound changes right away (filter knobs move the running voice too). */
export function updateAcid(p: AcidParams) {
  if (!voice) return;
  const { ctx } = audio();
  voice.osc.type = p.wave;
  voice.filter.Q.setTargetAtTime(0.7 + p.resonance * 18, ctx.currentTime, 0.02);
}

function shape(v: Voice, t: number, p: AcidParams, accent: boolean, retrigger: boolean) {
  const base = cutoffHz(p.cutoff);
  const boost = accent ? 1 + p.accent : 1;
  // Envelope peak: up to about 4 octaves above the base, more with accent.
  const peak = Math.min(18000, base * 2 ** (p.envMod * 4 * boost));
  const decay = (0.08 + p.decay * 1.1) * (accent ? 0.6 : 1); // accent: snappier, like a 303
  const f = v.filter.frequency;
  if (retrigger) {
    f.cancelScheduledValues(t);
    f.setValueAtTime(peak, t);
    f.setTargetAtTime(base, t + 0.003, decay / 3);
  }
  const level = 0.38 * (accent ? 1 + p.accent * 0.7 : 1);
  v.amp.gain.cancelScheduledValues(t);
  if (retrigger) v.amp.gain.setValueAtTime(0, t);
  v.amp.gain.setTargetAtTime(level, t, 0.002);
}

/**
 * Schedule one sequenced step. `slide` means glide in from the previous note with
 * the gate still open; `gate` is how long the note sounds, in seconds.
 */
export function acidStep(t: number, note: number, accent: boolean, slide: boolean, gate: number, p: AcidParams) {
  try {
    const v = seqVoice(p);
    const freq = midiToFreq(note);
    v.osc.frequency.cancelScheduledValues(t);
    if (slide) v.osc.frequency.setTargetAtTime(freq, t, 0.025);
    else v.osc.frequency.setValueAtTime(freq, t);
    shape(v, t, p, accent, !slide);
    v.amp.gain.setTargetAtTime(0, t + gate, 0.008);
  } catch {
    /* best effort */
  }
}

/** Silence the sequenced voice now (Stop). */
export function acidSilence() {
  if (!voice) return;
  const { ctx } = audio();
  voice.amp.gain.cancelScheduledValues(ctx.currentTime);
  voice.amp.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
}

/** A separate one-shot voice for tapping keys, so it never fights the sequencer's automation. */
export function acidAudition(note: number, p: AcidParams, accent = false): () => void {
  try {
    const { ctx, bass } = audio();
    const v = makeVoice(ctx, bass, p);
    const t = ctx.currentTime;
    v.osc.frequency.value = midiToFreq(note);
    v.osc.start(t);
    shape(v, t, p, accent, true);
    let done = false;
    const release = () => {
      if (done) return;
      done = true;
      const now = ctx.currentTime;
      v.amp.gain.cancelScheduledValues(now);
      v.amp.gain.setTargetAtTime(0, now, 0.01);
      v.osc.stop(now + 0.1);
    };
    setTimeout(release, 2000); // never let a stuck finger drone forever
    return release;
  } catch {
    return () => {};
  }
}
