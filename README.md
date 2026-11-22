# Carrier

A pocket groovebox for the phone: a 5-voice drum machine and an acid bass line on 16 steps. Play it on its own, or plug an M-VAVE FM-1 into the phone with USB-C and send the bass line to it over MIDI. Runs offline as an installed web app; no samples, every sound is synthesized.

Live: https://kefortney.github.io/carrier/

Best in landscape. In portrait the steps split into two rows of 8.

## What's in it

- **Drums.** Kick, snare, clap, closed and open hat (a closed hat chokes the open one). Tap a cell: on → accent → off. Tune and decay for the whole kit.
- **Bass.** A 303-style mono line: saw or square into a resonant low-pass, with cutoff, resonance, envelope amount, decay and accent. Per step: note, accent, slide. Select a step and tap a key to write the note; it moves to the next step, so you can type a line in. Keys show the chosen key and scale; Random writes a line in that scale.
- **Patterns A–D.** While playing, picking another pattern switches at the next bar.
- **Mix.** Drum and bass levels, a dotted-eighth delay on the bass, swing (50–75%).
- **FM-1.** The bass track can play on the FM-1 instead of the phone (or both). Accent sends velocity 120; slide sends overlapping notes, so set the FM-1 to mono/legato with portamento to hear the glide. Optional MIDI clock and start/stop so the FM-1's arp and sequencer follow the tempo. Panic sends All Notes Off.
- Everything saves on the phone as you go.

## Limits

- Playback stops when the phone locks or the app goes to the background (browsers pause audio and timers). The screen stays on while a loop plays.
- Web MIDI is Chrome/Edge only (Android and desktop).
- Notes you tap live arrive tens of milliseconds late on Android; sequenced notes are scheduled ahead on the audio clock and stay tight.

## Develop

Needs Node 20.

```sh
npm install
npm run dev      # http://localhost:5173/carrier/
npm test
npm run check
npm run build
```

Code map: `src/engine/` makes sound and MIDI (audio graph, drums, acid voice, MIDI out), `src/seq/` is the pattern model, timing and the look-ahead sequencer, `src/ui/` is the screens.

## Deploy

Pushing to `main` runs the checks and tests and deploys with GitHub Actions. One-time setup: **Settings → Pages → Source: GitHub Actions**.
