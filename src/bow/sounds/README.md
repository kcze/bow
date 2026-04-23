# Sound effects

All SFX for this game are generated with the ElevenLabs text-to-sound-effects
API. The catalogue of sounds — IDs, prompts, durations, and where they play —
lives in [`manifest.json`](./manifest.json).

## Generating

Put your ElevenLabs API key in the repo root `.env` as `ELEVENLABS_APIKEY`,
then:

```bash
# generate every sound that is missing from public/sfx/
npm run gen:sfx

# regenerate a specific sound (even if it already exists)
npm run gen:sfx -- --only shoot_basic

# regenerate everything (destructive — overwrites all files)
npm run gen:sfx -- --force
```

Output files land in `public/sfx/<category>/<name>.mp3` and Vite serves them
at `/sfx/<category>/<name>.mp3` in dev and production.

## Tuning a sound

1. Find the entry in `manifest.json`.
2. Edit `prompt`, `duration`, or (optionally) `promptInfluence`.
3. Run `npm run gen:sfx -- --only <id>` to regenerate just that file.
4. Audition in the game. The script is non-deterministic, so you may need
   to run it several times to get a variant you like — there is no seed.

## Prompt-engineering notes

ElevenLabs outputs are non-deterministic and lean toward long ambient beds
unless you constrain them. The prompts in `manifest.json` follow these rules:

- Always set an explicit `duration` (0.2–0.8s for most one-shots).
- Add dry/one-shot language ("dry", "no reverb tail", "one-shot") so the
  model doesn't tack on a decay.
- Stay abstract/sci-fi and avoid real-instrument names — the user's brief was
  "abstract and nice, futuristic, not real bow sounds".
- `promptInfluence` defaults to 0.7 (fairly literal). Drop to ~0.4 when you
  want more character; raise toward 0.9 for deterministic short hits.

## Runtime (TODO)

The playback layer will consume this manifest too (an ID → HTMLAudioElement
registry, with pitch-shift on shoot by arrows remaining). Until that's built,
the manifest is just the generation catalog.
