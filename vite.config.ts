/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this repo at /carrier/. A wrong base gives a blank page.
const base = '/carrier/';

export default defineConfig(({ mode }) => ({
  base,
  // Component tests mount Svelte in jsdom, which needs the browser build.
  resolve: mode === 'test' ? { conditions: ['browser'] } : undefined,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Carrier',
        short_name: 'Carrier',
        description: 'Pocket groovebox: drums and acid bass, alone or driving an FM-1 over USB MIDI.',
        theme_color: '#15171d',
        background_color: '#15171d',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
}));
