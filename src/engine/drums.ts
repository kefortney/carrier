// Synthesized drums: oscillators and filtered noise, no samples, so it works offline and weighs nothing.

import type { DrumVoice } from '../seq/pattern';
import { audio } from './audio';

export interface DrumParams {
  /** 0..1, scales every decay. */
  decay: number;
  /** Semitones, -12..12, shifts every pitched part. */
  tune: number;
}

let openHat: GainNode | null = null;

function noiseSource(ctx: AudioContext, buf: AudioBuffer, t: number, dur: number) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  // A random start point so repeated hits don't sound identical.
  src.start(t, Math.random() * 0.5, dur + 0.05);
  return src;
}

function env(ctx: AudioContext, t: number, peak: number, decay: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  return g;
}

/** Play one drum hit at audio time `at` (null = now). `level` 1 = normal, higher = accent. */
export function playDrum(voice: DrumVoice, at: number | null, level: number, p: DrumParams): void {
  try {
    const { ctx, drums, noise } = audio();
    const t = at ?? ctx.currentTime;
    const tune = 2 ** (p.tune / 12);
    const d = 0.4 + p.decay * 1.2; // decay multiplier, 0.4..1.6

    switch (voice) {
      case 'kick': {
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(160 * tune, t);
        osc.frequency.exponentialRampToValueAtTime(45 * tune, t + 0.09);
        const g = env(ctx, t, 0.9 * level, 0.45 * d);
        osc.connect(g).connect(drums);
        osc.start(t);
        osc.stop(t + 0.5 * d + 0.05);
        // A short click on top so it cuts through on phone speakers.
        const click = ctx.createOscillator();
        click.frequency.value = 1400;
        const cg = env(ctx, t, 0.15 * level, 0.012);
        click.connect(cg).connect(drums);
        click.start(t);
        click.stop(t + 0.03);
        break;
      }
      case 'snare': {
        const tone = ctx.createOscillator();
        tone.type = 'triangle';
        tone.frequency.setValueAtTime(220 * tune, t);
        tone.frequency.exponentialRampToValueAtTime(170 * tune, t + 0.05);
        const tg = env(ctx, t, 0.35 * level, 0.1 * d);
        tone.connect(tg).connect(drums);
        tone.start(t);
        tone.stop(t + 0.2);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1200;
        const ng = env(ctx, t, 0.4 * level, 0.18 * d);
        noiseSource(ctx, noise, t, 0.25 * d).connect(hp).connect(ng).connect(drums);
        break;
      }
      case 'clap': {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1200 * tune;
        bp.Q.value = 1.2;
        const g = ctx.createGain();
        // Three quick slaps, then the tail.
        g.gain.setValueAtTime(0.0001, t);
        for (const k of [0, 0.011, 0.022]) {
          g.gain.setValueAtTime(0.5 * level, t + k);
          g.gain.exponentialRampToValueAtTime(0.05, t + k + 0.009);
        }
        g.gain.setValueAtTime(0.4 * level, t + 0.033);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.033 + 0.2 * d);
        noiseSource(ctx, noise, t, 0.3 * d).connect(bp).connect(g).connect(drums);
        break;
      }
      case 'chh':
      case 'ohh': {
        // A closed hat chokes a ringing open hat, like the real thing.
        if (openHat) {
          openHat.gain.cancelScheduledValues(t);
          openHat.gain.setTargetAtTime(0.0001, t, 0.008);
          openHat = null;
        }
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 7000 * Math.min(1.4, tune);
        const len = voice === 'chh' ? 0.045 * d : 0.32 * d;
        const g = env(ctx, t, (voice === 'chh' ? 0.28 : 0.24) * level, len);
        noiseSource(ctx, noise, t, len).connect(hp).connect(g).connect(drums);
        if (voice === 'ohh') openHat = g;
        break;
      }
    }
  } catch {
    // Audio is best effort; never break the sequencer over it.
  }
}
