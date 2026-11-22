// MIDI out over Web MIDI (Chrome, Edge, Android Chrome). The FM-1 is class compliant,
// so plugged into the phone with USB-C it shows up as an output here.

export interface MidiPort {
  id: string;
  name: string;
}

// --- Message bytes (pure, tested) ---

export function noteOn(channel: number, note: number, velocity: number): number[] {
  return [0x90 | ((channel - 1) & 0x0f), note & 0x7f, Math.max(1, Math.min(127, Math.round(velocity)))];
}

export function noteOff(channel: number, note: number): number[] {
  return [0x80 | ((channel - 1) & 0x0f), note & 0x7f, 0];
}

/** All Notes Off (CC 123) on one channel. */
export function allNotesOff(channel: number): number[] {
  return [0xb0 | ((channel - 1) & 0x0f), 123, 0];
}

export const CLOCK = [0xf8];
export const START = [0xfa];
export const STOP = [0xfc];

// --- Ports ---

export function midiSupported(): boolean {
  return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
}

let access: MIDIAccess | null = null;

/** Ask for MIDI. Must come from a tap; Chrome shows a permission prompt the first time. */
export async function connectMidi(onChange: (ports: MidiPort[]) => void): Promise<MidiPort[]> {
  if (!midiSupported()) throw new Error('This browser has no Web MIDI. Use Chrome on Android or desktop.');
  access ??= await navigator.requestMIDIAccess();
  const list = () => [...access!.outputs.values()].map((o) => ({ id: o.id, name: o.name ?? 'MIDI output' }));
  access.onstatechange = () => onChange(list());
  return list();
}

function output(id: string | null): MIDIOutput | null {
  if (!access) return null;
  if (id && access.outputs.has(id)) return access.outputs.get(id)!;
  // No choice yet: prefer anything that looks like the FM-1, else the first output.
  const all = [...access.outputs.values()];
  return all.find((o) => /fm-?1|m-?vave/i.test(o.name ?? '')) ?? all[0] ?? null;
}

export function currentOutputName(id: string | null): string | null {
  return output(id)?.name ?? null;
}

/** Send now, or at a performance.now() time in ms. */
export function send(id: string | null, bytes: number[], atPerfMs?: number) {
  try {
    output(id)?.send(bytes, atPerfMs);
  } catch {
    /* unplugged mid-send */
  }
}
