<script lang="ts">
  // A vertical strip you drag up and down: friendlier than a knob under a thumb.
  // Drag anywhere on it (it moves relative to where you started, so it never jumps);
  // double-tap to reset; arrow keys for keyboard users.

  interface Props {
    label: string;
    value: number;
    min?: number;
    max?: number;
    reset?: number;
    format?: (v: number) => string;
    onchange?: (v: number) => void;
  }
  let { label, value = $bindable(), min = 0, max = 1, reset, format = (v) => `${Math.round(((v - min) / (max - min)) * 100)}`, onchange }: Props = $props();

  const frac = $derived((value - min) / (max - min));
  let drag: { id: number; y: number; v: number; h: number } | null = null;
  let lastTap = 0;

  function set(v: number) {
    value = Math.min(max, Math.max(min, v));
    onchange?.(value);
  }

  function down(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, y: e.clientY, v: value, h: el.clientHeight };
    const now = performance.now();
    if (now - lastTap < 300 && reset !== undefined) set(reset);
    lastTap = now;
  }
  function move(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.id) return;
    set(drag.v + ((drag.y - e.clientY) / drag.h) * (max - min));
  }
  function up() {
    drag = null;
  }
  function key(e: KeyboardEvent) {
    const stepSize = (max - min) / 50;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') set(value + stepSize);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') set(value - stepSize);
    else return;
    e.preventDefault();
  }
</script>

<div class="fader">
  <div
    class="track"
    role="slider"
    tabindex="0"
    aria-label={label}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    aria-valuetext={format(value)}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
    onkeydown={key}
  >
    <div class="fill" style:height="{frac * 100}%"></div>
    <span class="value">{format(value)}</span>
  </div>
  <span class="label">{label}</span>
</div>

<style>
  .fader {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 4px;
    min-width: 0;
    height: 100%;
  }
  .track {
    position: relative;
    border-radius: 10px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    overflow: hidden;
    touch-action: none;
    min-height: 60px;
  }
  .fill {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(to top, color-mix(in srgb, var(--accent) 70%, transparent), color-mix(in srgb, var(--accent) 35%, transparent));
  }
  .value {
    position: absolute;
    top: 6px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    color: var(--text);
    pointer-events: none;
  }
  .label {
    text-align: center;
    font-size: 0.75rem;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
