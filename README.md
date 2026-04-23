# 🔥 Fire — Bow Arena

A top-down rogue-lite arena bow shooter. Draw, aim, release. Survive waves of enemies, pick level-up cards, build an outrageous combo.

Built with **React + Vite + PixiJS v8**. Sound effects + music are generated via the ElevenLabs API.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Scripts

| command | purpose |
| --- | --- |
| `npm run dev` | start the Vite dev server |
| `npm run build` | typecheck + production build into `dist/` |
| `npm run preview` | serve the production build locally |
| `npm run test` | run the Vitest suite |
| `npm run gen:sfx` | (re)generate missing sound effects via ElevenLabs |
| `npm run gen:music` | (re)generate missing music tracks via ElevenLabs |

The generation scripts read `ELEVENLABS_APIKEY` from `.env` (repo root) and write MP3s into `public/sfx/`. Both scripts skip anything that already exists on disk — pass `--force` to overwrite.

## Layout

```
src/
  BowSandbox.tsx     — the whole game: tick loop, input, rendering, HUD
  bow/
    constants.ts     — tuning knobs
    types.ts         — runtime + HUD types
    upgrades.ts      — upgrade pool + bow render styles
    shapes.ts        — shared bow/arrow drawing primitives
    palettes.ts      — per-wave palettes
    utils.ts         — helpers (lerp, bowGeometry, levelForXp, …)
    sounds/          — sfx + music manifests and the Web Audio players
    ui/              — React overlays (slots, cards, progression panel)
public/sfx/          — generated .mp3 assets
scripts/             — ElevenLabs generation scripts
```
