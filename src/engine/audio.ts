// The audio graph: drum bus and bass bus into a master compressor, with a tempo-synced
// delay on the bass. Built on first use, because browsers only start audio after a tap.
//
//   drums ─────────────────────────────┐
//   bass ──┬───────────────────────────┼─> master ─> compressor ─> out
//          └─> delaySend ─> delay ⟲ ──┘

export interface Graph {
  ctx: AudioContext;
  drums: GainNode;
  bass: GainNode;
  delaySend: GainNode;
  delay: DelayNode;
  feedback: GainNode;
  master: GainNode;
  noise: AudioBuffer;
}

let graph: Graph | null = null;

export function audio(): Graph {
  if (!graph) {
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    const master = ctx.createGain();
    // Headroom: a full beat plus an accented bass line should peak below 0 dBFS.
    master.gain.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    master.connect(comp).connect(ctx.destination);

    const drums = ctx.createGain();
    drums.connect(master);
    const bass = ctx.createGain();
    bass.connect(master);

    const delaySend = ctx.createGain();
    delaySend.gain.value = 0.25;
    const delay = ctx.createDelay(2);
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2500; // darker repeats
    bass.connect(delaySend).connect(delay).connect(tone).connect(master);
    tone.connect(feedback).connect(delay);

    // One second of white noise, shared by every snare, hat and clap.
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    graph = { ctx, drums, bass, delaySend, delay, feedback, master, noise };
    if (lastMix) applyMix(lastMix);
  }
  if (graph.ctx.state === 'suspended') void graph.ctx.resume();
  return graph;
}

export function audioNow(): number {
  return audio().ctx.currentTime;
}

/** Audio-clock seconds to performance.now() milliseconds, for timestamping MIDI. */
export function audioToPerf(t: number): number {
  const { ctx } = audio();
  const ts = typeof ctx.getOutputTimestamp === 'function' ? ctx.getOutputTimestamp() : null;
  if (ts?.contextTime && ts.performanceTime) return ts.performanceTime + (t - ts.contextTime) * 1000;
  return performance.now() + (t - ctx.currentTime) * 1000;
}

export interface Mix {
  drums: number;
  bass: number;
  delay: number;
  feedback: number;
  /** Delay time in seconds (the app uses a dotted eighth). */
  delayTime: number;
}

let lastMix: Mix | null = null;

/** Set bus levels and delay. Safe before audio has started: applied when it does. */
export function applyMix(m: Mix) {
  lastMix = m;
  if (!graph) return;
  const t = graph.ctx.currentTime;
  graph.drums.gain.setTargetAtTime(m.drums, t, 0.02);
  graph.bass.gain.setTargetAtTime(m.bass, t, 0.02);
  graph.delaySend.gain.setTargetAtTime(m.delay, t, 0.02);
  graph.feedback.gain.setTargetAtTime(Math.min(0.85, m.feedback), t, 0.02);
  graph.delay.delayTime.setTargetAtTime(Math.min(2, m.delayTime), t, 0.05);
}
