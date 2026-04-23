// Lightweight SFX player built on the Web Audio API.
//
// Why not HTMLAudioElement? It can't overlap the same clip with itself (a
// fast-firing bow would drop samples) and it can't pitch-shift. An
// AudioBufferSourceNode per play solves both — each shot gets its own node,
// and `playbackRate` on the node gives us free pitch control.
//
// Files are fetched+decoded lazily on first `playSfx(id)` and cached. Missing
// files silently noop so a partially-generated manifest doesn't break the
// game.

import manifest from './manifest.json';

type PlayOpts = { pitch?: number; volume?: number };

const URL_BY_ID: Record<string, string> = Object.fromEntries(
  // BASE_URL is `/` in dev and the Vite `base` (e.g. `/bow/`) in production,
  // so absolute paths correctly resolve under GitHub Pages' subpath.
  (manifest.sounds as Array<{ id: string; file: string }>).map(s => [s.id, `${import.meta.env.BASE_URL}sfx/${s.file}`]),
);

const LS_KEY = 'fire.sfxVolume';
const DEFAULT_VOLUME = 0.85;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let masterVolume = loadVolume();
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const SESSION_ID = Date.now().toString(36);

function loadVolume(): number {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw != null) {
      const v = parseFloat(raw);
      if (Number.isFinite(v)) return Math.max(0, Math.min(1, v));
    }
  } catch { /* fall through */ }
  return DEFAULT_VOLUME;
}

function saveVolume(v: number) {
  try { localStorage.setItem(LS_KEY, String(v)); } catch { /* ignore */ }
}

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(ctx.destination);
  } catch { /* audio blocked */ }
  return ctx;
}

// Call on the first user gesture (keydown, mousedown) so the browser unlocks
// the audio context. Safe to call repeatedly.
export function unlockSfx(): void {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => { /* ignore */ });
}

// ElevenLabs occasionally hands back stereo clips with an L/R imbalance —
// e.g. the enemy-death pop sits mostly in the right channel. Force every
// decoded buffer to mono so positional bias can't survive into playback.
function toMono(buf: AudioBuffer, c: AudioContext): AudioBuffer {
  if (buf.numberOfChannels === 1) return buf;
  const mono = c.createBuffer(1, buf.length, buf.sampleRate);
  const out = mono.getChannelData(0);
  const scale = 1 / buf.numberOfChannels;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const src = buf.getChannelData(ch);
    for (let i = 0; i < src.length; i++) out[i] += src[i] * scale;
  }
  return mono;
}

async function loadBuffer(id: string): Promise<AudioBuffer | null> {
  const url = URL_BY_ID[id];
  const c = ctx;
  if (!url || !c) return null;
  try {
    // Cache-bust per page load — regenerated mp3s should always be audible
    // without the user clearing the browser cache manually.
    const res = await fetch(`${url}?v=${SESSION_ID}`);
    if (!res.ok) return null;                 // file not generated yet
    const arr = await res.arrayBuffer();
    const decoded = await c.decodeAudioData(arr);
    return toMono(decoded, c);
  } catch {
    return null;
  }
}

function getBuffer(id: string): Promise<AudioBuffer | null> {
  let p = buffers.get(id);
  if (!p) {
    p = loadBuffer(id);
    buffers.set(id, p);
  }
  return p;
}

export function playSfx(id: string, opts: PlayOpts = {}): void {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  // Fire-and-forget; the promise resolves once the buffer is decoded. After
  // that, `.start()` is synchronous and latency-free.
  getBuffer(id).then(buf => {
    if (!buf || !ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.pitch ?? 1;
    if (opts.volume !== undefined && opts.volume !== 1) {
      const g = ctx.createGain();
      g.gain.value = opts.volume;
      src.connect(g).connect(masterGain!);
    } else {
      src.connect(masterGain!);
    }
    src.start();
  }).catch(() => { /* already handled */ });
}

export function getMasterVolume(): number {
  return masterVolume;
}

export function setMasterVolume(v: number): void {
  masterVolume = Math.max(0, Math.min(1, v));
  saveVolume(masterVolume);
  ensureCtx();
  if (masterGain) masterGain.gain.value = masterVolume;
}
