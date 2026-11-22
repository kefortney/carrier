<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import Keys from './Keys.svelte';
  import { acidAudition } from '../engine/acid';
  import { noteOff, noteOn, send } from '../engine/midiOut';
  import { emptyPattern, randomBass, SCALES, STEPS, type ScaleId } from '../seq/pattern';
  import { noteName } from '../seq/timing';
  import { output, pattern, song, transport } from '../state.svelte';
  import { layout } from './layout.svelte';

  const p = $derived(pattern());
  let selected = $state(0);
  let low = $state(36);
  const octaves = $derived(layout.portrait ? 1 : 2);
  const halves = $derived(layout.portrait ? [[0, 8], [8, 16]] : [[0, STEPS]]);
  const scalePcs = $derived(new Set(SCALES[song.scale].map((d) => (song.root + d) % 12)));
  const held = new SvelteSet<number>();
  const releases = new Map<number, () => void>();

  function pickStep(i: number) {
    if (selected === i) p.bass[i].on = !p.bass[i].on;
    else selected = i;
  }

  // Tap a key: hear it, write it into the selected step, move to the next step.
  function press(m: number) {
    held.add(m);
    if (output.bass === 'midi') send(output.midiId, noteOn(output.channel, m, 100));
    if (output.bass === 'phone' || output.doubleOnPhone) releases.set(m, acidAudition(m, song.acid));
    const s = p.bass[selected];
    s.note = m;
    s.on = true;
    selected = (selected + 1) % STEPS;
  }
  function release(m: number) {
    held.delete(m);
    if (output.bass === 'midi') send(output.midiId, noteOff(output.channel, m));
    releases.get(m)?.();
    releases.delete(m);
  }

  function shift(by: number) {
    const next = low + by * 12;
    if (next >= 24 && next + octaves * 12 <= 96) low = next;
  }

  const ROOTS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
</script>

<div class="page">
  <div class="lanes">
    {#each halves as [from, to] (from)}
      <div class="lane" style:--n={to - from}>
        <span class="tag">Note</span>
        {#each { length: to - from } as _, k (k)}
          {@const i = from + k}
          {@const s = p.bass[i]}
          <button
            type="button"
            class="step"
            class:on={s.on}
            class:sel={selected === i}
            class:now={transport.step === i}
            class:beat={i % 4 === 0}
            aria-label="Step {i + 1}: {s.on ? noteName(s.note) : 'rest'}{selected === i ? ', selected' : ''}"
            onclick={() => pickStep(i)}
          >
            {#if s.on}{noteName(s.note)}{:else}·{/if}
          </button>
        {/each}
        <span class="tag">Acc</span>
        {#each { length: to - from } as _, k (k)}
          {@const i = from + k}
          <button type="button" class="flag" class:set={p.bass[i].accent} aria-label="Accent step {i + 1}" aria-pressed={p.bass[i].accent} onclick={() => (p.bass[i].accent = !p.bass[i].accent)}></button>
        {/each}
        <span class="tag">Slide</span>
        {#each { length: to - from } as _, k (k)}
          {@const i = from + k}
          <button type="button" class="flag slide" class:set={p.bass[i].slide} aria-label="Slide into step {i + 1}" aria-pressed={p.bass[i].slide} onclick={() => (p.bass[i].slide = !p.bass[i].slide)}></button>
        {/each}
      </div>
    {/each}
  </div>

  <div class="tools">
    <button type="button" onclick={() => shift(-1)} aria-label="Octave down">◀</button>
    <span class="range">{noteName(low)}</span>
    <button type="button" onclick={() => shift(1)} aria-label="Octave up">▶</button>
    <select bind:value={song.root} aria-label="Key">
      {#each ROOTS as r, i (r)}<option value={36 + i}>{r}</option>{/each}
    </select>
    <select bind:value={song.scale} aria-label="Scale">
      {#each Object.keys(SCALES) as sc (sc)}<option value={sc as ScaleId}>{sc}</option>{/each}
    </select>
    <span class="spacer"></span>
    <button type="button" onclick={() => (p.bass = randomBass(song.root, song.scale))}>Random</button>
    <button type="button" onclick={() => (p.bass = emptyPattern().bass)}>Clear</button>
    <button type="button" aria-pressed={song.mutes.bass} onclick={() => (song.mutes.bass = !song.mutes.bass)}>Mute</button>
  </div>

  <div class="keys">
    <Keys {low} {octaves} {held} onpress={press} onrelease={release} labels="c" scale={scalePcs} marked={p.bass[selected].on ? p.bass[selected].note : null} />
  </div>
</div>

<style>
  .page {
    height: 100%;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    gap: 6px;
  }
  .lanes {
    display: grid;
    gap: 8px;
  }
  .lane {
    display: grid;
    grid-template-columns: 44px repeat(var(--n), minmax(0, 1fr));
    grid-template-rows: 44px 22px 22px;
    gap: 3px;
  }
  .tag {
    font-size: 0.7rem;
    color: var(--muted);
    align-self: center;
  }
  .step {
    min-height: 0;
    padding: 0;
    font-size: 0.72rem;
    background: var(--panel);
    color: var(--muted);
  }
  .step.beat {
    background: var(--panel-2);
  }
  .step.on {
    background: color-mix(in srgb, var(--accent) 55%, var(--panel));
    color: var(--text);
    border-color: var(--accent);
  }
  .step.sel {
    box-shadow: inset 0 0 0 2px var(--text);
  }
  .step.now {
    outline: 2px solid var(--cool);
    outline-offset: -2px;
  }
  .flag {
    min-height: 0;
    padding: 0;
    border-radius: 4px;
    background: var(--panel);
  }
  .flag.set {
    background: var(--accent);
  }
  .flag.slide.set {
    background: var(--cool);
  }
  .tools {
    display: flex;
    gap: 6px;
    align-items: center;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tools > * {
    flex: none;
  }
  .range {
    min-width: 2.6em;
    text-align: center;
    color: var(--muted);
    font-size: 0.85rem;
  }
  .spacer {
    flex: 1;
  }
  .keys {
    min-height: 0;
    max-height: 320px;
  }
</style>
