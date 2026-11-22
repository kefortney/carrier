// Patterns: what plays on each of the 16 steps. Plain data, so it saves as JSON.

export const STEPS = 16;

export const DRUM_VOICES = ['kick', 'snare', 'clap', 'chh', 'ohh'] as const;
export type DrumVoice = (typeof DRUM_VOICES)[number];

export const DRUM_LABELS: Record<DrumVoice, string> = {
  kick: 'Kick',
  snare: 'Snare',
  clap: 'Clap',
  chh: 'Hat',
  ohh: 'Open',
};

/** 0 = off, 1 = on, 2 = accent. */
export type Hit = 0 | 1 | 2;

export interface BassStep {
  on: boolean;
  /** MIDI note number. */
  note: number;
  accent: boolean;
  /** Glide into this step from the one before, without retriggering. */
  slide: boolean;
}

export interface Pattern {
  drums: Record<DrumVoice, Hit[]>;
  bass: BassStep[];
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export function emptyPattern(): Pattern {
  return {
    drums: Object.fromEntries(DRUM_VOICES.map((v) => [v, range(STEPS).map(() => 0 as Hit)])) as Record<DrumVoice, Hit[]>,
    bass: range(STEPS).map(() => ({ on: false, note: 36, accent: false, slide: false })),
  };
}

/** "x" = on, "X" = accent, anything else off. */
function hits(s: string): Hit[] {
  return [...s].map((c) => (c === 'X' ? 2 : c === 'x' ? 1 : 0));
}

/** Pattern A on first launch: something to hear the moment Play is pressed. */
export function demoPattern(): Pattern {
  const p = emptyPattern();
  p.drums.kick = hits('X...x...X...x..x');
  p.drums.snare = hits('....X.......X...');
  p.drums.clap = hits('............x...');
  p.drums.chh = hits('x.x.x.x.x.x.x.xx');
  p.drums.ohh = hits('..x...x...x...x.');
  // C minor acid line: note, accent, slide per step ("-" = rest).
  const line: [number | null, boolean, boolean][] = [
    [36, true, false], [36, false, false], [48, false, true], [null, false, false],
    [39, false, false], [36, true, false], [null, false, false], [43, false, true],
    [36, false, false], [46, true, false], [36, false, false], [48, false, true],
    [null, false, false], [39, true, false], [41, false, true], [43, false, false],
  ];
  p.bass = line.map(([note, accent, slide]) => ({ on: note !== null, note: note ?? 36, accent, slide }));
  return p;
}

export function cycleHit(h: Hit): Hit {
  return ((h + 1) % 3) as Hit;
}

export const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 3, 5, 7, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
} as const;
export type ScaleId = keyof typeof SCALES;

/** A random acid line in a scale: mostly roots and octaves, some accents and slides. */
export function randomBass(root: number, scale: ScaleId, rnd: () => number = Math.random): BassStep[] {
  const degrees = SCALES[scale];
  return range(STEPS).map((i) => {
    const on = i === 0 || rnd() < 0.65;
    const r = rnd();
    const interval = r < 0.35 ? 0 : r < 0.5 ? 12 : degrees[Math.floor(rnd() * degrees.length)];
    return { on, note: root + interval, accent: rnd() < 0.25, slide: i > 0 && rnd() < 0.18 };
  });
}

/** A random but sensible beat: four-on-the-floor or broken kick, backbeat, busy hats. */
export function randomDrums(rnd: () => number = Math.random): Pattern['drums'] {
  const d = emptyPattern().drums;
  const fourFloor = rnd() < 0.5;
  for (let i = 0; i < STEPS; i++) {
    if (fourFloor ? i % 4 === 0 : i === 0 || (i % 2 === 0 && rnd() < 0.3) || (i % 2 === 1 && rnd() < 0.12)) d.kick[i] = i % 8 === 0 ? 2 : 1;
    if (i === 4 || i === 12) d.snare[i] = 2;
    else if (rnd() < 0.08) d.snare[i] = 1;
    if (i === 12 && rnd() < 0.5) d.clap[i] = 1;
    if (i % 2 === 0 || rnd() < 0.35) d.chh[i] = i % 4 === 0 ? 2 : 1;
    if (i % 4 === 2 && rnd() < 0.6) {
      d.ohh[i] = 1;
      d.chh[i] = 0;
    }
  }
  return d;
}

/** Fill in anything missing from an older or hand-edited save. */
export function normalizePattern(p: Partial<Pattern> | undefined): Pattern {
  const base = emptyPattern();
  if (!p) return base;
  for (const v of DRUM_VOICES) {
    const row = p.drums?.[v];
    if (Array.isArray(row)) base.drums[v] = range(STEPS).map((i) => ([0, 1, 2].includes(row[i]) ? row[i] : 0) as Hit);
  }
  if (Array.isArray(p.bass)) {
    base.bass = range(STEPS).map((i) => {
      const s = p.bass![i];
      return s && typeof s.note === 'number' ? { on: !!s.on, note: s.note, accent: !!s.accent, slide: !!s.slide } : base.bass[i];
    });
  }
  return base;
}
