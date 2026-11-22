<script lang="ts">
  import { allNotesOff, midiSupported, noteOff, noteOn, send } from '../engine/midiOut';
  import { stop } from '../seq/sequencer';
  import { connect, midiState, output } from '../state.svelte';

  const supported = midiSupported();


  function setTarget(t: 'phone' | 'midi') {
    if (t === output.bass) return;
    stop();
    output.bass = t;
    if (t === 'midi' && !midiState.ports.length) void connect();
  }

  function test() {
    const c = output.channel;
    [48, 55, 60].forEach((n, i) => {
      setTimeout(() => send(output.midiId, noteOn(c, n, 100)), i * 180);
      setTimeout(() => send(output.midiId, noteOff(c, n)), i * 180 + 160);
    });
  }

  const current = $derived(midiState.ports.find((p) => p.id === output.midiId) ?? null);
</script>

<div class="page">
  <section class="card">
    <h2>Bass track plays on</h2>
    <div class="choice" role="group" aria-label="Bass output">
      <button type="button" aria-pressed={output.bass === 'phone'} onclick={() => setTarget('phone')}>This phone</button>
      <button type="button" aria-pressed={output.bass === 'midi'} onclick={() => setTarget('midi')} disabled={!supported}>FM-1 (MIDI)</button>
    </div>
    {#if !supported}
      <p class="muted">This browser has no Web MIDI. Chrome on Android or desktop has it.</p>
    {:else if output.bass === 'phone'}
      <p class="muted">Plug the FM-1 into the phone with USB-C and pick FM-1 to play the bass line on it. Drums stay on the phone.</p>
    {:else if output.bass === 'midi'}
      {#if midiState.error}
        <p class="warn">{midiState.error}</p>
      {:else if !midiState.ports.length}
        <p class="muted">No MIDI output found. Plug the FM-1 into the phone with a USB-C cable, then:</p>
      {/if}
      <div class="row">
        {#if midiState.ports.length}
          <select bind:value={output.midiId} aria-label="MIDI output">
            {#each midiState.ports as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
          </select>
        {/if}
        <button type="button" onclick={connect}>{midiState.ports.length ? 'Rescan' : 'Connect'}</button>
      </div>
    {/if}
  </section>

  {#if output.bass === 'midi'}
    <section class="card">
      <h2>MIDI</h2>
      <div class="row">
        <label>
          Channel
          <select bind:value={output.channel}>
            {#each { length: 16 } as _, i (i)}<option value={i + 1}>{i + 1}</option>{/each}
          </select>
        </label>
        <button type="button" onclick={test} disabled={!current}>Test notes</button>
        <button type="button" onclick={() => send(output.midiId, allNotesOff(output.channel))} disabled={!current}>Panic</button>
      </div>
      <label class="check"><input type="checkbox" bind:checked={output.clock} /> Send clock (FM-1 arp and sequencer follow the tempo)</label>
      <label class="check"><input type="checkbox" bind:checked={output.doubleOnPhone} /> Also play the bass on the phone</label>
      <p class="muted small">Accent sends a harder velocity. Slide sends overlapping notes (legato); set the FM-1 to mono/legato with portamento to hear it glide.</p>
    </section>
  {/if}
</div>

<style>
  .page {
    height: 100%;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    align-content: start;
    gap: 10px;
  }
  .card {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 12px;
    display: grid;
    gap: 10px;
  }
  h2 {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .choice,
  .row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: end;
  }
  .choice button {
    flex: 1;
    min-height: 48px;
  }
  label {
    display: grid;
    gap: 4px;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .check {
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--text);
    min-height: 36px;
  }
  .check input {
    width: 20px;
    height: 20px;
    accent-color: var(--accent);
  }
  p {
    margin: 0;
  }
  .small {
    font-size: 0.8rem;
  }
  .warn {
    color: var(--accent-strong);
  }
</style>
