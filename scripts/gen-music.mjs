#!/usr/bin/env node
// Generates music tracks via the ElevenLabs /v1/music endpoint, driven by
// src/bow/sounds/music.json. Writes MP3s into public/sfx/music/.
//
// Usage:
//   node scripts/gen-music.mjs                # generate missing tracks
//   node scripts/gen-music.mjs --force        # regenerate all
//   node scripts/gen-music.mjs --only <id>    # (re)generate one track
//
// Music is a paid-tier feature on ElevenLabs. If this fails with 402/403,
// the account doesn't have music access and we fall back to sfx-only.

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const MANIFEST_PATH = join(repoRoot, 'src/bow/sounds/music.json');
const OUTPUT_DIR = join(repoRoot, 'public/sfx');   // music/*.mp3 sits under public/sfx for the same URL layout as sfx
const ENDPOINT = 'https://api.elevenlabs.io/v1/music';

async function loadApiKey() {
  if (process.env.ELEVENLABS_APIKEY) return process.env.ELEVENLABS_APIKEY;
  try {
    const envText = await readFile(join(repoRoot, '.env'), 'utf8');
    for (const line of envText.split('\n')) {
      const m = line.match(/^\s*ELEVENLABS_APIKEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, '');
    }
  } catch { /* fall through */ }
  throw new Error('ELEVENLABS_APIKEY not set (checked env and .env)');
}

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

function parseArgs(argv) {
  const args = { force: false, only: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') args.force = true;
    else if (a === '--only') args.only = argv[++i];
    else if (a.startsWith('--only=')) args.only = a.slice('--only='.length);
    else if (!a.startsWith('--')) args.only = a;
  }
  return args;
}

async function generateOne(spec, defaults, apiKey) {
  const body = {
    prompt: spec.prompt,
    music_length_ms: spec.durationMs ?? null,
    model_id: spec.modelId ?? defaults.modelId,
  };
  const format = spec.outputFormat ?? defaults.outputFormat;
  const url = `${ENDPOINT}?output_format=${encodeURIComponent(format)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${errText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = await loadApiKey();
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const defaults = manifest.defaults ?? {};
  const all = manifest.tracks ?? [];

  let targets;
  if (args.only) {
    const one = all.find(t => t.id === args.only);
    if (!one) throw new Error(`no track with id "${args.only}" in music manifest`);
    targets = [one];
  } else {
    targets = all;
  }

  console.log(`Music manifest: ${targets.length} track(s) to consider`);

  let generated = 0, skipped = 0, failed = 0;
  for (const spec of targets) {
    const outPath = join(OUTPUT_DIR, spec.file);
    const already = await fileExists(outPath);
    if (already && !args.force && !args.only) {
      console.log(`  · skip   ${spec.id.padEnd(22)} (exists)`);
      skipped++;
      continue;
    }
    await mkdir(dirname(outPath), { recursive: true });
    const secs = (spec.durationMs ?? 0) / 1000;
    process.stdout.write(`  · gen    ${spec.id.padEnd(22)} ${secs}s  "${spec.prompt.slice(0, 60)}..."\n`);
    try {
      const audio = await generateOne(spec, defaults, apiKey);
      await writeFile(outPath, audio);
      console.log(`    ✓ ${outPath.replace(repoRoot + '/', '')} (${audio.length} bytes)`);
      generated++;
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`    ✗ ${spec.id}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. generated=${generated} skipped=${skipped} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
