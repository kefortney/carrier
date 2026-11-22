<script lang="ts">
  import Fader from './Fader.svelte';
  import { updateAcid } from '../engine/acid';
  import { defaultSong, song } from '../state.svelte';

  const d = defaultSong();
  const pct = (v: number) => `${Math.round(v * 100)}`;

  $effect(() => {
    updateAcid($state.snapshot(song.acid));
  });
</script>

<div class="page">
  <section class="group">
    <header>
      <h2>Bass</h2>
      <div class="wave" role="group" aria-label="Waveform">
        <button type="button" aria-pressed={song.acid.wave === 'sawtooth'} onclick={() => (song.acid.wave = 'sawtooth')}>Saw</button>
        <button type="button" aria-pressed={song.acid.wave === 'square'} onclick={() => (song.acid.wave = 'square')}>Square</button>
      </div>
    </header>
    <div class="faders">
      <Fader label="Cutoff" bind:value={song.acid.cutoff} reset={d.acid.cutoff} format={pct} />
      <Fader label="Reso" bind:value={song.acid.resonance} reset={d.acid.resonance} format={pct} />
      <Fader label="Env" bind:value={song.acid.envMod} reset={d.acid.envMod} format={pct} />
      <Fader label="Decay" bind:value={song.acid.decay} reset={d.acid.decay} format={pct} />
      <Fader label="Accent" bind:value={song.acid.accent} reset={d.acid.accent} format={pct} />
    </div>
  </section>

  <section class="group">
    <header><h2>Drums</h2></header>
    <div class="faders">
      <Fader label="Tune" bind:value={song.drumSound.tune} min={-12} max={12} reset={0} format={(v) => `${v > 0 ? '+' : ''}${Math.round(v)}`} />
      <Fader label="Decay" bind:value={song.drumSound.decay} reset={d.drumSound.decay} format={pct} />
    </div>
  </section>

  <section class="group">
    <header><h2>Mix</h2></header>
    <div class="faders">
      <Fader label="Drums" bind:value={song.levels.drums} max={1.2} reset={d.levels.drums} format={pct} />
      <Fader label="Bass" bind:value={song.levels.bass} max={1.2} reset={d.levels.bass} format={pct} />
      <Fader label="Delay" bind:value={song.levels.delay} reset={d.levels.delay} format={pct} />
      <Fader label="Feedback" bind:value={song.levels.feedback} max={0.85} reset={d.levels.feedback} format={pct} />
      <Fader label="Swing" bind:value={song.swing} min={50} max={75} reset={d.swing} format={(v) => `${Math.round(v)}%`} />
    </div>
  </section>
</div>

<style>
  .page {
    height: 100%;
    display: grid;
    grid-template-columns: 5fr 2fr 5fr;
    gap: 10px;
    min-height: 0;
  }
  @media (orientation: portrait) {
    .page {
      grid-template-columns: 1fr;
      grid-template-rows: repeat(3, minmax(0, 1fr));
    }
  }
  .group {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 6px;
    min-height: 0;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 8px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    min-height: 32px;
  }
  h2 {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .wave {
    display: flex;
    gap: 4px;
  }
  .wave button {
    min-height: 30px;
    font-size: 0.8rem;
    padding: 0 8px;
  }
  .faders {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 6px;
    min-height: 0;
  }
</style>
