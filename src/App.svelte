<script lang="ts">
  import DrumPage from './ui/DrumPage.svelte';
  import BassPage from './ui/BassPage.svelte';
  import SoundPage from './ui/SoundPage.svelte';
  import Fm1Page from './ui/Fm1Page.svelte';
  import UpdatePrompt from './ui/UpdatePrompt.svelte';
  import { applyMix } from './engine/audio';
  import { midiSupported } from './engine/midiOut';
  import { choosePattern, toggle } from './seq/sequencer';
  import { stepDuration } from './seq/timing';
  import { connect, output, PATTERN_SLOTS, saveOutput, saveSong, song, transport } from './state.svelte';

  type Tab = 'drums' | 'bass' | 'sound' | 'fm1';
  const TABS: [Tab, string][] = [
    ['drums', 'Drums'],
    ['bass', 'Bass'],
    ['sound', 'Sound'],
    ['fm1', 'FM-1'],
  ];
  let tab = $state<Tab>('drums');

  // Save as you go; a short delay so dragging a fader doesn't write 60 times a second.
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    void JSON.stringify(song);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveSong, 300);
  });
  $effect(() => {
    void JSON.stringify(output);
    saveOutput();
  });

  $effect(() => {
    applyMix({ ...$state.snapshot(song.levels), delayTime: stepDuration(song.bpm) * 3 });
  });

  // MIDI was granted on an earlier visit: reconnect so the FM-1 is ready.
  if (output.bass === 'midi' && midiSupported()) void connect();

  // --- Tempo: drag the number up/down, or tap − / + ---
  const setBpm = (v: number) => (song.bpm = Math.round(Math.min(200, Math.max(60, v))));
  let bpmDrag: { y: number; v: number } | null = null;
  function bpmDown(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    bpmDrag = { y: e.clientY, v: song.bpm };
  }
  function bpmMove(e: PointerEvent) {
    if (bpmDrag) setBpm(bpmDrag.v + (bpmDrag.y - e.clientY) / 4);
  }

  function key(e: KeyboardEvent) {
    if (e.key === ' ' && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLSelectElement)) {
      e.preventDefault();
      toggle();
    }
  }

  const slotName = (i: number) => 'ABCD'[i];
  const midiLabel = $derived(output.bass === 'midi' ? 'FM-1' : 'Phone');
</script>

<svelte:window onkeydown={key} />

<div class="app">
  <header class="bar">
    <button type="button" class="play" class:on={transport.playing} onclick={toggle} aria-label={transport.playing ? 'Stop' : 'Play'}>
      {transport.playing ? '■' : '▶'}
    </button>

    <div class="bpm" role="group" aria-label="Tempo">
      <button type="button" class="sm" onclick={() => setBpm(song.bpm - 1)} aria-label="Slower">−</button>
      <span
        class="bpm-num"
        role="slider"
        tabindex="0"
        aria-label="BPM"
        aria-valuemin={60}
        aria-valuemax={200}
        aria-valuenow={song.bpm}
        onpointerdown={bpmDown}
        onpointermove={bpmMove}
        onpointerup={() => (bpmDrag = null)}
        onpointercancel={() => (bpmDrag = null)}
        onkeydown={(e) => {
          if (e.key === 'ArrowUp') setBpm(song.bpm + 1);
          if (e.key === 'ArrowDown') setBpm(song.bpm - 1);
        }}
      >
        {song.bpm}<small>BPM</small>
      </span>
      <button type="button" class="sm" onclick={() => setBpm(song.bpm + 1)} aria-label="Faster">+</button>
    </div>

    <div class="slots" role="group" aria-label="Patterns">
      {#each { length: PATTERN_SLOTS } as _, i (i)}
        <button
          type="button"
          class="slot"
          class:on={song.current === i}
          class:queued={song.queued === i}
          aria-label="Pattern {slotName(i)}{song.queued === i ? ', next' : ''}"
          onclick={() => choosePattern(i)}>{slotName(i)}</button
        >
      {/each}
    </div>

    <nav class="tabs" aria-label="Pages">
      {#each TABS as [id, label] (id)}
        <button type="button" class="tab" aria-current={tab === id ? 'page' : undefined} onclick={() => (tab = id)}>
          {label}{#if id === 'fm1'}<span class="dot" class:live={output.bass === 'midi'} title={midiLabel}></span>{/if}
        </button>
      {/each}
    </nav>
  </header>

  <main>
    {#if tab === 'drums'}
      <DrumPage />
    {:else if tab === 'bass'}
      <BassPage />
    {:else if tab === 'sound'}
      <SoundPage />
    {:else}
      <Fm1Page />
    {/if}
  </main>
</div>

<UpdatePrompt />

<style>
  .app {
    height: 100dvh;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 6px;
    padding: calc(4px + env(safe-area-inset-top)) calc(6px + env(safe-area-inset-right)) calc(4px + env(safe-area-inset-bottom))
      calc(6px + env(safe-area-inset-left));
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    align-items: center;
  }
  .play {
    width: 56px;
    min-height: 44px;
    font-size: 1.2rem;
  }
  .bpm {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .sm {
    min-width: 34px;
    padding: 0;
  }
  .bpm-num {
    min-width: 64px;
    text-align: center;
    font-size: 1.25rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    touch-action: none;
    cursor: ns-resize;
    line-height: 1;
  }
  .bpm-num small {
    display: block;
    font-size: 0.6rem;
    font-weight: 400;
    color: var(--muted);
    letter-spacing: 0.1em;
  }
  .slots {
    display: flex;
    gap: 4px;
  }
  .slot {
    width: 40px;
    padding: 0;
    font-weight: 700;
  }
  .slot.queued {
    animation: blink 0.5s steps(2) infinite;
    border-color: var(--accent);
  }
  @keyframes blink {
    50% {
      background: color-mix(in srgb, var(--accent) 40%, var(--panel-2));
    }
  }
  .tabs {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }
  .tab {
    background: transparent;
    border-color: transparent;
    color: var(--muted);
    position: relative;
  }
  .tab[aria-current='page'] {
    background: var(--panel-2);
    border-color: var(--line);
    color: var(--text);
  }
  .dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin-left: 5px;
    vertical-align: middle;
    background: var(--line);
  }
  .dot.live {
    background: var(--cool);
  }
  main {
    min-height: 0;
  }
  @media (orientation: portrait) {
    .tabs {
      margin-left: 0;
      width: 100%;
    }
    .tab {
      flex: 1;
    }
  }
</style>
