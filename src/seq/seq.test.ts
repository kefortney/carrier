import { describe, expect, it } from 'vitest';
import { cycleHit, demoPattern, DRUM_VOICES, emptyPattern, normalizePattern, randomBass, randomDrums, SCALES, STEPS } from './pattern';
import { gateLength, midiToFreq, noteName, stepDuration, swingOffset } from './timing';
import { allNotesOff, noteOff, noteOn } from '../engine/midiOut';
import { cutoffHz } from '../engine/acid';

function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

describe('patterns', () => {
  it('empty and demo patterns have 16 steps everywhere', () => {
    for (const p of [emptyPattern(), demoPattern()]) {
      for (const v of DRUM_VOICES) expect(p.drums[v]).toHaveLength(STEPS);
      expect(p.bass).toHaveLength(STEPS);
    }
    expect(demoPattern().drums.kick[0]).toBe(2);
  });

  it('drum cells cycle off → on → accent → off', () => {
    expect([cycleHit(0), cycleHit(1), cycleHit(2)]).toEqual([1, 2, 0]);
  });

  it('random bass stays in the scale and starts on the root', () => {
    for (let s = 1; s < 20; s++) {
      const line = randomBass(36, 'pentatonic', seeded(s));
      expect(line[0].on).toBe(true);
      expect(line[0].slide).toBe(false);
      for (const step of line) expect([...SCALES.pentatonic, 12]).toContain(step.note - 36);
    }
  });

  it('random drums keep the backbeat', () => {
    const d = randomDrums(seeded(7));
    expect(d.snare[4]).toBe(2);
    expect(d.snare[12]).toBe(2);
    expect(d.kick[0]).toBe(2);
  });

  it('normalizes broken saves', () => {
    const p = normalizePattern({ drums: { kick: [2, 9, 1] } as never, bass: [{ on: true, note: 40, accent: true, slide: false }] });
    expect(p.drums.kick.slice(0, 4)).toEqual([2, 0, 1, 0]);
    expect(p.drums.snare).toHaveLength(STEPS);
    expect(p.bass[0].note).toBe(40);
    expect(p.bass[1].on).toBe(false);
  });
});

describe('timing', () => {
  it('16th notes and swing', () => {
    expect(stepDuration(120)).toBeCloseTo(0.125);
    expect(swingOffset(0, 120, 66)).toBe(0);
    expect(swingOffset(1, 120, 50)).toBe(0);
    // 75% swing pushes the off-beat half a step: a dotted feel.
    expect(swingOffset(1, 120, 75)).toBeCloseTo(0.0625);
    expect(swingOffset(3, 120, 90)).toBeCloseTo(0.0625); // clamped
  });

  it('gate holds open into a slide', () => {
    expect(gateLength(120, false)).toBeCloseTo(0.0625);
    expect(gateLength(120, true)).toBeGreaterThan(stepDuration(120));
  });

  it('pitch and names', () => {
    expect(midiToFreq(69)).toBe(440);
    expect(noteName(36)).toBe('C2');
    expect(noteName(39)).toBe('E♭2');
    expect(cutoffHz(0)).toBe(60);
    expect(cutoffHz(1)).toBe(6000);
  });
});

describe('MIDI bytes', () => {
  it('note on/off and panic', () => {
    expect(noteOn(1, 60, 100)).toEqual([0x90, 60, 100]);
    expect(noteOn(10, 36, 200)).toEqual([0x99, 36, 127]);
    expect(noteOn(1, 60, 0)).toEqual([0x90, 60, 1]); // velocity 0 would mean note off
    expect(noteOff(16, 60)).toEqual([0x8f, 60, 0]);
    expect(allNotesOff(2)).toEqual([0xb1, 123, 0]);
  });
});
