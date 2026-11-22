import { mount } from 'svelte';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import './app.css';
import App from './App.svelte';

// Installed apps may lock orientation without fullscreen; "any" lets it rotate freely.
if (matchMedia('(display-mode: standalone)').matches) {
  const o = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
  o?.lock?.('any').catch(() => {});
}

export default mount(App, { target: document.getElementById('app')! });
