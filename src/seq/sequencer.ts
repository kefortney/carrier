// The clock. A short timer looks ahead and schedules every step on the audio clock
// (and MIDI with matching timestamps), so timing stays tight even if the UI stutters.
// Browsers throttle timers in the background, so playback is for while the app is open.

import { acidSilence, acidStep } from '../engine/acid';
import { audio, audioNow, audioToPerf } from '../engine/audio';
import { playDrum } from '../engine/drums';
import { allNotesOff, CLOCK, noteOff, noteOn, send, START, STOP } from '../engine/midiOut';
import { output, song, transport } from '../state.svelte';
import { DRUM_VOICES, STEPS } from './pattern';
import { CLOCKS_PER_STEP, gateLength, stepDuration, swingOffset } from './timing';

const LOOKAHEAD = 0.12; // seconds scheduled ahead
const TICK_MS = 25;

let timer: ReturnType<typeof setInterval> | undefined;
let raf = 0;
let nextTime = 0; // unswung grid time of the next step
let nextStep = 0;
/** Steps already scheduled, so the playhead can follow what is actually heard. */
let queue: { step: number; time: number }[] = [];
let midiNote: { note: number } | null = null; // FM-1 note held into a slide
let wakeLock: { release(): Promise<void> } | null = null;

function scheduleStep(step: number, grid: number) {
  // Bar line: switch to a queued pattern.
  if (step === 0 && song.queued !== null) {
    song.current = song.queued;
    song.queued = null;
  }
  const p = song.patterns[song.current];
  const t = grid + swingOffset(step, song.bpm, song.swing);

  if (!song.mutes.drums) {
    for (const v of DRUM_VOICES) {
      const h = p.drums[v][step];
      if (h) playDrum(v, t, h === 2 ? 1.35 : 0.85, song.drumSound);
    }
  }

  const b = p.bass[step];
  const next = p.bass[(step + 1) % STEPS];
  const nextSlides = next.on && next.slide;
  if (b.on && !song.mutes.bass) {
    const gate = gateLength(song.bpm, nextSlides);
    const slide = b.slide && p.bass[(step + STEPS - 1) % STEPS].on;
    if (output.bass === 'phone' || output.doubleOnPhone) acidStep(t, b.note, b.accent, slide, gate, song.acid);
    if (output.bass === 'midi') {
      const on = audioToPerf(t);
      const held = midiNote;
      // A slide to the same note is a tie: keep it sounding. Otherwise start the new note,
      // then release a held one just after, so the FM-1 hears legato.
      if (!(held && held.note === b.note)) {
        send(output.midiId, noteOn(output.channel, b.note, b.accent ? 120 : 88), on);
        if (held) send(output.midiId, noteOff(output.channel, held.note), on + 1);
      }
      if (nextSlides) midiNote = { note: b.note };
      else {
        send(output.midiId, noteOff(output.channel, b.note), audioToPerf(t + gate));
        midiNote = null;
      }
    }
  } else if (midiNote) {
    // Muted or empty step after a held note: let it go.
    send(output.midiId, noteOff(output.channel, midiNote.note), audioToPerf(t));
    midiNote = null;
  }

  if (output.bass === 'midi' && output.clock) {
    const d = stepDuration(song.bpm) / CLOCKS_PER_STEP;
    for (let k = 0; k < CLOCKS_PER_STEP; k++) send(output.midiId, CLOCK, audioToPerf(grid + k * d));
  }

  queue.push({ step, time: t });
}

function tick() {
  const horizon = audioNow() + LOOKAHEAD;
  while (nextTime < horizon) {
    scheduleStep(nextStep, nextTime);
    nextTime += stepDuration(song.bpm);
    nextStep = (nextStep + 1) % STEPS;
  }
}

function frame() {
  const now = audioNow();
  while (queue.length > 1 && queue[1].time <= now) queue.shift();
  if (queue.length && queue[0].time <= now) transport.step = queue[0].step;
  raf = requestAnimationFrame(frame);
}

export function play() {
  if (transport.playing) return;
  const { ctx } = audio();
  void ctx.resume();
  nextTime = audioNow() + 0.08;
  nextStep = 0;
  queue = [];
  midiNote = null;
  if (output.bass === 'midi' && output.clock) send(output.midiId, START, audioToPerf(nextTime));
  transport.playing = true;
  tick();
  timer = setInterval(tick, TICK_MS);
  raf = requestAnimationFrame(frame);
  // Keep the screen on while a loop runs; a locked phone stops the timers.
  (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock
    ?.request('screen')
    .then((l) => (wakeLock = l))
    .catch(() => {});
}

export function stop() {
  if (!transport.playing) return;
  clearInterval(timer);
  cancelAnimationFrame(raf);
  transport.playing = false;
  transport.step = -1;
  song.queued = null;
  acidSilence();
  if (output.bass === 'midi') {
    if (output.clock) send(output.midiId, STOP);
    send(output.midiId, allNotesOff(output.channel));
  }
  midiNote = null;
  void wakeLock?.release().catch(() => {});
  wakeLock = null;
}

export function toggle() {
  if (transport.playing) stop();
  else play();
}

/** Pick a pattern: right away when stopped, at the next bar line when playing. */
export function choosePattern(i: number) {
  if (transport.playing && i !== song.current) song.queued = i;
  else {
    song.current = i;
    song.queued = null;
  }
}
