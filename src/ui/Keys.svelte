<script lang="ts">
  import { noteName } from '../seq/timing';

  const mod12 = (n: number) => ((n % 12) + 12) % 12;

  interface Props {
    low: number; // MIDI number of the lowest key (a C)
    octaves: number;
    /** Keys currently down, from touch or MIDI. */
    held: ReadonlySet<number>;
    onpress: (midi: number) => void;
    onrelease: (midi: number) => void;
    /** Which white keys carry a name: all of them, only the Cs, or none. */
    labels?: 'all' | 'c' | 'none';
    /** Pitch classes to mark as in the scale. */
    scale?: ReadonlySet<number>;
    /** The note of the selected step, outlined. */
    marked?: number | null;
  }
  let { low, octaves, held, onpress, onrelease, labels = 'all', scale, marked = null }: Props = $props();

  const WHITE = [0, 2, 4, 5, 7, 9, 11];

  // One extra C on top so the range ends on a C, like a real keyboard section.
  const keys = $derived.by(() => {
    const out: { midi: number; black: boolean; i: number }[] = [];
    let w = 0;
    for (let m = low; m <= low + octaves * 12; m++) {
      const black = !WHITE.includes(mod12(m));
      out.push({ midi: m, black, i: black ? w : w++ });
    }
    return out;
  });
  const whites = $derived(keys.filter((k) => !k.black).length);

  // Each finger (pointer) holds at most one key; sliding moves it to the key underneath.
  const fingers = new Map<number, number>();

  function keyAt(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-midi]');
    return el ? Number(el.dataset.midi) : null;
  }

  function stillHeld(midi: number, except: number) {
    for (const [id, m] of fingers) if (id !== except && m === midi) return true;
    return false;
  }

  function down(e: PointerEvent) {
    e.preventDefault();
    const m = keyAt(e.clientX, e.clientY);
    if (m === null) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    fingers.set(e.pointerId, m);
    onpress(m);
  }

  function move(e: PointerEvent) {
    const old = fingers.get(e.pointerId);
    if (old === undefined) return;
    const m = keyAt(e.clientX, e.clientY);
    if (m === null || m === old) return;
    fingers.set(e.pointerId, m);
    if (!stillHeld(old, e.pointerId)) onrelease(old);
    onpress(m);
  }

  function up(e: PointerEvent) {
    const old = fingers.get(e.pointerId);
    if (old === undefined) return;
    fingers.delete(e.pointerId);
    if (!stillHeld(old, e.pointerId)) onrelease(old);
  }

  // Keyboard users: Enter/Space plays the focused key.
  function keydown(e: KeyboardEvent, m: number) {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
      e.preventDefault();
      onpress(m);
    }
  }
  function keyup(e: KeyboardEvent, m: number) {
    if (e.key === 'Enter' || e.key === ' ') onrelease(m);
  }
</script>

<div
  class="kb"
  style:--whites={whites}
  role="group"
  aria-label="Piano keyboard"
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  oncontextmenu={(e) => e.preventDefault()}
>
  {#each keys as k (k.midi)}
    <button
      type="button"
      class="key"
      class:black={k.black}
      class:on={held.has(k.midi)}
      class:inscale={scale?.has(mod12(k.midi))}
      class:marked={marked === k.midi}
      style:--i={k.i}
      data-midi={k.midi}
      aria-label={noteName(k.midi)}
      onkeydown={(e) => keydown(e, k.midi)}
      onkeyup={(e) => keyup(e, k.midi)}
    >
      {#if !k.black && (labels === 'all' || (labels === 'c' && mod12(k.midi) === 0))}<span class="label" class:c={mod12(k.midi) === 0}>{noteName(k.midi)}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .kb {
    position: relative;
    width: 100%;
    height: 100%;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  .key {
    position: absolute;
    top: 0;
    left: calc(100% * var(--i) / var(--whites));
    width: calc(100% / var(--whites));
    height: 100%;
    min-height: 0;
    padding: 0 0 8px;
    border: 1px solid var(--key-border);
    border-radius: 0 0 6px 6px;
    background: var(--key-white);
    color: var(--key-white-text);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    font: inherit;
    -webkit-tap-highlight-color: transparent;
  }
  .key.black {
    left: calc(100% * var(--i) / var(--whites) - 100% * 0.3 / var(--whites));
    width: calc(100% * 0.6 / var(--whites));
    height: 60%;
    z-index: 1;
    background: var(--key-black);
    border-color: var(--key-black);
  }
  .key.on {
    background: var(--accent);
    border-color: var(--accent-strong);
  }
  .key.black.on {
    background: var(--accent-strong);
  }
  .key.inscale::after {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    width: 6px;
    height: 6px;
    margin-left: -3px;
    border-radius: 50%;
    background: var(--accent);
    opacity: 0.8;
  }
  .key.marked {
    box-shadow: inset 0 0 0 3px var(--accent);
  }
  .label {
    font-size: clamp(0.6rem, 1.6vw, 0.85rem);
    font-weight: 500;
    pointer-events: none;
  }
  .label.c {
    font-weight: 700;
  }
  .key:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: -4px;
    z-index: 2;
  }
</style>
