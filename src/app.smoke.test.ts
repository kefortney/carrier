// @vitest-environment jsdom
import { describe, expect, it, beforeAll } from 'vitest';
import { flushSync, mount } from 'svelte';

const buttons = () => [...document.querySelectorAll('button')];
const byText = (t: string) => buttons().find((b) => b.textContent?.trim() === t)!;

describe('app smoke test', () => {
  beforeAll(async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const { default: App } = await import('./App.svelte');
    mount(App, { target: document.getElementById('app')! });
    flushSync();
  });

  it('opens on the drum grid with the demo beat', () => {
    expect(document.querySelectorAll('.cell')).toHaveLength(5 * 16);
    expect(document.querySelector('[aria-label="Kick step 1: accent"]')).toBeTruthy();
  });

  it('tapping a cell cycles it', () => {
    const cell = document.querySelector('[aria-label="Snare step 1: off"]') as HTMLButtonElement;
    cell.click();
    flushSync();
    expect(document.querySelector('[aria-label="Snare step 1: on"]')).toBeTruthy();
  });

  it('bass page: tapping a key writes the selected step and moves on', () => {
    byText('Bass').click();
    flushSync();
    (document.querySelector('[aria-label^="Step 1:"]') as HTMLButtonElement).click(); // select step 1
    flushSync();
    const key = document.querySelector('.kb button[aria-label="G2"]')!;
    key.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    key.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    flushSync();
    expect(document.querySelector('[aria-label^="Step 1:"]')?.textContent?.trim()).toBe('G2');
    expect(document.querySelector('[aria-label="Step 2: C2, selected"]')).toBeTruthy();
  });

  it('sound and FM-1 pages render', () => {
    byText('Sound').click();
    flushSync();
    expect(document.querySelectorAll('[role="slider"][aria-label="Cutoff"]')).toHaveLength(1);
    byText('FM-1').click();
    flushSync();
    expect(document.body.textContent).toContain('Bass track plays on');
  });

  it('pattern slots switch when stopped', () => {
    byText('B').click();
    flushSync();
    byText('Drums').click();
    flushSync();
    expect(document.querySelector('[aria-label="Kick step 1: off"]')).toBeTruthy();
  });
});
