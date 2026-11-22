// Everything the user makes or sets, saved to localStorage. localStorage can throw or
// come back empty (private mode, cleared data); the app then starts fresh.

import type { AcidParams } from './engine/acid';
import { connectMidi } from './engine/midiOut';
import type { DrumParams } from './engine/drums';
import { demoPattern, emptyPattern, normalizePattern, type Pattern, type ScaleId } from './seq/pattern';

export const PATTERN_SLOTS = 4;

export interface Song {
  bpm: number;
  swing: number;
  patterns: Pattern[];
  current: number;
  /** Pattern to switch to at the next bar line while playing. */
  queued: number | null;
  root: number;
  scale: ScaleId;
  acid: AcidParams;
  drumSound: DrumParams;
  levels: { drums: number; bass: number; delay: number; feedback: number };
  mutes: { drums: boolean; bass: boolean };
}

export interface Output {
  /** Where the bass track plays: the phone's synth, or MIDI out to the FM-1. */
  bass: 'phone' | 'midi';
  midiId: string | null;
  channel: number;
  /** Send MIDI clock, start and stop so the FM-1's arp and sequencer follow. */
  clock: boolean;
  /** Also play the phone's bass while sending MIDI. */
  doubleOnPhone: boolean;
}

const SONG_KEY = 'carrier.song.v1';
const OUT_KEY = 'carrier.output.v1';

export function defaultSong(): Song {
  return {
    bpm: 124,
    swing: 54,
    patterns: [demoPattern(), ...Array.from({ length: PATTERN_SLOTS - 1 }, emptyPattern)],
    current: 0,
    queued: null,
    root: 36,
    scale: 'minor',
    acid: { wave: 'sawtooth', cutoff: 0.32, resonance: 0.65, envMod: 0.6, decay: 0.35, accent: 0.6 },
    drumSound: { decay: 0.5, tune: 0 },
    levels: { drums: 0.9, bass: 0.8, delay: 0.25, feedback: 0.35 },
    mutes: { drums: false, bass: false },
  };
}

function load<T>(key: string): Partial<T> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: keep playing */
  }
}

export function mergeSong(saved: Partial<Song>): Song {
  const d = defaultSong();
  const patterns = Array.from({ length: PATTERN_SLOTS }, (_, i) => (saved.patterns?.[i] ? normalizePattern(saved.patterns[i]) : d.patterns[i]));
  return {
    ...d,
    ...saved,
    patterns,
    current: Math.min(PATTERN_SLOTS - 1, Math.max(0, saved.current ?? 0)),
    queued: null,
    acid: { ...d.acid, ...saved.acid },
    drumSound: { ...d.drumSound, ...saved.drumSound },
    levels: { ...d.levels, ...saved.levels },
    mutes: { ...d.mutes, ...saved.mutes },
  };
}

export const song: Song = $state(mergeSong(load<Song>(SONG_KEY)));
export const output: Output = $state({ bass: 'phone', midiId: null, channel: 1, clock: false, doubleOnPhone: false, ...load<Output>(OUT_KEY) });

export function saveSong() {
  save(SONG_KEY, $state.snapshot(song));
}
export function saveOutput() {
  save(OUT_KEY, $state.snapshot(output));
}

export function pattern(): Pattern {
  return song.patterns[song.current];
}

/** Live playback state for the UI. */
export const transport = $state({ playing: false, step: -1 });

export const midiState = $state({ ports: [] as { id: string; name: string }[], error: null as string | null, asked: false });

/** Ask for MIDI and pick the FM-1 (or the first output) if nothing is chosen yet. */
export async function connect() {
  midiState.asked = true;
  try {
    midiState.ports = await connectMidi((ports) => (midiState.ports = ports));
    midiState.error = null;
    if (!output.midiId || !midiState.ports.some((p) => p.id === output.midiId)) {
      output.midiId = midiState.ports.find((p) => /fm-?1|m-?vave/i.test(p.name))?.id ?? midiState.ports[0]?.id ?? null;
    }
  } catch (e) {
    midiState.error = e instanceof Error ? e.message : String(e);
  }
}
