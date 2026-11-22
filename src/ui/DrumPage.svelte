<script lang="ts">
  import { playDrum } from '../engine/drums';
  import { cycleHit, DRUM_LABELS, DRUM_VOICES, emptyPattern, randomDrums, STEPS, type DrumVoice } from '../seq/pattern';
  import { pattern, song, transport } from '../state.svelte';
  import { layout } from './layout.svelte';

  const p = $derived(pattern());
  const halves = $derived(layout.portrait ? [[0, 8], [8, 16]] : [[0, STEPS]]);

  function hear(v: DrumVoice) {
    playDrum(v, null, 1, song.drumSound);
  }
  function tap(v: DrumVoice, i: number) {
    const next = cycleHit(p.drums[v][i]);
    p.drums[v][i] = next;
    if (next && !transport.playing) hear(v);
  }
</script>

<div class="page">
  <div class="grids">
    {#each halves as [from, to] (from)}
      <div class="grid" style:--n={to - from}>
        {#each DRUM_VOICES as v (v)}
          <button type="button" class="name" onclick={() => hear(v)}>{DRUM_LABELS[v]}</button>
          {#each { length: to - from } as _, k (k)}
            {@const i = from + k}
            <button
              type="button"
              class="cell"
              class:beat={i % 4 === 0}
              class:hit={p.drums[v][i] === 1}
              class:acc={p.drums[v][i] === 2}
              class:now={transport.step === i}
              aria-label="{DRUM_LABELS[v]} step {i + 1}: {['off', 'on', 'accent'][p.drums[v][i]]}"
              onclick={() => tap(v, i)}
            ></button>
          {/each}
        {/each}
      </div>
    {/each}
  </div>
  <div class="tools">
    <span class="muted hint">Tap: on → accent → off</span>
    <button type="button" onclick={() => (p.drums = randomDrums())}>Random</button>
    <button type="button" onclick={() => (p.drums = emptyPattern().drums)}>Clear</button>
    <button type="button" aria-pressed={song.mutes.drums} onclick={() => (song.mutes.drums = !song.mutes.drums)}>Mute</button>
  </div>
</div>

<style>
  .page {
    height: 100%;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 6px;
  }
  .grids {
    display: grid;
    gap: 10px;
    min-height: 0;
  }
  .grid {
    display: grid;
    grid-template-columns: 52px repeat(var(--n), minmax(0, 1fr));
    grid-auto-rows: minmax(0, 1fr);
    gap: 3px;
    min-height: 0;
  }
  .name {
    min-height: 0;
    padding: 0 4px;
    font-size: 0.75rem;
    background: var(--panel);
  }
  .cell {
    min-height: 0;
    padding: 0;
    border-radius: 5px;
    background: var(--panel);
    border-color: var(--line);
  }
  .cell.beat {
    background: var(--panel-2);
  }
  .cell.hit {
    background: color-mix(in srgb, var(--accent) 55%, var(--panel));
    border-color: var(--accent);
  }
  .cell.acc {
    background: var(--accent);
    border-color: var(--accent-strong);
  }
  .cell.now {
    outline: 2px solid var(--cool);
    outline-offset: -2px;
  }
  .tools {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    align-items: center;
  }
  .hint {
    margin-right: auto;
    font-size: 0.8rem;
  }
</style>
