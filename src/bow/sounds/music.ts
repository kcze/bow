// Background-music player with volume ducking + audio analysis.
//
// Signal chain:  <audio> element
//   → MediaElementAudioSourceNode
//   → AnalyserNode  (for reactive visuals — grid pulse, particle density)
//   → GainNode      (music volume × duck factor)
//   → destination
//
// Volume is persisted to localStorage. "Ducking" briefly lowers music while
// the game is paused or the level-up overlay is up, without touching the
// user's slider setting.

import manifest from './music.json';

const URL_BY_ID: Record<string, string> = Object.fromEntries(
  (manifest.tracks as Array<{ id: string; file: string }>).map(t => [t.id, `${import.meta.env.BASE_URL}sfx/${t.file}`]),
);
const SESSION_ID = Date.now().toString(36);
const LS_KEY = 'fire.musicVolume';
const DUCK_FACTOR = 0.35;
// Global music headroom — 100% slider = 50% output. Keeps music sitting under
// the sfx instead of fighting it even when a player cranks the slider.
const MASTER_SCALE = 0.5;

let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let freqData: Uint8Array | null = null;
let gainNode: GainNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;

let audio: HTMLAudioElement | null = null;
let currentId: string | null = null;
let currentVolume = loadVolume();
let ducked = false;
let trackBpm = 120;

function bpmStorageKey(trackId: string) { return `fire.bpm.${trackId}`; }

function loadStoredBpm(trackId: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(bpmStorageKey(trackId));
    if (raw != null) {
      const v = parseFloat(raw);
      if (Number.isFinite(v) && v > 40 && v < 300) return v;
    }
  } catch { /* ignore */ }
  return fallback;
}

export function getMusicBpm(): number { return trackBpm; }

export function getCurrentTrackId(): string | null { return currentId; }

export function listMusicTrackIds(): string[] {
  return (manifest.tracks as Array<{ id: string }>).map(t => t.id);
}

export function setMusicBpm(bpm: number): void {
  trackBpm = Math.max(40, Math.min(300, bpm));
  if (currentId) {
    try { localStorage.setItem(bpmStorageKey(currentId), String(trackBpm)); } catch { /* ignore */ }
  }
}

function loadVolume(): number {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw != null) {
      const v = parseFloat(raw);
      if (Number.isFinite(v)) return Math.max(0, Math.min(1, v));
    }
  } catch { /* fall through */ }
  return 0.4;
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
  } catch { /* audio blocked */ }
  return ctx;
}

function applyGain() {
  if (gainNode && ctx) {
    const target = currentVolume * (ducked ? DUCK_FACTOR : 1) * MASTER_SCALE;
    // Smooth the change so it doesn't click on duck toggles.
    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.setTargetAtTime(target, ctx.currentTime, 0.06);
  }
}

export function getMusicVolume(): number {
  return currentVolume;
}

export function setMusicVolume(v: number): void {
  currentVolume = Math.max(0, Math.min(1, v));
  saveVolume(currentVolume);
  applyGain();
}

export function setMusicDuck(d: boolean): void {
  if (d === ducked) return;
  ducked = d;
  applyGain();
}

export function startMusic(trackId: string): void {
  if (currentId === trackId && audio && !audio.paused) return;
  const url = URL_BY_ID[trackId];
  if (!url) return;
  stopMusic();

  const c = ensureCtx();
  audio = new Audio(`${url}?v=${SESSION_ID}`);
  audio.loop = true;
  audio.preload = 'auto';
  // No crossOrigin — the mp3 is same-origin (served by Vite under /sfx/…).
  // Setting crossOrigin='anonymous' on a same-origin source taints the
  // MediaElementSource so the analyser returns all-zero data.
  currentId = trackId;
  const track = (manifest.tracks as Array<{ id: string; bpm?: number }>).find(t => t.id === trackId);
  // Prefer user-tuned BPM (from the pause-overlay controls) over manifest.
  trackBpm = loadStoredBpm(trackId, track?.bpm ?? 120);

  if (c) {
    // Build the analyser chain once — createMediaElementSource only accepts a
    // given <audio> once per context, so we throw away the previous graph.
    sourceNode = c.createMediaElementSource(audio);
    analyser = c.createAnalyser();
    analyser.fftSize = 256;                              // 128 freq bins — plenty for gross shape
    analyser.smoothingTimeConstant = 0.78;               // moderate smoothing — responsive without strobing
    freqData = new Uint8Array(analyser.frequencyBinCount);
    gainNode = c.createGain();
    gainNode.gain.value = currentVolume * (ducked ? DUCK_FACTOR : 1) * MASTER_SCALE;
    sourceNode.connect(analyser).connect(gainNode).connect(c.destination);
    audio.volume = 1;                                    // Web Audio chain handles volume
  } else {
    audio.volume = currentVolume * (ducked ? DUCK_FACTOR : 1) * MASTER_SCALE;
  }

  audio.play().catch(() => { /* autoplay blocked — user can click again */ });
}

export function stopMusic(): void {
  if (audio) {
    audio.pause();
    audio.src = '';
    audio = null;
  }
  if (sourceNode) { try { sourceNode.disconnect(); } catch { /* ignore */ } sourceNode = null; }
  if (analyser)   { try { analyser.disconnect();   } catch { /* ignore */ } analyser = null; }
  if (gainNode)   { try { gainNode.disconnect();   } catch { /* ignore */ } gainNode = null; }
  freqData = null;
  currentId = null;
}

// Reads the analyser and returns four 0..1 energy bands the game render can
// cheaply react to. Returns zeros when no music is playing.
export interface MusicEnergy { bass: number; low: number; mid: number; overall: number; }
const ZERO: MusicEnergy = { bass: 0, low: 0, mid: 0, overall: 0 };

export function sampleMusicEnergy(): MusicEnergy {
  if (!analyser || !freqData) return ZERO;
  analyser.getByteFrequencyData(freqData);
  const n = freqData.length;                              // 128 bins at 44.1kHz ≈ 0–22kHz, ~172Hz/bin
  let bass = 0, low = 0, mid = 0, overall = 0;
  // 0–4 bins ≈ 0–700Hz (kick/bass), 4–12 ≈ 700Hz–2kHz (low mids), 12–40 ≈ mids
  for (let i = 0; i < 4; i++) bass += freqData[i];
  for (let i = 4; i < 12; i++) low += freqData[i];
  for (let i = 12; i < 40; i++) mid += freqData[i];
  for (let i = 0; i < n; i++) overall += freqData[i];
  // Moderate gain so typical content swings 0..0.7 instead of pinning at 1.0.
  // Visual multipliers on the consumer side amplify from there.
  return {
    bass:    Math.min(1, (bass    / (4  * 255)) * 1.6),
    low:     Math.min(1, (low     / (8  * 255)) * 1.5),
    mid:     Math.min(1, (mid     / (28 * 255)) * 1.5),
    overall: Math.min(1, (overall / (n  * 255)) * 1.5),
  };
}

// Returns a 0..1 envelope that peaks every N beats and decays exponentially
// between pulses. Driven by the audio element's currentTime, so it stays
// locked to playback position and resyncs automatically at loop boundaries.
// Default N=2 ("every other beat") — one pulse per beat reads as strobing
// for most tracks. Tune each track's bpm field in music.json until the
// visual pulse reads in time with the kick drum.
export function getMusicBeat(everyNBeats: number = 1): number {
  if (!audio || audio.paused) return 0;
  const beat = 60 / trackBpm;
  const period = beat * everyNBeats;                       // seconds per pulse
  // Offset by one beat so the pulse lands on the off-beat (beat 1, 3, 5…
  // instead of 0, 2, 4…) — the downbeat is usually already accented by the
  // track itself, and syncing visuals to the in-between beats reads as more
  // musical. Modulo math guards against the brief negative window.
  const t = audio.currentTime - beat;
  const phase = ((t % period) + period) % period;
  return Math.exp(-phase * 3);
}
