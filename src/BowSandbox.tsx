import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import {
  PLAYER_SPEED, DRAW_PLAYER_SPEED_MULT, DRAW_RATE,
  ARROW_DAMAGE, MIN_RANGE, MAX_RANGE, FLIGHT_TIME,
  CAM_LOOKAHEAD, CAM_LERP,
  PLAYER_MAX_HP, PLAYER_MAX_HP_CAP,
  QUIVER_CAPACITY, ARROW_RELOAD_S,
  BOW_GRIP_OFFSET, BOW_MAX_PULL, ARROW_LENGTH,
  BOW_SIL_LIMB_LENGTH, BOW_SIL_CUR_ALPHA, BOW_SIL_MAX_ALPHA,
  ENEMY_TOUCH_DAMAGE,
  GRUNT_RADIUS, GRUNT_SPEED, GRUNT_HP, GRUNT_AURA_TINT,
  GRUNT_FILL_DARK, GRUNT_FILL_MID, GRUNT_FILL_HIGH,
  GRUNT_STROKE, GRUNT_EMBER, GRUNT_DESPAWN_MARGIN,
  WEAVER_SPEED, WEAVER_LATERAL_AMP, WEAVER_LATERAL_FREQ,
  BROODMOTHER_RADIUS, BROODMOTHER_SPEED, BROODMOTHER_HP,
  BROODMOTHER_SPAWN_INTERVAL,
  BROODMOTHER_AURA_TINT, BROODMOTHER_FILL_DARK, BROODMOTHER_FILL_MID,
  BROODMOTHER_FILL_HIGH, BROODMOTHER_STROKE, BROODMOTHER_EMBER,
  SAPPER_RADIUS, SAPPER_SPEED, SAPPER_HP, SAPPER_MINE_INTERVAL,
  SAPPER_WANDER_CHANGE, SAPPER_TURN_RATE,
  PULSER_RADIUS, PULSER_SPEED, PULSER_HP, PULSER_PULSE_INTERVAL,
  PULSER_RING_MAX_RADIUS, PULSER_RING_SPEED, PULSER_RING_DAMAGE,
  YELLOW_AURA_TINT, YELLOW_FILL_DARK, YELLOW_FILL_MID, YELLOW_FILL_HIGH,
  YELLOW_STROKE, YELLOW_EMBER,
  PULSER_AURA_TINT, PULSER_FILL_DARK, PULSER_FILL_MID, PULSER_FILL_HIGH,
  PULSER_STROKE, PULSER_EMBER,
  MINE_RADIUS, MINE_LIFETIME,
  SPAWNLING_RADIUS, SPAWNLING_SPEED, SPAWNLING_HP,
  SPAWNLING_MAX_LIFE,
  SPAWNLING_AURA_TINT, SPAWNLING_FILL_MID, SPAWNLING_STROKE, SPAWNLING_EMBER,
  CHARGER_RADIUS, CHARGER_HP, CHARGER_PURSUE_SPEED, CHARGER_DETECT_RANGE,
  CHARGER_TELEGRAPH_S, CHARGER_LAUNCH_SPEED, CHARGER_LAUNCH_DRAG,
  CHARGER_MIN_LAUNCH_SPEED, CHARGER_MAX_LAUNCH_T, CHARGER_FREEZE_S,
  CHARGER_AURA_TINT, CHARGER_FILL_DARK, CHARGER_FILL_MID,
  CHARGER_FILL_HIGH, CHARGER_STROKE, CHARGER_EMBER,
  STALKER_RADIUS, STALKER_SPEED, STALKER_TURN_RATE, STALKER_HP,
  STALKER_AURA_TINT, STALKER_FILL_DARK, STALKER_FILL_MID,
  STALKER_FILL_HIGH, STALKER_STROKE, STALKER_EMBER,
  ARENA_RADIUS, ARENA_COLOR,
  WAVE_DURATION, WAVE_PAUSE_S, WAVE_BASE_COUNT,
  MAX_LEVEL,
  EXPLOSION_RADIUS, EXPLOSION_DAMAGE_MULT, EXPLOSION_MIN_FALLOFF,
  BLAZING_PATCH_SPACING, BLAZING_PATCH_RADIUS,
  BLAZING_PATCH_DURATION_1, BLAZING_PATCH_DURATION_2, BLAZING_PATCH_DURATION_3, BLAZING_PATCH_DPS,
  BLAZING_PATCH_DAMAGE_CAP,
  SHIELD_REGEN_BASE, SHIELD_REGEN_PER_POWER,
  SHOCKWAVE_EXPAND_SPEED, SHOCKWAVE_MAX_RADIUS_BASE,
  SHOCKWAVE_MAX_RADIUS_PER_POWER, SHOCKWAVE_DAMAGE_BASE,
  SHOCKWAVE_DAMAGE_PER_POWER,
  EMBER_TRAIL_PATCH_DURATION_BASE, EMBER_TRAIL_PATCH_DURATION_PER_POWER,
  EMBER_TRAIL_PATCH_RADIUS, EMBER_TRAIL_PATCH_DPS, EMBER_TRAIL_PATCH_DAMAGE_CAP,
  SPLIT2_SPREAD_DEG, SPLIT3_SPREAD_DEG, SPLIT5_SPREAD_DEG,
} from './bow/constants';
import type {
  BowKind, BowRenderStyle, QuiverKind, ItemKind,
  Upgrade, Stats, Loadout,
  Arrow, ArrowVolley, Enemy, EnemyKind, ChargeState,
  HitRing, Particle, SpawnParticleArgs,
  FirePatch, RingEffect, EnemyRing,
  HudState, Palette,
} from './bow/types';
import { baseStats } from './bow/types';
import { PALETTES, lerpColor } from './bow/palettes';
import { BOW_RENDER, BOW_STATS, UPGRADES, SHATTER_SHARD_COUNT, SHATTER_SHARD_DAMAGE_MULT } from './bow/upgrades';
import {
  lerp, fmtMMSS, getGlowTexture, getCircleTexture,
  weightedPickN, xpToReachLevel, levelForXp,
} from './bow/utils';
import { drawArrowShape, drawBowInto } from './bow/shapes';
import {
  BowSlot, QuiverSlot, ItemSlot,
  QUIVER_ACCENT,
} from './bow/ui/slots';
import { UpgradeCard, LevelUpParticles, ProgressionPanel, DebugPanel, familiesForUpgrade } from './bow/ui/overlays';
import { playSfx, unlockSfx, getMasterVolume, setMasterVolume } from './bow/sounds/player';
import { startMusic, getMusicVolume, setMusicVolume, setMusicDuck, getMusicBeat, sampleMusicEnergy } from './bow/sounds/music';
import { useTable, useReducer as useStdbReducer, useSpacetimeDB } from 'spacetimedb/react';
import { tables, reducers } from './module_bindings';
import type { Score as OnlineScore } from './module_bindings/types';

// Dev-only: picker chips for jumping straight into late-game pools. The
// actual starting wave is whichever chip the player selects in the loadout
// screen — this is just the menu of options. The default (first element)
// is what the picker initialises to.
// ─── Leaderboard ────────────────────────────────────────────────────────────
// Top-10 local scoreboard kept in localStorage. Damage is the headline stat
// (it feeds XP + levels), followed by time → kills → level as tiebreakers.
interface Score {
  name: string;
  level: number;
  kills: number;
  damage: number;
  time: number;   // seconds survived
  ts: number;     // epoch ms — also used to identify the just-finished run
}
// v2 bumps the key so older time-sorted rows don't leak into the new
// damage-primary ordering with possibly-incomparable tie-breaker semantics.
const SCORES_LS = 'fire.scores.v2';
const MAX_SCORES = 10;

// Mirror of the server-side `sanitizeName`. Strips control + combining
// characters so bidi overrides / zero-widths / Zalgo can't sneak onto the
// public leaderboard. Server re-applies the same rule authoritatively —
// this copy just keeps the local UI consistent with what's accepted.
function sanitizePlayerName(raw: string): string {
  const trimmed = raw
    .replace(/[\p{C}\p{M}]/gu, '')
    .trim()
    .slice(0, 20);
  return trimmed || 'Bowman';
}

function readScores(): Score[] {
  try {
    const raw = localStorage.getItem(SCORES_LS);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((s): s is Score =>
      s && typeof s.name === 'string' && typeof s.time === 'number'
        && typeof s.level === 'number' && typeof s.kills === 'number'
        && typeof s.damage === 'number' && typeof s.ts === 'number');
  } catch { return []; }
}

function compareScores(a: Score, b: Score) {
  if (b.damage !== a.damage) return b.damage - a.damage;
  if (b.time !== a.time)     return b.time - a.time;
  if (b.kills !== a.kills)   return b.kills - a.kills;
  return b.level - a.level;
}

function saveScore(score: Score): Score[] {
  const all = [...readScores(), score]
    .sort(compareScores)
    .slice(0, MAX_SCORES);
  try { localStorage.setItem(SCORES_LS, JSON.stringify(all)); } catch { /* ignore */ }
  return all;
}

export default function BowSandbox() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const pickUpgradeRef = useRef<((i: number) => void) | null>(null);
  const startGameRef = useRef<(() => void) | null>(null);
  const resetGameRef = useRef<(() => void) | null>(null);
  const togglePauseRef = useRef<(() => void) | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [cardsReady, setCardsReady] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [musicVol, setMusicVol] = useState<number>(() => getMusicVolume());
  const [sfxVol, setSfxVol] = useState<number>(() => getMasterVolume());
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('fire.playerName');
      if (saved && saved.trim()) return saved;
    } catch { /* ignore */ }
    return 'Bowman';
  });
  const commitPlayerName = (next: string) => {
    const trimmed = sanitizePlayerName(next);
    setPlayerName(trimmed);
    try { localStorage.setItem('fire.playerName', trimmed); } catch { /* ignore */ }
  };
  const [scores, setScores] = useState<Score[]>(() => readScores());
  // Timestamp of the score just saved for this run — lets the game-over
  // leaderboard highlight which row is yours.
  const [lastScoreTs, setLastScoreTs] = useState<number | null>(null);

  // Live online leaderboard — SpacetimeDB pushes updates over the open
  // websocket; `onlineReady` flips true once the initial subscription has
  // returned so we can distinguish "connecting" from "no scores yet".
  const [onlineScores, onlineReady] = useTable(tables.score);
  const stdb = useSpacetimeDB();
  const myIdentityHex = stdb.identity ? stdb.identity.toHexString() : null;

  const submitScoreOnline = useStdbReducer(reducers.submitScore);
  const [hud, setHud] = useState<HudState>({
    hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP,
    arrows: QUIVER_CAPACITY, maxArrows: QUIVER_CAPACITY,
    reloadRemaining: 0, reloadSeconds: ARROW_RELOAD_S,
    wave: 1, wavePhase: 'active', waveRemaining: WAVE_DURATION,
    damageDealt: 0, timeSurvived: 0, dead: false,
    xp: 0, level: 1, xpInLevel: 0, xpForLevel: 10,
    kills: 0, awaitingStart: true,
    paused: true, levelUpPending: false, levelUpChoices: [],
    stats: baseStats(),
    statLevels: {},
    loadout: { bow: 'basic', quiver: 'basic', item: 'none' },
    atMaxLevel: false,
    shieldUp: false, shieldRegenFrac: 0,
    itemPowerLevel: 0,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application();
    let destroyed = false;
    let initialized = false;
    let cleanupListeners: (() => void) | null = null;

    app.init({
      width: window.innerWidth, height: window.innerHeight,
      backgroundColor: 0x0a0c12, antialias: true,
      resolution: window.devicePixelRatio || 1, autoDensity: true,
    }).then(() => {
      initialized = true;
      if (destroyed || !canvasRef.current) {
        app.destroy(true, { children: true });
        return;
      }
      while (canvasRef.current.firstChild) canvasRef.current.removeChild(canvasRef.current.firstChild);
      canvasRef.current.appendChild(app.canvas);

      const glowTex = getGlowTexture();
      const circleTex = getCircleTexture();

      // Background fill sits under everything; we repaint it every frame with
      // the current palette tint so wave transitions shift the whole stage.
      const bgGfx = new PIXI.Graphics();
      app.stage.addChild(bgGfx);

      const groundLayer = new PIXI.Container();
      const particleLayer = new PIXI.Container();
      const firePatchLayer = new PIXI.Container();
      const enemyLayer = new PIXI.Container();
      const playerLayer = new PIXI.Container();
      const arrowLayer = new PIXI.Container();
      const fxLayer = new PIXI.Container();
      app.stage.addChild(groundLayer, particleLayer, firePatchLayer, enemyLayer, playerLayer, arrowLayer, fxLayer);

      // Three grid layers at different scales, alphas, and parallax depths so
      // the camera pans reveal a sense of depth behind the gameplay plane.
      const gridFarGfx = new PIXI.Graphics();
      const gridMidGfx = new PIXI.Graphics();
      const gridNearGfx = new PIXI.Graphics();
      groundLayer.addChild(gridFarGfx, gridMidGfx, gridNearGfx);
      function drawGridLayer(
        gfx: PIXI.Graphics, camX: number, camY: number,
        spacing: number, color: number, alpha: number, parallax: number,
      ) {
        gfx.clear();
        const W = window.innerWidth, H = window.innerHeight;
        const pCamX = camX * parallax;
        const pCamY = camY * parallax;
        const startX = Math.floor((pCamX - W / 2) / spacing) * spacing;
        const endX = Math.ceil((pCamX + W / 2) / spacing) * spacing;
        const startY = Math.floor((pCamY - H / 2) / spacing) * spacing;
        const endY = Math.ceil((pCamY + H / 2) / spacing) * spacing;
        for (let x = startX; x <= endX; x += spacing) {
          gfx.moveTo(x - pCamX + W / 2, 0);
          gfx.lineTo(x - pCamX + W / 2, H);
        }
        for (let y = startY; y <= endY; y += spacing) {
          gfx.moveTo(0, y - pCamY + H / 2);
          gfx.lineTo(W, y - pCamY + H / 2);
        }
        gfx.stroke({ width: 1, color, alpha });
      }
      // musicBoost is the smoothed 0..1 bass energy. Enough multiplier to be
      // visible without becoming a strobe.
      function drawGrid(camX: number, camY: number, gridColor: number, musicBoost: number) {
        // Small multiplier — grids should breathe, not strobe. Any higher
        // than ~0.5 and the contrast reads as seizure-inducing.
        const m = 1 + musicBoost * 0.4;
        drawGridLayer(gridFarGfx,  camX, camY, 420, gridColor, 0.18 * m, 0.25);
        drawGridLayer(gridMidGfx,  camX, camY, 240, gridColor, 0.32 * m, 0.55);
        drawGridLayer(gridNearGfx, camX, camY, 120, gridColor, 0.5  * m, 1.0);
      }
      const arenaGfx = new PIXI.Graphics();
      groundLayer.addChild(arenaGfx);
      function drawArena(camX: number, camY: number, arenaColor: number) {
        arenaGfx.clear();
        const W = window.innerWidth, H = window.innerHeight;
        const cx = -camX + W / 2;
        const cy = -camY + H / 2;
        arenaGfx.circle(cx, cy, ARENA_RADIUS).stroke({ width: 2, color: arenaColor, alpha: 0.55 });
        arenaGfx.circle(cx, cy, ARENA_RADIUS - 4).stroke({ width: 1, color: arenaColor, alpha: 0.18 });
        arenaGfx.circle(cx, cy, ARENA_RADIUS + 4).stroke({ width: 1, color: arenaColor, alpha: 0.28 });
      }

      const state = {
        hp: PLAYER_MAX_HP,
        arrows: QUIVER_CAPACITY,
        reloadRemaining: 0,
        reloadQueued: 0,
        wave: 0,
        // Timed wave state
        wavePhase: 'active' as 'active' | 'pause',
        waveRemaining: 0,        // seconds left in the current phase
        spawnAccum: 0,           // seconds since last spawn
        damageDealt: 0, timeSurvived: 0,
        startMs: Date.now(),
        dead: false,
        dying: false,           // death animation phase before overlay shows
        deathRevealTimer: 0,    // seconds until we flip to dead + show overlay
        xp: 0, level: 1,
        kills: 0,
        awaitingStart: true,
        paused: true, levelUpPending: false,
        levelUpChoices: [] as Upgrade[],
        freezeRemaining: 0,
        stats: baseStats(),
        statLevels: {} as Record<string, number>,
        loadout: { bow: 'basic', quiver: 'basic', item: 'none' as ItemKind } as Loadout,
        // Passive shield — always up unless broken; regens over time
        shieldUp: false,
        shieldRegenRemaining: 0,
        simTime: 0,
        // Last sampled beat envelope — used as an edge detector to fire one
        // ember-trail patch per beat peak instead of on a plain timer.
        lastBeat: 0,
      };

      function maxHp() {
        return Math.min(PLAYER_MAX_HP_CAP, PLAYER_MAX_HP + (state.statLevels['hp'] ?? 0));
      }
      function maxQuiver() { return QUIVER_CAPACITY + state.stats.quiverBonus; }
      function playerSpeed() { return PLAYER_SPEED * state.stats.speedMult; }
      function drawRate() { return DRAW_RATE * state.stats.drawRateMult * BOW_STATS[state.loadout.bow].drawRateMult; }
      function reloadSeconds() { return ARROW_RELOAD_S / state.stats.reloadRateMult; }
      function arrowDamage() { return ARROW_DAMAGE * state.stats.damageMult; }
      function arrowSpeedFromRange(range: number) { return (range / FLIGHT_TIME) * state.stats.arrowSpeedMult; }

      const player = { x: 0, y: 0 };
      const cam = { x: 0, y: 0 };
      const keys: Record<string, boolean> = {};
      const mouse = { screenX: window.innerWidth / 2, screenY: window.innerHeight / 2 };
      let drawing = false;
      let drawCharge = 0;
      let shake = 0;
      let playerAmbientAccum = 0;
      let backgroundAccum = 0;

      // Palette transition state. fromIdx → toIdx over `t` (0 → 1), 3 seconds.
      const paletteState = { fromIdx: 0, toIdx: 0, t: 1 };
      const PALETTE_TRANSITION_SPEED = 1 / 3;  // 3-second crossfade
      function currentPalette(): Palette {
        const from = PALETTES[paletteState.fromIdx];
        const to = PALETTES[paletteState.toIdx];
        const t = paletteState.t;
        return {
          bg: lerpColor(from.bg, to.bg, t),
          grid: lerpColor(from.grid, to.grid, t),
          arena: lerpColor(from.arena, to.arena, t),
          particleWarm: lerpColor(from.particleWarm, to.particleWarm, t),
          particleCool: lerpColor(from.particleCool, to.particleCool, t),
        };
      }
      function paletteIndexForWave(w: number) {
        return ((w - 1) % PALETTES.length + PALETTES.length) % PALETTES.length;
      }

      const playerAura = new PIXI.Sprite(glowTex);
      playerAura.anchor.set(0.5); playerAura.blendMode = 'add';
      playerLayer.addChild(playerAura);
      const playerBody = new PIXI.Graphics();
      playerLayer.addChild(playerBody);
      const bowGfx = new PIXI.Graphics();
      playerLayer.addChild(bowGfx);
      const aimGfx = new PIXI.Graphics();
      playerLayer.addChild(aimGfx);
      // HP arc lives on fxLayer (top) so it's never covered by bow/arrows.
      const hpArcGfx = new PIXI.Graphics();
      fxLayer.addChild(hpArcGfx);
      // Screen-space ring around the mouse showing arrow count + reload.
      const cursorGfx = new PIXI.Graphics();
      fxLayer.addChild(cursorGfx);

      const arrows: Arrow[] = [];
      const enemies: Enemy[] = [];
      const particles: Particle[] = [];
      const rings: HitRing[] = [];
      const firePatches: FirePatch[] = [];
      const ringEffects: RingEffect[] = [];
      const enemyRings: EnemyRing[] = [];

      function spawnParticle(p: SpawnParticleArgs) {
        // Solid circle, normal blend mode, full alpha — no fade, no glow.
        const sprite = new PIXI.Sprite(circleTex);
        sprite.anchor.set(0.5);
        sprite.tint = p.color;
        sprite.width = sprite.height = p.startSize;
        sprite.alpha = p.startAlpha;
        particleLayer.addChild(sprite);
        particles.push({
          sprite, worldX: p.x, worldY: p.y, vx: p.vx, vy: p.vy,
          life: 0, maxLife: p.life,
          startSize: p.startSize, endSize: p.endSize,
          startAlpha: p.startAlpha, drag: p.drag,
          parallax: p.parallax ?? 1,
        });
      }
      function tickEmitter(accum: number, rate: number, dt: number, emit: () => void): number {
        accum += rate * dt;
        while (accum >= 1) { emit(); accum -= 1; }
        return accum;
      }

      // Background: slow-drifting motes scattered through the viewport. Pure
      // atmosphere — they aren't tied to anything. Kept cool-toned and dim so
      // they don't compete with gameplay particles.
      function emitBackground(dt: number, camX: number, camY: number, pal: Palette, musicEnergy: number) {
        // Base 10/s, gently lifts up to ~20/s on louder passages.
        const rate = 10 + musicEnergy * 10;
        backgroundAccum = tickEmitter(backgroundAccum, rate, dt, () => {
          const W = window.innerWidth, H = window.innerHeight;
          const margin = 240;
          const layer = Math.random();
          const parallax = layer < 0.4 ? 0.25 : layer < 0.75 ? 0.5 : 0.75;
          const sizeMul = parallax;
          const alpha = 0.12 + parallax * 0.2;
          const px = camX * parallax + (Math.random() - 0.5) * (W + margin * 2);
          const py = camY * parallax + (Math.random() - 0.5) * (H + margin * 2);
          const warm = Math.random() < 0.3;
          const color = warm ? pal.particleWarm : pal.particleCool;
          spawnParticle({
            x: px, y: py,
            vx: (Math.random() - 0.5) * 8 * parallax,
            vy: (Math.random() - 0.5) * 6 * parallax - 2 * parallax,
            life: 5 + Math.random() * 4,
            startSize: (14 + Math.random() * 14) * sizeMul * 1.5,
            endSize: 2,
            startAlpha: alpha, color, drag: 0.92,
            parallax,
          });
        });
      }

      function emitPlayerAmbient(dt: number) {
        playerAmbientAccum = tickEmitter(playerAmbientAccum, 8, dt, () => {
          const a = Math.random() * Math.PI * 2;
          // Spawn close to the player — was 14..24 units out, which read as a
          // confusing ring around the player rather than part of them.
          const r = 2 + Math.random() * 8;
          const px = player.x + Math.cos(a) * r;
          const py = player.y + Math.sin(a) * r;
          const outSpeed = 6 + Math.random() * 10;
          spawnParticle({
            x: px, y: py,
            vx: Math.cos(a) * outSpeed + (Math.random() - 0.5) * 4,
            vy: Math.sin(a) * outSpeed + (Math.random() - 0.5) * 4,
            life: 1.6 + Math.random() * 0.7,
            startSize: 30 + Math.random() * 10, endSize: 6,
            startAlpha: 0.28, color: 0x66aaff, drag: 0.65,
          });
        });
      }

      function emberColorFor(e: Enemy): number {
        if (e.kind === 'charger') return CHARGER_EMBER;
        if (e.kind === 'stalker') return STALKER_EMBER;
        if (e.kind === 'spawnling') return SPAWNLING_EMBER;
        if (e.kind === 'broodmother') return BROODMOTHER_EMBER;
        if (e.kind === 'pulser') return PULSER_EMBER;
        if (e.kind === 'sapper' || e.kind === 'mine') return YELLOW_EMBER;
        return GRUNT_EMBER;
      }

      function emitEnemyEmbers(e: Enemy, dt: number) {
        if (e.kind === 'charger' && e.chargeState === 'launching') {
          e.emberAccum = tickEmitter(e.emberAccum, 70, dt, () => {
            spawnParticle({
              x: e.x + (Math.random() - 0.5) * e.radius * 0.8,
              y: e.y + (Math.random() - 0.5) * e.radius * 0.8,
              vx: -e.chargeVx * 0.18 + (Math.random() - 0.5) * 50,
              vy: -e.chargeVy * 0.18 + (Math.random() - 0.5) * 50,
              life: 0.35 + Math.random() * 0.2,
              startSize: 14 + Math.random() * 6, endSize: 2,
              startAlpha: 0.95, color: CHARGER_EMBER, drag: 0.25,
              fadeInT: 0.04, fadeOutStartT: 0.85,
            });
          });
          return;
        }
        // Spawnling trails a small rose streak so it reads as a projectile.
        if (e.kind === 'spawnling') {
          e.emberAccum = tickEmitter(e.emberAccum, 34, dt, () => {
            spawnParticle({
              x: e.x + (Math.random() - 0.5) * 4,
              y: e.y + (Math.random() - 0.5) * 4,
              vx: -e.travelDx * 40 + (Math.random() - 0.5) * 14,
              vy: -e.travelDy * 40 + (Math.random() - 0.5) * 14,
              life: 0.4 + Math.random() * 0.2,
              startSize: 14 + Math.random() * 6, endSize: 3,
              startAlpha: 0.75, color: SPAWNLING_EMBER, drag: 0.35,
              fadeInT: 0.04, fadeOutStartT: 0.8,
            });
          });
          return;
        }
        // Stalker leaves a fast purple streak behind it at all times.
        if (e.kind === 'stalker') {
          e.emberAccum = tickEmitter(e.emberAccum, 44, dt, () => {
            const bx = -e.dirX * (e.radius * 0.55) + (Math.random() - 0.5) * 6;
            const by = -e.dirY * (e.radius * 0.55) + (Math.random() - 0.5) * 6;
            spawnParticle({
              x: e.x + bx, y: e.y + by,
              vx: -e.dirX * 60 + (Math.random() - 0.5) * 22,
              vy: -e.dirY * 60 + (Math.random() - 0.5) * 22,
              life: 0.6 + Math.random() * 0.3,
              startSize: 28 + Math.random() * 10, endSize: 4,
              startAlpha: 0.75, color: STALKER_EMBER, drag: 0.35,
              fadeInT: 0.04, fadeOutStartT: 0.85,
            });
          });
          return;
        }
        const ember = emberColorFor(e);
        const telegraphMult = (e.kind === 'charger' && e.chargeState === 'telegraph')
          ? 1.5 + (e.chargeT / CHARGER_TELEGRAPH_S) * 2.5 : 1;
        e.emberAccum = tickEmitter(e.emberAccum, 7 * telegraphMult, dt, () => {
          const a = Math.random() * Math.PI * 2;
          const r = e.radius * (0.4 + Math.random() * 0.4);
          spawnParticle({
            x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r,
            vx: (Math.random() - 0.5) * 18,
            vy: -18 - Math.random() * 24,
            life: 1.6 + Math.random() * 0.6,
            startSize: 42 + Math.random() * 12, endSize: 8,
            startAlpha: 0.3, color: ember, drag: 0.75,
          });
        });
      }

      function emitArrowTrail(a: Arrow, dt: number) {
        a.trailAccum = tickEmitter(a.trailAccum, 80, dt, () => {
          spawnParticle({
            x: a.x + (Math.random() - 0.5) * 4,
            y: a.y + (Math.random() - 0.5) * 4,
            vx: -a.vx * 0.08 + (Math.random() - 0.5) * 40,
            vy: -a.vy * 0.08 + (Math.random() - 0.5) * 40,
            life: 0.28 + Math.random() * 0.18,
            startSize: 12 + Math.random() * 6, endSize: 2,
            startAlpha: 0.6, color: a.trailColor, drag: 0.25,
          });
          if (Math.random() < 0.55) {
            spawnParticle({
              x: a.x, y: a.y,
              vx: (Math.random() - 0.5) * 70,
              vy: (Math.random() - 0.5) * 70,
              life: 0.14 + Math.random() * 0.08,
              startSize: 5 + Math.random() * 3, endSize: 0,
              startAlpha: 0.95, color: a.coreSparkColor, drag: 0.15,
            });
          }
        });
      }

      function emitArrowImpact(x: number, y: number) {
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 90 + Math.random() * 160;
          spawnParticle({
            x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 0.25 + Math.random() * 0.25,
            startSize: 7 + Math.random() * 4, endSize: 0,
            startAlpha: 0.9, color: 0xffcc77, drag: 0.12,
          });
        }
        for (let i = 0; i < 5; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 200 + Math.random() * 200;
          spawnParticle({
            x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 0.15 + Math.random() * 0.15,
            startSize: 4, endSize: 0,
            startAlpha: 1, color: 0xffffee, drag: 0.08,
          });
        }
      }

      function emitEnemyDeathBurst(e: Enemy) {
        const ember = emberColorFor(e);
        const aura = e.kind === 'charger' ? CHARGER_AURA_TINT
                   : e.kind === 'stalker' ? STALKER_AURA_TINT
                   : e.kind === 'spawnling' ? SPAWNLING_AURA_TINT
                   : e.kind === 'broodmother' ? BROODMOTHER_AURA_TINT
                   : e.kind === 'pulser' ? PULSER_AURA_TINT
                   : e.kind === 'sapper' || e.kind === 'mine' ? YELLOW_AURA_TINT
                   : GRUNT_AURA_TINT;
        for (let i = 0; i < 18; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 70 + Math.random() * 180;
          spawnParticle({
            x: e.x, y: e.y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
            life: 0.5 + Math.random() * 0.5,
            startSize: 12 + Math.random() * 6, endSize: 1,
            startAlpha: 0.8, color: ember, drag: 0.12,
          });
        }
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 220 + Math.random() * 220;
          spawnParticle({
            x: e.x, y: e.y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 0.2 + Math.random() * 0.25,
            startSize: 5 + Math.random() * 3, endSize: 0,
            startAlpha: 1, color: 0xffeecc, drag: 0.1,
          });
        }
        spawnParticle({
          x: e.x, y: e.y, vx: 0, vy: -10,
          life: 0.6, startSize: 70, endSize: 12,
          startAlpha: 0.5, color: aura, drag: 0.6,
        });
      }

      function emitPlayerDeathBurst(x: number, y: number) {
        // Big blue burst to match the player's blue aura
        spawnParticle({
          x, y, vx: 0, vy: 0,
          life: 0.7, startSize: 80, endSize: 280,
          startAlpha: 0.65, color: 0x66aaff, drag: 1,
        });
        for (let i = 0; i < 38; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 90 + Math.random() * 260;
          spawnParticle({
            x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 0.6 + Math.random() * 0.6,
            startSize: 18 + Math.random() * 10, endSize: 2,
            startAlpha: 0.9, color: 0x88bbff, drag: 0.12,
          });
        }
        for (let i = 0; i < 16; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 260 + Math.random() * 280;
          spawnParticle({
            x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 0.3 + Math.random() * 0.25,
            startSize: 6, endSize: 0,
            startAlpha: 1, color: 0xffffff, drag: 0.1,
          });
        }
      }

      function emitChargerLaunchFlash(e: Enemy) {
        spawnParticle({
          x: e.x, y: e.y, vx: 0, vy: 0,
          life: 0.35, startSize: 40, endSize: 180,
          startAlpha: 0.7, color: CHARGER_AURA_TINT, drag: 1,
        });
        for (let i = 0; i < 16; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 180 + Math.random() * 220;
          spawnParticle({
            x: e.x, y: e.y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 0.3, startSize: 8, endSize: 0,
            startAlpha: 0.95, color: CHARGER_EMBER, drag: 0.12,
          });
        }
      }

      function emitExplosion(x: number, y: number, radius: number) {
        const scale = radius / EXPLOSION_RADIUS;
        spawnParticle({
          x, y, vx: 0, vy: 0,
          life: 0.4, startSize: 50 * scale, endSize: 260 * scale,
          startAlpha: 0.85, color: 0xffaa33, drag: 1,
        });
        const bigCount = Math.round(28 * scale);
        for (let i = 0; i < bigCount; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = (140 + Math.random() * 320) * Math.sqrt(scale);
          spawnParticle({
            x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 0.55 + Math.random() * 0.4,
            startSize: (22 + Math.random() * 12) * scale, endSize: 3,
            startAlpha: 0.95, color: 0xff8833, drag: 0.15,
          });
        }
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = (320 + Math.random() * 220) * Math.sqrt(scale);
          spawnParticle({
            x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 0.25 + Math.random() * 0.15,
            startSize: 6 * scale, endSize: 0,
            startAlpha: 1, color: 0xffffcc, drag: 0.1,
          });
        }
      }

      function updateParticles(dt: number, camX: number, camY: number, W: number, H: number) {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life += dt;
          const t = p.life / p.maxLife;
          if (t >= 1) { p.sprite.destroy(); particles.splice(i, 1); continue; }
          p.worldX += p.vx * dt;
          p.worldY += p.vy * dt;
          const dragF = Math.pow(p.drag, dt);
          p.vx *= dragF; p.vy *= dragF;
          // No alpha fade. Size shrinks linearly over the whole life so the
          // particle visibly resolves to nothing by the time it's culled.
          const size = lerp(p.startSize, p.endSize, t);
          p.sprite.width = p.sprite.height = size;
          p.sprite.alpha = p.startAlpha;
          p.sprite.x = p.worldX - camX * p.parallax + W / 2;
          p.sprite.y = p.worldY - camY * p.parallax + H / 2;
        }
      }
      function repositionParticles(camX: number, camY: number, W: number, H: number) {
        for (const p of particles) {
          p.sprite.x = p.worldX - camX * p.parallax + W / 2;
          p.sprite.y = p.worldY - camY * p.parallax + H / 2;
        }
      }

      // ── Enemy spawning ────────────────────────────────────────────────────
      function makeEnemy(kind: EnemyKind): Enemy {
        const tint = kind === 'charger' ? CHARGER_AURA_TINT
                   : kind === 'stalker' ? STALKER_AURA_TINT
                   : kind === 'spawnling' ? SPAWNLING_AURA_TINT
                   : kind === 'pulser' ? PULSER_AURA_TINT
                   : kind === 'sapper' || kind === 'mine' ? YELLOW_AURA_TINT
                   : GRUNT_AURA_TINT;
        const radius = kind === 'charger' ? CHARGER_RADIUS
                     : kind === 'stalker' ? STALKER_RADIUS
                     : kind === 'broodmother' ? BROODMOTHER_RADIUS
                     : kind === 'spawnling' ? SPAWNLING_RADIUS
                     : kind === 'sapper' ? SAPPER_RADIUS
                     : kind === 'pulser' ? PULSER_RADIUS
                     : kind === 'mine' ? MINE_RADIUS
                     : GRUNT_RADIUS;
        const baseHp = kind === 'charger' ? CHARGER_HP
                     : kind === 'stalker' ? STALKER_HP
                     : kind === 'broodmother' ? BROODMOTHER_HP
                     : kind === 'spawnling' ? SPAWNLING_HP
                     : kind === 'sapper' ? SAPPER_HP
                     : kind === 'pulser' ? PULSER_HP
                     : kind === 'mine' ? 1
                     : GRUNT_HP;
        // Mines always die in one hit regardless of difficulty scaling —
        // piercing/ricochet depend on them being cleanly consumed.
        const hp = kind === 'mine' ? 1 : baseHp;
        const xpReward = 0; // XP is now damage-based; this field is unused
        void xpReward;
        const aura = new PIXI.Sprite(glowTex);
        aura.anchor.set(0.5); aura.blendMode = 'add'; aura.tint = tint; aura.alpha = 0.32;
        enemyLayer.addChild(aura);
        const body = new PIXI.Graphics();
        enemyLayer.addChild(body);
        // Initial spawnCooldown per kind — first action happens after this
        let initCooldown = 0;
        if (kind === 'broodmother') initCooldown = BROODMOTHER_SPAWN_INTERVAL * 0.55;
        else if (kind === 'sapper')  initCooldown = SAPPER_MINE_INTERVAL * 0.5;
        else if (kind === 'pulser')  initCooldown = PULSER_PULSE_INTERVAL * 0.5;
        // Sapper initial wander: random direction; wander change timer
        let initDirX = 1, initDirY = 0;
        let initTravelX = 0, initTravelY = 0;
        if (kind === 'sapper') {
          const a = Math.random() * Math.PI * 2;
          initDirX = Math.cos(a); initDirY = Math.sin(a);
          initTravelX = initDirX; initTravelY = initDirY;
        }
        return {
          kind, aura, body, x: 0, y: 0,
          hp, maxHp: hp, radius, alive: true,
          pop: 0, spawnT: 0, emberAccum: 0,
          phase: Math.random() * Math.PI * 2,
          travelDx: initTravelX, travelDy: initTravelY,
          dirX: initDirX, dirY: initDirY,
          chargeState: 'pursue', chargeT: 0,
          chargeDirX: 0, chargeDirY: 0,
          chargeVx: 0, chargeVy: 0,
          spawnCooldown: initCooldown,
          wanderT: kind === 'sapper' ? SAPPER_WANDER_CHANGE * (0.5 + Math.random()) : 0,
          xpReward: 0,
        };
      }
      // Grunt/weaver/broodmother: spawn outside the arena with a travel
      // direction that cuts through it to the other side. They never follow.
      function spawnStraightEnemy(kind: 'grunt' | 'weaver' | 'broodmother') {
        const th = Math.random() * Math.PI * 2;
        const spawnR = ARENA_RADIUS + 40 + Math.random() * 80;
        const ex = Math.cos(th) * spawnR;
        const ey = Math.sin(th) * spawnR;
        // Pick an exit angle on the opposite side, jittered by ±60°
        const exitTh = th + Math.PI + (Math.random() - 0.5) * (Math.PI * 0.66);
        const exitR = ARENA_RADIUS + 40 + Math.random() * 80;
        const exX = Math.cos(exitTh) * exitR;
        const exY = Math.sin(exitTh) * exitR;
        const ddx = exX - ex, ddy = exY - ey;
        const d = Math.hypot(ddx, ddy) || 1;
        const e = makeEnemy(kind);
        e.x = ex; e.y = ey;
        e.travelDx = ddx / d; e.travelDy = ddy / d;
        enemies.push(e);
      }
      // Chargers and stalkers: spawn outside the arena but AT DISTANCE with
      // guaranteed minimum separation from the player (like before).
      function spawnPursuingEnemy(kind: 'charger' | 'stalker' | 'sapper' | 'pulser') {
        let ex = 0, ey = 0;
        // Same distance as the straight-line spawn — just outside the arena
        // ring, not drifting off into the void.
        for (let attempt = 0; attempt < 20; attempt++) {
          const th = Math.random() * Math.PI * 2;
          const d = ARENA_RADIUS + 40 + Math.random() * 80;
          ex = Math.cos(th) * d;
          ey = Math.sin(th) * d;
          if (Math.hypot(ex - player.x, ey - player.y) > 500) break;
        }
        const e = makeEnemy(kind);
        e.x = ex; e.y = ey;
        if (kind === 'sapper') {
          // Sapper enters the arena — both current facing AND target direction
          // point toward the center (with tiny jitter on the facing).
          const toCenterX = -ex, toCenterY = -ey;
          const len = Math.hypot(toCenterX, toCenterY) || 1;
          const cx = toCenterX / len, cy = toCenterY / len;
          const baseAng = Math.atan2(cy, cx);
          const ang = baseAng + (Math.random() - 0.5) * 0.4;
          e.dirX = Math.cos(ang); e.dirY = Math.sin(ang);
          e.travelDx = cx; e.travelDy = cy; // target heading
        } else {
          // Charger / stalker / pulser: face the player at spawn
          const dxp = player.x - ex, dyp = player.y - ey;
          const mag = Math.hypot(dxp, dyp) || 1;
          e.dirX = dxp / mag; e.dirY = dyp / mag;
        }
        enemies.push(e);
      }
      function spawnEnemyOfKind(kind: EnemyKind) {
        if (kind === 'grunt' || kind === 'weaver' || kind === 'broodmother') {
          spawnStraightEnemy(kind);
        } else if (kind === 'charger' || kind === 'stalker' || kind === 'sapper' || kind === 'pulser') {
          spawnPursuingEnemy(kind);
        }
        // 'spawnling' is only created by broodmothers, never from the wave pool
      }

      // Launch a spawnling from a broodmother toward the player's current
      // position. Projectile-style straight-line motion.
      function spawnSpawnling(from: Enemy) {
        const dxp = player.x - from.x;
        const dyp = player.y - from.y;
        const d = Math.hypot(dxp, dyp) || 1;
        const e = makeEnemy('spawnling');
        e.x = from.x;
        e.y = from.y;
        e.travelDx = dxp / d;
        e.travelDy = dyp / d;
        enemies.push(e);
      }

      // Weighted pool of enemy kinds for a given wave number.
      function wavePool(w: number): Array<{ kind: EnemyKind; weight: number }> {
        const pool: Array<{ kind: EnemyKind; weight: number }> = [
          { kind: 'grunt', weight: 8 },
        ];
        if (w >= 3)  pool.push({ kind: 'weaver',      weight: 5 });
        if (w >= 4)  pool.push({ kind: 'sapper',      weight: 3 });
        if (w >= 5)  pool.push({ kind: 'charger',     weight: 3 });
        if (w >= 6)  pool.push({ kind: 'broodmother', weight: 2 });
        if (w >= 7)  pool.push({ kind: 'stalker',     weight: 3 });
        if (w >= 8)  pool.push({ kind: 'pulser',      weight: 3 });
        return pool;
      }
      function spawnRateFor(w: number) {
        // enemies per second — longer ramp + higher peak. Old cap was
        // 3.62/s at wave 40; new cap is ~5.5/s at wave 60, so mid-to-late
        // waves stay dangerous for the buffed bows.
        return 0.5 + 0.085 * Math.min(60, w - 1);
      }
      function pickWaveKind(w: number): EnemyKind {
        const pool = wavePool(w);
        const total = pool.reduce((s, p) => s + p.weight, 0);
        let r = Math.random() * total;
        for (const p of pool) { r -= p.weight; if (r <= 0) return p.kind; }
        return pool[0].kind;
      }
      function startWave(n: number) {
        state.wave = n;
        state.wavePhase = 'active';
        state.waveRemaining = WAVE_DURATION;
        state.spawnAccum = 0;
        // Kick off palette transition from current blend to the new wave's palette.
        paletteState.fromIdx = paletteState.toIdx;
        paletteState.toIdx = paletteIndexForWave(n);
        if (paletteState.fromIdx !== paletteState.toIdx) paletteState.t = 0;
      }

      // ── Arrow spawning & firing ───────────────────────────────────────────
      function arrowColorsForQuiver(q: QuiverKind) {
        if (q === 'piercing'  || q === 'piercing2'  || q === 'piercing3')  return { shaft: 0xaaddff, trail: 0x66ccff, core: 0xddf4ff };
        if (q === 'explosive' || q === 'explosive2' || q === 'explosive3') return { shaft: 0xffaa66, trail: 0xff7733, core: 0xffeeaa };
        if (q === 'blazing'   || q === 'blazing2'   || q === 'blazing3')   return { shaft: 0xffcc66, trail: 0xff7722, core: 0xffee88 };
        return { shaft: 0xffeecc, trail: 0xffd288, core: 0xfff4cc };
      }
      function spawnArrow(fromX: number, fromY: number, dirNx: number, dirNy: number, charge: number, volley: ArrowVolley) {
        const bow = state.loadout.bow;
        const bowMod = BOW_STATS[bow];
        const quiver = state.loadout.quiver;
        const range = lerp(MIN_RANGE, MAX_RANGE, charge) * bowMod.rangeMult;
        const speed = arrowSpeedFromRange(range);
        const gfx = new PIXI.Graphics();
        arrowLayer.addChild(gfx);
        const col = arrowColorsForQuiver(quiver);
        const bounces = bow === 'ricochet1' ? 1 : bow === 'ricochet2' ? 2 : bow === 'ricochet3' ? 3 : 0;
        const pierce = quiver === 'piercing' || quiver === 'piercing2' || quiver === 'piercing3';
        const pierceLimit = quiver === 'piercing'  ? 2
                          : quiver === 'piercing2' ? 3
                          : quiver === 'piercing3' ? 4
                          : 0;
        const explodeOnHit = quiver === 'explosive' || quiver === 'explosive2' || quiver === 'explosive3';
        // Tier multipliers 1.0 / 1.4 / 1.8 — gentler than the old 1.65 / 2.3
        // so tier-II and tier-III don't feel screen-filling.
        const explosionRadius = quiver === 'explosive'  ? EXPLOSION_RADIUS
                              : quiver === 'explosive2' ? EXPLOSION_RADIUS * 1.4
                              : quiver === 'explosive3' ? EXPLOSION_RADIUS * 1.8
                              : 0;
        const blazing = quiver === 'blazing' || quiver === 'blazing2' || quiver === 'blazing3';
        const blazingPatchDuration = quiver === 'blazing'  ? BLAZING_PATCH_DURATION_1
                                    : quiver === 'blazing2' ? BLAZING_PATCH_DURATION_2
                                    : quiver === 'blazing3' ? BLAZING_PATCH_DURATION_3
                                    : 0;
        const mainDamage = arrowDamage() * bowMod.perArrowDamageMult;
        const shatterShards = SHATTER_SHARD_COUNT[bow] ?? 0;
        const shatterShardDamage = shatterShards > 0
          ? arrowDamage() * (SHATTER_SHARD_DAMAGE_MULT[bow] ?? 0)
          : 0;
        arrows.push({
          gfx, x: fromX, y: fromY,
          vx: dirNx * speed, vy: dirNy * speed,
          life: 0, maxLife: FLIGHT_TIME,
          damage: mainDamage,
          alive: true, trailAccum: 0,
          pierce, pierceLimit,
          explodeOnHit, explosionRadius,
          hitEnemies: new Set<Enemy>(),
          shaftColor: col.shaft, trailColor: col.trail, coreSparkColor: col.core,
          bounces,
          blazing, blazingPatchDuration, blazingAccum: 0,
          childArrowsSpawned: 0,
          shatterShards, shatterShardDamage,
          volley,
        });
      }

      // Spawn N shards radially from an impact. Shards are regular arrows
      // that inherit the parent's quiver effects but carry `shatterShards: 0`
      // so they can't re-shatter. Each one can still explode / pierce /
      // blaze, and joins the parent's volley so the chain-pitch keeps going.
      // Shards inherit the parent's hitEnemies so a shard flying back into
      // the just-hit (surviving) enemy doesn't instantly re-damage it.
      function spawnShatterShards(parent: Arrow, impactX: number, impactY: number) {
        const n = parent.shatterShards;
        if (n <= 0) return;
        const speed = Math.hypot(parent.vx, parent.vy) || 360;
        // Small random rotation so back-to-back bursts don't look stamped.
        const phase = Math.random() * Math.PI * 2;
        for (let i = 0; i < n; i++) {
          const ang = phase + (i / n) * Math.PI * 2;
          const nx = Math.cos(ang), ny = Math.sin(ang);
          const gfx = new PIXI.Graphics();
          arrowLayer.addChild(gfx);
          arrows.push({
            gfx,
            x: impactX, y: impactY,
            vx: nx * speed, vy: ny * speed,
            life: 0, maxLife: FLIGHT_TIME,
            damage: parent.shatterShardDamage,
            alive: true, trailAccum: 0,
            pierce: parent.pierce, pierceLimit: parent.pierceLimit,
            explodeOnHit: parent.explodeOnHit,
            explosionRadius: parent.explosionRadius,
            hitEnemies: new Set(parent.hitEnemies),
            shaftColor: parent.shaftColor,
            trailColor: parent.trailColor,
            coreSparkColor: parent.coreSparkColor,
            bounces: 0,
            blazing: parent.blazing,
            blazingPatchDuration: parent.blazingPatchDuration,
            blazingAccum: 0,
            childArrowsSpawned: 0,
            shatterShards: 0, shatterShardDamage: 0,
            volley: parent.volley,
          });
        }
      }
      // Pitch rises ~10% for each arrow consumed from a full quiver — the
      // player can hear how many arrows are left without looking at the HUD.
      function arrowPitch(): number {
        const max = maxQuiver();
        return 1 + Math.max(0, max - state.arrows) * 0.1;
      }
      function impactSoundId(q: QuiverKind): string {
        if (q === 'piercing'  || q === 'piercing2'  || q === 'piercing3')  return 'impact_piercing';
        if (q === 'explosive' || q === 'explosive2' || q === 'explosive3') return 'impact_explosive';
        if (q === 'blazing'   || q === 'blazing2'   || q === 'blazing3')   return 'impact_blazing';
        return 'impact_basic';
      }
      // Each bow family has one sound file. Each tier steps the pitch down
      // by 0.1× so a tier-III bow reads distinctly heavier than tier-I even
      // when they share the sample. Shatter reuses the split sample at a
      // deeper pitch so the burst reads as "heavier volley".
      function shootSoundFor(bow: BowKind): { id: string; tierPitch: number } {
        switch (bow) {
          case 'basic':     return { id: 'shoot_basic',    tierPitch: 1.0  };
          case 'split2':    return { id: 'shoot_split',    tierPitch: 1.0  };
          case 'split3':    return { id: 'shoot_split',    tierPitch: 0.9  };
          case 'split5':    return { id: 'shoot_split',    tierPitch: 0.8  };
          case 'ricochet1': return { id: 'shoot_ricochet', tierPitch: 1.0  };
          case 'ricochet2': return { id: 'shoot_ricochet', tierPitch: 0.9  };
          case 'ricochet3': return { id: 'shoot_ricochet', tierPitch: 0.8  };
          case 'shatter1':  return { id: 'shoot_split',    tierPitch: 0.85 };
          case 'shatter2':  return { id: 'shoot_split',    tierPitch: 0.78 };
          case 'shatter3':  return { id: 'shoot_split',    tierPitch: 0.72 };
        }
      }

      function fireShot(aimNx: number, aimNy: number, charge: number) {
        const bow = state.loadout.bow;
        const count = bow === 'split5' ? 5 : bow === 'split3' ? 3 : bow === 'split2' ? 2 : 1;
        const spreadDeg = bow === 'split5' ? SPLIT5_SPREAD_DEG
                        : bow === 'split3' ? SPLIT3_SPREAD_DEG
                        : bow === 'split2' ? SPLIT2_SPREAD_DEG
                        : 0;
        const base = Math.atan2(aimNy, aimNx);
        // One volley per draw — every split sibling and every ricochet child
        // they spawn shares this counter, so impact pitch climbs across the
        // whole group of arrows.
        const volley: ArrowVolley = { hitCount: 0 };
        for (let i = 0; i < count; i++) {
          const t = count === 1 ? 0.5 : i / (count - 1);
          const ang = base + (t - 0.5) * spreadDeg * Math.PI / 180;
          spawnArrow(player.x, player.y, Math.cos(ang), Math.sin(ang), charge, volley);
        }
        shake += 4 + charge * 4;
        const ss = shootSoundFor(bow);
        // Light shots pitch up (1.10x), fully-drawn shots pitch down (0.85x).
        // Reads as "loaded heavier the longer you hold".
        const drawPitch = 1.10 - charge * 0.25;
        playSfx(ss.id, { pitch: ss.tierPitch * arrowPitch() * drawPitch, volume: 1.1 });
      }

      function spawnHitRing(x: number, y: number, color: number) {
        const gfx = new PIXI.Graphics();
        fxLayer.addChild(gfx);
        rings.push({ gfx, x, y, t: 0, maxT: 0.35, color });
      }

      // Fire-trail item: a small fire patch dropped under the player on
      // every beat while moving. Item Power extends how long each patch
      // lasts (instead of dropping more), so late-game the trail visibly
      // lingers behind the player.
      function spawnEmberTrailPatch(x: number, y: number) {
        const gfx = new PIXI.Graphics();
        firePatchLayer.addChild(gfx);
        const duration = EMBER_TRAIL_PATCH_DURATION_BASE
          + itemPowerLevel() * EMBER_TRAIL_PATCH_DURATION_PER_POWER;
        firePatches.push({
          gfx, x, y,
          radius: EMBER_TRAIL_PATCH_RADIUS,
          duration, life: 0,
          dps: EMBER_TRAIL_PATCH_DPS,
          emberAccum: 0,
          pulsePhase: Math.random() * Math.PI * 2,
          tickDamageAccum: 0,
          damageBudget: EMBER_TRAIL_PATCH_DAMAGE_CAP,
        });
      }

      function spawnBlazingPatch(x: number, y: number, duration: number) {
        const gfx = new PIXI.Graphics();
        firePatchLayer.addChild(gfx);
        firePatches.push({
          gfx, x, y,
          radius: BLAZING_PATCH_RADIUS,
          duration, life: 0,
          dps: BLAZING_PATCH_DPS,
          emberAccum: 0,
          pulsePhase: Math.random() * Math.PI * 2,
          tickDamageAccum: 0,
          damageBudget: BLAZING_PATCH_DAMAGE_CAP,
        });
      }

      // Nearest bounce target within range. Mines are enemies now, so they
      // naturally appear in this search.
      const BOUNCE_RANGE = 340;
      function findBounceTarget(
        fromX: number, fromY: number,
        hitEnemies: Set<Enemy>,
        excludeEnemy: Enemy | null,
      ): { dx: number; dy: number; d: number } | null {
        let bestD2 = BOUNCE_RANGE * BOUNCE_RANGE;
        let bx = 0, by = 0, found = false;
        for (const o of enemies) {
          if (!o.alive || o === excludeEnemy || hitEnemies.has(o)) continue;
          const dx = o.x - fromX, dy = o.y - fromY;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) { bestD2 = d2; bx = o.x; by = o.y; found = true; }
        }
        if (!found) return null;
        const dx = bx - fromX, dy = by - fromY;
        return { dx, dy, d: Math.sqrt(bestD2) || 1 };
      }

      // Spawn a child arrow at the pierce hit point that bounces to a nearby
      // un-hit enemy. Inherits hitEnemies so it won't double-hit anything the
      // parent already hit; has its own bounce count from the parent's bow.
      function spawnRicochetChild(parent: Arrow, from: Enemy | null) {
        const target = findBounceTarget(parent.x, parent.y, parent.hitEnemies, from);
        if (!target) return;
        const speed = Math.hypot(parent.vx, parent.vy);
        const gfx = new PIXI.Graphics();
        arrowLayer.addChild(gfx);
        // Inherit the parent's hitEnemies so it doesn't double-hit what the
        // pierce already hit, but is otherwise a fresh ricochet arrow.
        arrows.push({
          gfx,
          x: parent.x, y: parent.y,
          vx: (target.dx / target.d) * speed, vy: (target.dy / target.d) * speed,
          life: 0, maxLife: 0.9,
          damage: parent.damage,
          alive: true, trailAccum: 0,
          pierce: false, pierceLimit: 0,
          explodeOnHit: parent.explodeOnHit,
          explosionRadius: parent.explosionRadius,
          hitEnemies: new Set(parent.hitEnemies),
          shaftColor: parent.shaftColor,
          trailColor: parent.trailColor,
          coreSparkColor: parent.coreSparkColor,
          bounces: parent.bounces,
          blazing: false, blazingPatchDuration: 0, blazingAccum: 0,
          childArrowsSpawned: 0,
          shatterShards: 0, shatterShardDamage: 0,
          volley: parent.volley,
        });
      }

      // ── Hazard helpers (enemy rings, player damage) ───────────────────────
      // Mines are regular enemies (EnemyKind='mine'). Sapper calls this to
      // drop one; everything else — bounce targeting, pierce, explosion, fire
      // patches, death bursts — flows through the shared enemy pipeline.
      function spawnMine(x: number, y: number) {
        const e = makeEnemy('mine');
        e.x = x; e.y = y;
        enemies.push(e);
      }
      function spawnEnemyRing(x: number, y: number) {
        const gfx = new PIXI.Graphics();
        fxLayer.addChild(gfx);
        enemyRings.push({
          gfx, x, y,
          radius: 0, maxRadius: PULSER_RING_MAX_RADIUS,
          expandSpeed: PULSER_RING_SPEED,
          damage: PULSER_RING_DAMAGE,
          didHit: false,
        });
      }

      // Centralised player-damage handler. Used by touch damage, mines, and
      // pulser rings. Handles shield absorb, shockwave emit, and death.
      function damagePlayerFromHazard(amount: number, hazardX: number, hazardY: number) {
        if (state.dying || state.dead) return;
        if (state.loadout.item === 'shield' && state.shieldUp) {
          spawnHitRing(hazardX, hazardY, 0x66ccff);
          state.shieldUp = false;
          state.shieldRegenRemaining = shieldRegenTime();
          shake += 2;
          playSfx('item_shield_absorb');
          return;
        }
        state.hp -= amount;
        spawnHitRing(hazardX, hazardY, 0xff4466);
        shake += 3 + amount * 0.15;
        playSfx('player_damage');
        emitShockwaveOnDamage();
        if (state.hp <= 0 && !state.dying) {
          state.hp = 0;
          state.dying = true;
          state.deathRevealTimer = 1.3;
          drawing = false; drawCharge = 0;
          shake = 0;
          emitPlayerDeathBurst(player.x, player.y);
        }
      }

      // ── Passive items ──────────────────────────────────────────────────────
      function itemPowerLevel(): number { return state.statLevels['item-power'] ?? 0; }
      function shieldRegenTime(): number {
        return Math.max(8, SHIELD_REGEN_BASE + itemPowerLevel() * SHIELD_REGEN_PER_POWER);
      }
      function shockwaveMaxRadius(): number {
        return SHOCKWAVE_MAX_RADIUS_BASE + itemPowerLevel() * SHOCKWAVE_MAX_RADIUS_PER_POWER;
      }
      function shockwaveDamage(): number {
        return SHOCKWAVE_DAMAGE_BASE + itemPowerLevel() * SHOCKWAVE_DAMAGE_PER_POWER;
      }
      // Shockwave fires automatically when the player takes damage.
      function emitShockwaveOnDamage() {
        if (state.loadout.item !== 'ring') return;
        const gfx = new PIXI.Graphics();
        fxLayer.addChild(gfx);
        ringEffects.push({
          gfx,
          x: player.x, y: player.y,
          radius: 0,
          maxRadius: shockwaveMaxRadius(),
          expandSpeed: SHOCKWAVE_EXPAND_SPEED,
          damage: shockwaveDamage(),
          hitEnemies: new Set<Enemy>(),
          life: 0,
        });
        playSfx('item_shockwave');
      }

      function killEnemy(e: Enemy) {
        if (!e.alive) return;
        e.alive = false;
        // Mines are enemies, but popping a hazard isn't a "kill" — the counter
        // tracks creatures defeated. Sappers drop many mines; counting each
        // would inflate the tally.
        // Mines aren't a "kill" for the counter but they still get the
        // shared enemy-death cue when the player destroys them.
        if (e.kind !== 'mine') state.kills++;
        playSfx('enemy_death');
        emitEnemyDeathBurst(e);
        const ringColor = e.kind === 'charger' ? CHARGER_AURA_TINT
                        : e.kind === 'stalker' ? STALKER_AURA_TINT
                        : e.kind === 'spawnling' ? SPAWNLING_AURA_TINT
                        : e.kind === 'broodmother' ? BROODMOTHER_AURA_TINT
                        : e.kind === 'pulser' ? PULSER_AURA_TINT
                        : e.kind === 'sapper' || e.kind === 'mine' ? YELLOW_AURA_TINT
                        : GRUNT_AURA_TINT;
        spawnHitRing(e.x, e.y, ringColor);
        // Shake scales with how tough the enemy was — a grunt barely rattles
        // the camera, a broodmother thumps.
        shake += 2 + e.maxHp * 1.5;
        // XP is now granted per damage dealt (not on kill).
      }

      function applyExplosion(x: number, y: number, baseDmg: number, radius: number) {
        emitExplosion(x, y, radius);
        spawnHitRing(x, y, 0xffaa33);
        shake += 7;
        for (const e of enemies) {
          if (!e.alive) continue;
          const dx = e.x - x, dy = e.y - y;
          const d = Math.hypot(dx, dy);
          if (d < radius) {
            const falloff = Math.max(EXPLOSION_MIN_FALLOFF, 1 - d / radius);
            const dmg = baseDmg * EXPLOSION_DAMAGE_MULT * falloff;
            const eff = Math.max(0, Math.min(dmg, e.hp));
            e.hp -= dmg;
            e.pop = Math.max(e.pop, 0.8);
            state.damageDealt += eff;
            grantXp(eff);
            if (e.hp <= 0) killEnemy(e);
          }
        }
      }

      // ── Upgrades / levelling ──────────────────────────────────────────────
      function isUpgradeAvailable(u: Upgrade): boolean {
        if (u.needBow && state.loadout.bow !== u.needBow) return false;
        if (u.needQuiver && state.loadout.quiver !== u.needQuiver) return false;
        if (u.blockIfBow) {
          const blocks = Array.isArray(u.blockIfBow) ? u.blockIfBow : [u.blockIfBow];
          if (blocks.includes(state.loadout.bow)) return false;
        }
        if (u.blockIfQuiver) {
          const blocks = Array.isArray(u.blockIfQuiver) ? u.blockIfQuiver : [u.blockIfQuiver];
          if (blocks.includes(state.loadout.quiver)) return false;
        }
        if (u.blockIfItem) {
          const blocks = Array.isArray(u.blockIfItem) ? u.blockIfItem : [u.blockIfItem];
          if (blocks.includes(state.loadout.item)) return false;
        }
        if (u.needStatLevel) {
          const cur = state.statLevels[u.needStatLevel.id] ?? 0;
          if (cur < u.needStatLevel.level) return false;
        }
        if (u.maxStacks && (state.statLevels[u.id] ?? 0) >= u.maxStacks) return false;
        return true;
      }
      function rollUpgrades(n: number): Upgrade[] {
        const avail = UPGRADES.filter(isUpgradeAvailable);
        const heal = UPGRADES.find(u => u.id === 'heal-full');
        // Slots 1..n-1 roll from every available upgrade. The last slot is
        // mod-only so late-game players always get at least one useful stat
        // bump instead of staring at three "you already own this" picks.
        const generalPool = avail;
        const modPool = avail.filter(u => u.kind === 'mod');
        const picks: Upgrade[] = [];
        const usedIds = new Set<string>();

        const addFromPool = (pool: Upgrade[]) => {
          const fresh = pool.filter(u => !usedIds.has(u.id));
          if (fresh.length === 0) {
            // Fallback — nothing left in this category. Drop in Full Heal if
            // it's not already offered.
            if (heal && !usedIds.has(heal.id)) {
              picks.push(heal);
              usedIds.add(heal.id);
            }
            return;
          }
          const [one] = weightedPickN(fresh, 1);
          if (one) {
            picks.push(one);
            usedIds.add(one.id);
          }
        };

        // First n-1 picks: general pool (bow / quiver / item / mod).
        for (let i = 0; i < n - 1; i++) addFromPool(generalPool);
        // Final pick: mod-only.
        if (n > 0) addFromPool(modPool);

        return picks;
      }
      function applyUpgrade(u: Upgrade) {
        if (u.maxStacks) {
          state.statLevels[u.id] = (state.statLevels[u.id] ?? 0) + 1;
        }
        switch (u.id) {
          case 'dmg':       state.stats.damageMult *= 1.15; break;
          case 'spd':       state.stats.speedMult *= 1.10; break;
          case 'draw':      state.stats.drawRateMult *= 1.10; break;
          case 'reload':    state.stats.reloadRateMult *= 1.20; break;
          case 'arrowspd':  state.stats.arrowSpeedMult *= 1.10; break;
          case 'quiver':
            state.stats.quiverBonus += 1;
            state.arrows = maxQuiver();
            state.reloadRemaining = 0; state.reloadQueued = 0;
            break;
          case 'hp':
            // statLevels['hp'] is already incremented by the generic
            // maxStacks block above; maxHp() reads from it directly.
            state.hp = maxHp();
            break;
          case 'heal-full': state.hp = maxHp(); break;
          case 'item-power': /* item stats derive from statLevels */ break;
          case 'bow-split2':    state.loadout.bow = 'split2'; break;
          case 'bow-split3':    state.loadout.bow = 'split3'; break;
          case 'bow-split5':    state.loadout.bow = 'split5'; break;
          case 'bow-ricochet1': state.loadout.bow = 'ricochet1'; break;
          case 'bow-ricochet2': state.loadout.bow = 'ricochet2'; break;
          case 'bow-ricochet3': state.loadout.bow = 'ricochet3'; break;
          case 'bow-shatter1':  state.loadout.bow = 'shatter1'; break;
          case 'bow-shatter2':  state.loadout.bow = 'shatter2'; break;
          case 'bow-shatter3':  state.loadout.bow = 'shatter3'; break;
          case 'q-explosive':   state.loadout.quiver = 'explosive'; break;
          case 'q-explosive2':  state.loadout.quiver = 'explosive2'; break;
          case 'q-explosive3':  state.loadout.quiver = 'explosive3'; break;
          case 'q-piercing':    state.loadout.quiver = 'piercing'; break;
          case 'q-piercing2':   state.loadout.quiver = 'piercing2'; break;
          case 'q-piercing3':   state.loadout.quiver = 'piercing3'; break;
          case 'q-blazing':     state.loadout.quiver = 'blazing'; break;
          case 'q-blazing2':    state.loadout.quiver = 'blazing2'; break;
          case 'q-blazing3':    state.loadout.quiver = 'blazing3'; break;
          case 'item-shield': setItem('shield'); break;
          case 'item-ring':   setItem('ring'); break;
          case 'item-embers': setItem('embers'); break;
        }
      }

      // Transition helper — sets up state for the new item.
      function setItem(kind: ItemKind) {
        state.loadout.item = kind;
        if (kind === 'shield') {
          state.shieldUp = true;
          state.shieldRegenRemaining = 0;
        }
      }
      function cardCount(): number {
        return 3;
      }
      function grantXp(amount: number) {
        if (state.level >= MAX_LEVEL) return;
        const prev = state.level;
        state.xp += amount;
        const newLevel = Math.min(MAX_LEVEL, levelForXp(state.xp));
        if (newLevel > prev) {
          state.level = newLevel;
          state.levelUpPending = true;
          state.paused = true;
          state.levelUpChoices = rollUpgrades(cardCount());
          shake = 0;
          playSfx('ui_level_up');
        }
      }

      function resetGame() {
        for (const a of arrows) a.gfx.destroy();
        arrows.length = 0;
        for (const e of enemies) { e.aura.destroy(); e.body.destroy(); }
        enemies.length = 0;
        for (const p of particles) p.sprite.destroy();
        particles.length = 0;
        for (const r of rings) r.gfx.destroy();
        rings.length = 0;
        for (const fp of firePatches) fp.gfx.destroy();
        firePatches.length = 0;
        state.hp = PLAYER_MAX_HP;
        state.arrows = QUIVER_CAPACITY;
        state.reloadRemaining = 0; state.reloadQueued = 0;
        state.wave = 0;
        state.wavePhase = 'active'; state.waveRemaining = 0; state.spawnAccum = 0;
        state.damageDealt = 0; state.timeSurvived = 0;
        state.startMs = Date.now();
        state.dead = false;
        state.dying = false;
        state.deathRevealTimer = 0;
        state.xp = 0; state.level = 1;
        state.kills = 0;
        state.awaitingStart = true;
        state.paused = true; state.levelUpPending = false;
        state.levelUpChoices = [];
        state.freezeRemaining = 0;
        state.stats = baseStats();
        state.statLevels = {};
        state.loadout = { bow: 'basic', quiver: 'basic', item: 'none' };
        state.shieldUp = false;
        state.shieldRegenRemaining = 0;
        state.simTime = 0;
        state.lastBeat = 0;
        paletteState.fromIdx = 0;
        paletteState.toIdx = 0;
        paletteState.t = 1;
        for (const r of ringEffects) r.gfx.destroy();
        ringEffects.length = 0;
        for (const fp of firePatches) fp.gfx.destroy();
        firePatches.length = 0;
        for (const er of enemyRings) er.gfx.destroy();
        enemyRings.length = 0;
        player.x = 0; player.y = 0;
        cam.x = 0; cam.y = 0;
        drawing = false; drawCharge = 0;
        shake = 0;
        startWave(1);
      }

      function dismissLevelUp() {
        if (!state.levelUpPending) return;
        state.levelUpPending = false;
        state.paused = false;
        state.levelUpChoices = [];
      }
      function togglePause() {
        if (state.dead || state.levelUpPending || state.awaitingStart) return;
        state.paused = !state.paused;
        if (state.paused) shake = 0;
      }

      function startGame() {
        if (!state.awaitingStart) return;
        // Default loadout — no picker any more, the game is balanced for it.
        state.loadout.bow = 'basic';
        state.loadout.quiver = 'basic';
        setItem('none');
        startWave(1);
        // Welcome wave: four grunts placed in concentric rings at widening
        // spacing, spread around the player so there's always something to
        // shoot while the real spawn pacing ramps up.
        {
          const baseAngle = Math.random() * Math.PI * 2;
          const ringRadii = [500, 700, 900, 1100];
          for (let i = 0; i < ringRadii.length; i++) {
            const th = baseAngle + (i * Math.PI * 2) / ringRadii.length
              + (Math.random() - 0.5) * 0.6;
            const r = ringRadii[i];
            const gx = player.x + Math.cos(th) * r;
            const gy = player.y + Math.sin(th) * r;
            const exAng = th + Math.PI + (Math.random() - 0.5) * 0.4;
            const exR = ARENA_RADIUS + 40;
            const ddx = Math.cos(exAng) * exR - gx;
            const ddy = Math.sin(exAng) * exR - gy;
            const len = Math.hypot(ddx, ddy) || 1;
            const e = makeEnemy('grunt');
            e.x = gx; e.y = gy;
            e.travelDx = ddx / len; e.travelDy = ddy / len;
            enemies.push(e);
          }
        }
        state.awaitingStart = false;
        state.paused = false;
        // Start the gameplay loop — the click that triggered this is a user
        // gesture, which browsers require before audio can autoplay.
        startMusic('gameplay_late');
      }
      startGameRef.current = startGame;

      pickUpgradeRef.current = (i: number) => {
        const c = state.levelUpChoices[i];
        if (!c) return;
        playSfx('ui_card_click');
        applyUpgrade(c);
        dismissLevelUp();
      };

      resetGameRef.current = () => { resetGame(); };
      togglePauseRef.current = () => { togglePause(); };

      // ── Input ─────────────────────────────────────────────────────────────
      const onKeyDown = (e: KeyboardEvent) => {
        unlockSfx();
        keys[e.code] = true;
        // Only restart from the game-over screen — a miss-click during an
        // active run used to wipe progress instantly.
        if (e.code === 'KeyR' && state.dead) { resetGame(); return; }
        if (e.code === 'Tab') { e.preventDefault(); setShowDebug(v => !v); return; }
        if (e.code === 'Escape') {
          e.preventDefault();
          if (state.levelUpPending) return; // must pick
          togglePause();
          return;
        }
        if (state.levelUpPending) {
          // Map 1..9 keys to card slots
          const m = /^(Digit|Numpad)([1-9])$/.exec(e.code);
          if (m) {
            const idx = parseInt(m[2], 10) - 1;
            if (idx < state.levelUpChoices.length) pickUpgradeRef.current?.(idx);
            return;
          }
        }
      };
      const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
      const onMouseMove = (e: MouseEvent) => { mouse.screenX = e.clientX; mouse.screenY = e.clientY; };
      const onMouseDown = (e: MouseEvent) => {
        unlockSfx();
        if (e.button !== 0) return;
        // Pressing LMB on the awaiting-start screen boots the game AND
        // continues into the normal draw, so the player can just click and
        // hold to start shooting.
        if (state.awaitingStart) {
          const target = e.target as HTMLElement | null;
          // Ignore clicks on form controls (name input, sliders, buttons).
          if (target && target.closest('input, button, [data-no-draw-start]')) return;
          startGame();
        }
        if (state.dead || state.dying || state.paused) return;
        if (state.arrows > 0) {
          drawing = true; drawCharge = 0;
        } else {
          playSfx('ui_empty_draw', { volume: 1.8 });
        }
      };
      const onMouseUp = (e: MouseEvent) => {
        if (e.button === 0 && drawing && !state.dead && !state.dying && !state.paused) {
          drawing = false;
          if (state.arrows > 0) {
            const W = window.innerWidth, H = window.innerHeight;
            const worldMx = mouse.screenX - W / 2 + cam.x;
            const worldMy = mouse.screenY - H / 2 + cam.y;
            const aimDx = worldMx - player.x;
            const aimDy = worldMy - player.y;
            const len = Math.hypot(aimDx, aimDy) || 1;
            fireShot(aimDx / len, aimDy / len, drawCharge);
            state.arrows--;
            if (state.reloadRemaining <= 0) state.reloadRemaining = reloadSeconds();
            else state.reloadQueued++;
          }
          drawCharge = 0;
        }
      };
      const onContext = (e: MouseEvent) => e.preventDefault();
      const onResize = () => app.renderer.resize(window.innerWidth, window.innerHeight);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('contextmenu', onContext);
      window.addEventListener('resize', onResize);
      cleanupListeners = () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('contextmenu', onContext);
        window.removeEventListener('resize', onResize);
      };

      startWave(1);

      // ── Tick ──────────────────────────────────────────────────────────────
      let lastT = performance.now();
      let hudSyncT = 0;
      // Beat pulse: driven by the music track's BPM + audio.currentTime.
      // Each beat spikes to 1.0 and decays exponentially, so the game reads
      // as throbbing in time with the kick drum rather than chasing noisy
      // analyser data. `smoothBeat` is a lightly-smoothed copy so visuals
      // don't pop harshly at each downbeat.
      let smoothBeat = 0;

      app.ticker.add(() => {
        const now = performance.now();
        const rawDt = Math.min(0.05, (now - lastT) / 1000);
        lastT = now;
        const W = window.innerWidth, H = window.innerHeight;

        // Quiet the music on pause / level-up so UI reads + dialogue matter.
        setMusicDuck(state.paused || state.levelUpPending);

        // BPM-locked beat envelope. Analyser energy is still sampled for
        // secondary uses (background particle density — track intensity),
        // but the primary "throb" uses the beat pulse.
        const beatNow = getMusicBeat();
        smoothBeat += (beatNow - smoothBeat) * 0.35;
        const musicEnergy = sampleMusicEnergy();

        // While `dying`, the game keeps running so the death burst can play.
        // After deathRevealTimer runs out we flip to dead+paused and the
        // overlay appears.
        if (state.dying && state.deathRevealTimer > 0) {
          state.deathRevealTimer -= rawDt;
          if (state.deathRevealTimer <= 0) {
            state.dying = false;
            state.dead = true;
            state.paused = true;
          }
        }
        const updatesPaused = state.paused || state.dead;
        let simDt = rawDt;
        if (updatesPaused) simDt = 0;
        else if (state.freezeRemaining > 0) {
          state.freezeRemaining -= rawDt;
          simDt = 0;
        }

        if (!updatesPaused && !state.dying) {
          const dx = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
          const dy = (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) - (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0);
          const mag = Math.hypot(dx, dy) || 1;
          const mv = playerSpeed() * (drawing ? DRAW_PLAYER_SPEED_MULT : 1);
          player.x += (dx / mag) * mv * simDt * (dx || dy ? 1 : 0);
          player.y += (dy / mag) * mv * simDt * (dx || dy ? 1 : 0);

          const pr = Math.hypot(player.x, player.y);
          if (pr > ARENA_RADIUS) { const k = ARENA_RADIUS / pr; player.x *= k; player.y *= k; }

          // Fire trail — drop a patch on every beat spike while moving. The
          // beat envelope rises from ~0 to 1.0 at each downbeat, so we fire
          // exactly once as it crosses the threshold upward.
          if (state.loadout.item === 'embers' && (dx || dy)) {
            const BEAT_THRESHOLD = 0.6;
            if (beatNow >= BEAT_THRESHOLD && state.lastBeat < BEAT_THRESHOLD) {
              spawnEmberTrailPatch(player.x, player.y);
            }
          }
          state.lastBeat = beatNow;

          if (drawing) drawCharge = Math.min(1, drawCharge + drawRate() * simDt);
          else drawCharge = 0;

          if (state.reloadRemaining > 0) {
            state.reloadRemaining -= simDt;
            if (state.reloadRemaining <= 0) {
              const cap = maxQuiver();
              state.arrows = Math.min(cap, state.arrows + 1);
              // One sound, pitch-graded across every slot. 1st loaded arrow
              // → 0.85x, final arrow that fills to cap → 1.25x. Scales to
              // any capacity (3..6) without needing a separate full-cue.
              const stepDenom = Math.max(1, cap - 1);
              const t = (state.arrows - 1) / stepDenom;
              const pitch = 0.85 + t * 0.4;
              playSfx('quiver_reload', { pitch, volume: 1.0 });
              if (state.reloadQueued > 0) {
                state.reloadQueued--;
                state.reloadRemaining = reloadSeconds();
              } else state.reloadRemaining = 0;
            }
          }
          if (simDt > 0) state.timeSurvived += simDt;
        }

        // Camera always interpolates
        const mouseDirX = (mouse.screenX - W / 2) / Math.max(W / 2, 1);
        const mouseDirY = (mouse.screenY - H / 2) / Math.max(H / 2, 1);
        cam.x = lerp(cam.x, player.x + mouseDirX * CAM_LOOKAHEAD, CAM_LERP);
        cam.y = lerp(cam.y, player.y + mouseDirY * CAM_LOOKAHEAD, CAM_LERP);

        // Shake: zero out while game is paused/dead so the overlay doesn't jitter
        if (updatesPaused) shake = 0;
        const shakeX = shake > 0 ? (Math.random() - 0.5) * shake : 0;
        const shakeY = shake > 0 ? (Math.random() - 0.5) * shake : 0;
        if (simDt > 0) shake = Math.max(0, shake - shake * 8 * simDt - 1 * simDt);
        const camX = cam.x + shakeX;
        const camY = cam.y + shakeY;

        // Palette transition — advance regardless of pause so the shift runs
        // smoothly even if the wave-start freeze happens.
        if (paletteState.t < 1) {
          paletteState.t = Math.min(1, paletteState.t + PALETTE_TRANSITION_SPEED * rawDt);
        }
        const pal = currentPalette();
        // Repaint full-screen bg with the current palette fill
        bgGfx.clear();
        bgGfx.rect(0, 0, W, H).fill({ color: pal.bg });

        drawGrid(camX, camY, pal.grid, smoothBeat);
        drawArena(camX, camY, pal.arena);

        if (simDt > 0) {
          emitPlayerAmbient(simDt);
          // Background particle density nudges with overall music energy —
          // subtle breathing, not a visualizer.
          emitBackground(simDt, camX, camY, pal, musicEnergy.overall);
        }

        // Player render — hidden while dying (death burst only) AND after
        // death so the player doesn't flicker back into view for one frame
        // between the dying→dead transition and the React game-over overlay.
        const psx = player.x - camX + W / 2;
        const psy = player.y - camY + H / 2;
        const playerVisible = !state.dying && !state.dead;
        playerAura.visible = playerVisible;
        // HP segments — one short arc per max HP, laid out along the same
        // curve the old single arc used. Filled cells fade green→orange→red
        // as HP falls; at 1 HP the last remaining segment blinks black for
        // a panic read.
        hpArcGfx.clear();
        if (playerVisible) {
          const total = maxHp();
          const cur = Math.max(0, Math.min(total, state.hp));
          const hpFrac = total > 0 ? cur / total : 0;
          const fillColor = hpFrac > 0.6 ? 0x88dd66 : hpFrac > 0.25 ? 0xffaa33 : 0xff4466;
          const r = 34;
          const cx = player.x - camX + W / 2;
          const cy = player.y - camY + H / 2 + 10;
          // Sweep 110° symmetric about straight-down (π/2) so the arc sits
          // as a smile beneath the player. Each segment is drawn thick so the
          // bar thickness visibly exceeds the per-segment arc length.
          const sweepTotal = (110 * Math.PI) / 180;
          const startAng = Math.PI / 2 - sweepTotal / 2;
          const segSpan = sweepTotal / total;
          const gapAng = Math.min(segSpan * 0.3, (4 * Math.PI) / 180);
          const drawSpan = segSpan - gapAng;
          // Low-HP blink: visible 520 ms, dim 200 ms — visible longer than
          // hidden so the panic read stays readable. Dim colour matches the
          // empty-segment grey so it looks like the segment has "left" and
          // come back, not like a hard black flash.
          const BLINK_PERIOD = 720;
          const BLINK_VISIBLE = 520;
          const blinkDim = performance.now() % BLINK_PERIOD >= BLINK_VISIBLE;
          const lowHpBlink = cur === 1 && blinkDim;
          // Arc is drawn from right (angle ≈35°) to left (≈145°). We want
          // segments to empty from the right first, so the surviving arc
          // shrinks toward the left end. The leftmost segment (index
          // total−1) is the final one standing at 1 HP.
          for (let i = 0; i < total; i++) {
            const a0 = startAng + i * segSpan + gapAng / 2;
            const a1 = a0 + drawSpan;
            const sx = cx + Math.cos(a0) * r;
            const sy = cy + Math.sin(a0) * r;
            hpArcGfx.moveTo(sx, sy);
            hpArcGfx.arc(cx, cy, r, a0, a1);
            const filled = i >= total - cur;
            if (filled) {
              const isLast = cur === 1 && i === total - 1;
              if (isLast && lowHpBlink) {
                hpArcGfx.stroke({ width: 10, color: 0x2a2a38, alpha: 0.85, cap: 'butt' });
              } else {
                hpArcGfx.stroke({ width: 11, color: fillColor, alpha: 0.95, cap: 'butt' });
              }
            } else {
              hpArcGfx.stroke({ width: 10, color: 0x2a2a38, alpha: 0.85, cap: 'butt' });
            }
          }
        }
        playerAura.x = psx; playerAura.y = psy;
        playerAura.width = playerAura.height = 130 * (1 + smoothBeat * 0.25);
        playerAura.tint = 0x3377dd;
        playerAura.alpha = 0.32 + smoothBeat * 0.25;
        playerBody.clear();
        if (playerVisible) {
          // Player throbs every other beat — soft scale so the motion reads
          // as "alive", not as a heartbeat attack.
          const beatScale = 1 + smoothBeat * 0.28;
          playerBody.circle(psx, psy, 9 * beatScale).fill({ color: 0xe0e8ff });
          playerBody.circle(psx, psy, 12 * beatScale).stroke({ width: 1.2, color: 0x88aaff, alpha: 0.75 });
          // Shield visual — cyan halo around player while shield is up
          if (state.loadout.item === 'shield' && state.shieldUp) {
            const puls = 1 + Math.sin(state.simTime * 6) * 0.06;
            playerBody.circle(psx, psy, 22 * puls).stroke({ width: 2.5, color: 0x77ccff, alpha: 0.85 });
            playerBody.circle(psx, psy, 26 * puls).stroke({ width: 1.2, color: 0xaaddff, alpha: 0.45 });
          }

          /* HP arc drawn separately on fxLayer, see below */
        }

        const worldMx = mouse.screenX - W / 2 + cam.x;
        const worldMy = mouse.screenY - H / 2 + cam.y;
        const aimX = worldMx - player.x, aimY = worldMy - player.y;
        const aimLen = Math.hypot(aimX, aimY) || 1;
        const aimNx = aimX / aimLen, aimNy = aimY / aimLen;

        // Held bow — uses the shared drawBowInto helper so every bow on screen
        // (held / aim silhouette / HUD slot) has the same shape.
        bowGfx.clear();
        aimGfx.clear();
        if (!playerVisible) {
          // Skip bow/aim rendering while dying
          // (fall through to the rest of the frame)
        } else {
        const bowStyle = BOW_RENDER[state.loadout.bow];
        const gripX = psx + aimNx * BOW_GRIP_OFFSET;
        const gripY = psy + aimNy * BOW_GRIP_OFFSET;
        const heldTips = drawBowInto(bowGfx, gripX, gripY, aimNx, aimNy, drawCharge, bowStyle);

        const tipBackDist = bowStyle.limbLength * heldTips.sinB;
        const knockBack = tipBackDist + drawCharge * BOW_MAX_PULL;
        const pullX = gripX - aimNx * knockBack;
        const pullY = gripY - aimNy * knockBack;
        bowGfx.moveTo(heldTips.upTipX, heldTips.upTipY).lineTo(pullX, pullY).lineTo(heldTips.loTipX, heldTips.loTipY)
          .stroke({ width: 1, color: 0xffffff, alpha: 0.65 });

        // Show as many nocked arrows as the bow will fire
        if (drawing) {
          const bk = state.loadout.bow;
          const nockCount = bk === 'split5' ? 5 : bk === 'split3' ? 3 : bk === 'split2' ? 2 : 1;
          const nockSpread = nockCount === 5 ? 11 : nockCount === 3 ? 8 : nockCount === 2 ? 5 : 0;
          const cols = arrowColorsForQuiver(state.loadout.quiver);
          const pPerpX = -aimNy, pPerpY = aimNx;
          const pierce = state.loadout.quiver === 'piercing' || state.loadout.quiver === 'piercing2' || state.loadout.quiver === 'piercing3';
          const explosive = state.loadout.quiver === 'explosive' || state.loadout.quiver === 'explosive2' || state.loadout.quiver === 'explosive3';
          for (let i = 0; i < nockCount; i++) {
            const t = nockCount === 1 ? 0.5 : i / (nockCount - 1);
            const off = (t - 0.5) * nockSpread;
            const tailX = pullX + pPerpX * off;
            const tailY = pullY + pPerpY * off;
            const tipX = tailX + aimNx * ARROW_LENGTH;
            const tipY = tailY + aimNy * ARROW_LENGTH;
            drawArrowShape(bowGfx, tipX, tipY, tailX, tailY,
              cols.shaft, cols.trail, cols.core, pierce, explosive, false);
          }
        }

        if (drawing) {
          const bowMod = BOW_STATS[state.loadout.bow];
          // Match spawnArrow exactly: base range × bow mult × stats
          // arrowSpeedMult (the +Arrow Range upgrade). Silhouette is drawn
          // ~5% shorter than real so arrows always fly *past* the ghost —
          // small surprise-win feeling. Upgrade stacks stay accurate.
          const rangeMult = bowMod.rangeMult * state.stats.arrowSpeedMult;
          const GHOST_BIAS = 0.95;
          const currentRange = lerp(MIN_RANGE, MAX_RANGE, drawCharge) * rangeMult * GHOST_BIAS;
          const maxShown = MAX_RANGE * rangeMult * GHOST_BIAS;
          // Silhouette uses the same style as the held bow but scaled up
          // (limbs and fork prongs proportionally longer) so it reads at range.
          const silScale = BOW_SIL_LIMB_LENGTH / bowStyle.limbLength;
          const silStyle: BowRenderStyle = {
            color: bowStyle.color,
            accentColor: bowStyle.accentColor,
            limbLength: bowStyle.limbLength * silScale,
            curve: bowStyle.curve * silScale,
            forkCount: bowStyle.forkCount,
            forkLength: bowStyle.forkLength * silScale,
          };
          drawBowInto(aimGfx,
            psx + aimNx * maxShown, psy + aimNy * maxShown,
            aimNx, aimNy, 0, silStyle, BOW_SIL_MAX_ALPHA);
          drawBowInto(aimGfx,
            psx + aimNx * currentRange, psy + aimNy * currentRange,
            aimNx, aimNy, 0, silStyle, BOW_SIL_CUR_ALPHA);
          // Aim line — colored to the current bow's accent so the player can
          // see it clearly against any palette. Thicker (~2.4) and a touch
          // more opaque than before.
          const aimColor = bowStyle.accentColor ?? bowStyle.color;
          const steps = 18;
          for (let i = 0; i < steps; i++) {
            const t0 = i / steps, t1 = (i + 1) / steps;
            const a = 0.55 * (1 - t0) * (1 - t0);
            if (a < 0.02) break;
            aimGfx.moveTo(psx + aimNx * maxShown * t0, psy + aimNy * maxShown * t0)
              .lineTo(psx + aimNx * maxShown * t1, psy + aimNy * maxShown * t1)
              .stroke({ width: 2.4, color: aimColor, alpha: a });
          }
        }
        } // end of playerVisible bow+aim block

        // ── Arrows ─────────────────────────────────────────────────────────
        if (simDt > 0) {
          for (const a of arrows) {
            if (!a.alive) continue;
            a.life += simDt;

            a.x += a.vx * simDt;
            a.y += a.vy * simDt;
            emitArrowTrail(a, simDt);

            // Blazing Chevron: drop patches at a fixed pixel spacing (not time),
            // so short-range shots get fewer patches at the same visual stride.
            if (a.blazing) {
              const spd = Math.hypot(a.vx, a.vy);
              a.blazingAccum += spd * simDt;
              while (a.blazingAccum >= BLAZING_PATCH_SPACING) {
                a.blazingAccum -= BLAZING_PATCH_SPACING;
                spawnBlazingPatch(a.x, a.y, a.blazingPatchDuration);
              }
            }

            for (const e of enemies) {
              if (!e.alive) continue;
              if (a.hitEnemies.has(e)) continue;
              const ddx = a.x - e.x, ddy = a.y - e.y;
              if (ddx * ddx + ddy * ddy < e.radius * e.radius) {
                const eff = Math.max(0, Math.min(a.damage, e.hp));
                e.hp -= a.damage;
                e.pop = 1;
                state.damageDealt += eff;
                grantXp(eff);
                emitArrowImpact(a.x, a.y);
                spawnHitRing(a.x, a.y, 0xff9966);
                shake += 1 + e.maxHp * 0.8;
                a.hitEnemies.add(e);
                // Volley pitch: every impact across the whole volley (split
                // siblings + ricochet children share one counter, and mines
                // count too) bumps pitch, so a split3+piercing combo through
                // nine enemies reads as one rising arc.
                a.volley.hitCount++;
                const chainPitch = 1 + (a.volley.hitCount - 1) * 0.1;
                playSfx(impactSoundId(state.loadout.quiver), { pitch: chainPitch });
                if (a.explodeOnHit) applyExplosion(a.x, a.y, a.damage, a.explosionRadius);
                // Shatter: fire a radial burst at the impact point. Happens
                // on every direct hit (so a piercing + shatter arrow bursts
                // once per pierce), but the shards themselves carry
                // shatterShards=0 so they can't re-shatter.
                if (a.shatterShards > 0) spawnShatterShards(a, a.x, a.y);
                if (e.hp <= 0) killEnemy(e);

                // Resolve arrow fate
                if (a.pierce) {
                  // Piercing + Ricochet: spawn a bounded child arrow that
                  // bounces from this hit toward another enemy. Original
                  // piercing arrow continues through.
                  if (a.bounces > 0 && a.childArrowsSpawned < a.pierceLimit) {
                    spawnRicochetChild(a, e);
                    a.childArrowsSpawned++;
                  }
                  if (a.hitEnemies.size >= a.pierceLimit) { a.alive = false; break; }
                } else if (a.bounces > 0) {
                  // Ricochet: redirect to nearest un-hit enemy or mine in range.
                  const t = findBounceTarget(a.x, a.y, a.hitEnemies, e);
                  if (t) {
                    const speed = Math.hypot(a.vx, a.vy);
                    a.vx = (t.dx / t.d) * speed;
                    a.vy = (t.dy / t.d) * speed;
                    a.bounces--;
                    a.maxLife += 0.25; // extend flight so the bounce has time to reach
                    break;
                  }
                  a.alive = false;
                  break;
                } else {
                  a.alive = false;
                  break;
                }
              }
            }
            if (a.alive && a.life >= a.maxLife) a.alive = false;
          }
        }

        // Render arrows (even when paused, held in place)
        for (const a of arrows) {
          const ang = Math.atan2(a.vy, a.vx);
          a.gfx.clear();
          const shaftLen = 22;
          const tipX = a.x - camX + W / 2;
          const tipY = a.y - camY + H / 2;
          const tailX = tipX - Math.cos(ang) * shaftLen;
          const tailY = tipY - Math.sin(ang) * shaftLen;
          drawArrowShape(a.gfx, tipX, tipY, tailX, tailY,
            a.shaftColor, a.trailColor, a.coreSparkColor, a.pierce, a.explodeOnHit);
        }
        for (let i = arrows.length - 1; i >= 0; i--) {
          if (!arrows[i].alive) { arrows[i].gfx.destroy(); arrows.splice(i, 1); }
        }

        // ── Enemies ────────────────────────────────────────────────────────
        // No enemy-enemy collision — they pass through each other. Grunts and
        // weavers spread naturally because they travel straight across the
        // arena instead of converging on the player.
        if (!updatesPaused && simDt > 0) {
          for (const e of enemies) {
            if (!e.alive) continue;
            e.spawnT += simDt;
            const dxp = player.x - e.x;
            const dyp = player.y - e.y;
            const distp = Math.hypot(dxp, dyp) || 1;

            if (e.kind === 'grunt') {
              e.x += e.travelDx * GRUNT_SPEED * simDt;
              e.y += e.travelDy * GRUNT_SPEED * simDt;
            } else if (e.kind === 'weaver') {
              const pxn = -e.travelDy, pyn = e.travelDx;
              const lateral = Math.sin(e.spawnT * WEAVER_LATERAL_FREQ + e.phase) * WEAVER_LATERAL_AMP;
              e.x += (e.travelDx * WEAVER_SPEED + pxn * lateral) * simDt;
              e.y += (e.travelDy * WEAVER_SPEED + pyn * lateral) * simDt;
            } else if (e.kind === 'broodmother') {
              // Moves straight like a grunt, slower. Spits spawnlings toward
              // the player every BROODMOTHER_SPAWN_INTERVAL seconds.
              e.x += e.travelDx * BROODMOTHER_SPEED * simDt;
              e.y += e.travelDy * BROODMOTHER_SPEED * simDt;
              e.spawnCooldown -= simDt;
              if (e.spawnCooldown <= 0) {
                spawnSpawnling(e);
                e.spawnCooldown = BROODMOTHER_SPAWN_INTERVAL;
              }
            } else if (e.kind === 'spawnling') {
              // Straight-line projectile from broodmother's launch point
              e.x += e.travelDx * SPAWNLING_SPEED * simDt;
              e.y += e.travelDy * SPAWNLING_SPEED * simDt;
              if (e.spawnT > SPAWNLING_MAX_LIFE) e.alive = false;
            } else if (e.kind === 'sapper') {
              // Smooth wander: pick a new target heading occasionally, steer
              // the current facing toward it at a capped turn rate, move
              // forward. No instantaneous direction snaps.
              const r = Math.hypot(e.x, e.y);
              const outsideArena = r > ARENA_RADIUS - e.radius - 40;
              const tooFarOutside = r > ARENA_RADIUS + 40;

              e.wanderT -= simDt;
              if (e.wanderT <= 0 || tooFarOutside) {
                if (outsideArena || tooFarOutside) {
                  // Outside or near edge: aim back toward the center
                  const inward = Math.atan2(-e.y / (r || 1), -e.x / (r || 1));
                  const jitter = (Math.random() - 0.5) * 0.6;
                  e.travelDx = Math.cos(inward + jitter);
                  e.travelDy = Math.sin(inward + jitter);
                } else {
                  // Inside: pick a new target rotated from the current one so
                  // the path stays a lazy S-curve rather than a hard U-turn.
                  const curAng = Math.atan2(e.travelDy, e.travelDx);
                  const delta = (Math.random() - 0.5) * Math.PI * 1.1;  // ±100°
                  e.travelDx = Math.cos(curAng + delta);
                  e.travelDy = Math.sin(curAng + delta);
                }
                e.wanderT = SAPPER_WANDER_CHANGE * (0.7 + Math.random() * 0.8);
              }

              // Steer current facing toward target at the capped turn rate
              const curAng = Math.atan2(e.dirY, e.dirX);
              const tgtAng = Math.atan2(e.travelDy, e.travelDx);
              let diff = tgtAng - curAng;
              while (diff >  Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              const maxTurn = SAPPER_TURN_RATE * simDt;
              const applied = Math.max(-maxTurn, Math.min(maxTurn, diff));
              const newAng = curAng + applied;
              e.dirX = Math.cos(newAng);
              e.dirY = Math.sin(newAng);

              e.x += e.dirX * SAPPER_SPEED * simDt;
              e.y += e.dirY * SAPPER_SPEED * simDt;

              e.spawnCooldown -= simDt;
              if (e.spawnCooldown <= 0) {
                spawnMine(e.x, e.y);
                e.spawnCooldown = SAPPER_MINE_INTERVAL;
              }
            } else if (e.kind === 'pulser') {
              // Slow approach toward player; emits ring pulses on a cooldown.
              const fwdX = dxp / distp, fwdY = dyp / distp;
              e.x += fwdX * PULSER_SPEED * simDt;
              e.y += fwdY * PULSER_SPEED * simDt;
              e.spawnCooldown -= simDt;
              if (e.spawnCooldown <= 0) {
                spawnEnemyRing(e.x, e.y);
                e.spawnCooldown = PULSER_PULSE_INTERVAL;
              }
            } else if (e.kind === 'charger') {
              const fwdX = dxp / distp, fwdY = dyp / distp;
              if (e.chargeState === 'pursue') {
                if (distp < CHARGER_DETECT_RANGE) {
                  e.chargeState = 'telegraph'; e.chargeT = 0;
                  e.chargeDirX = fwdX; e.chargeDirY = fwdY;
                } else {
                  e.x += fwdX * CHARGER_PURSUE_SPEED * simDt;
                  e.y += fwdY * CHARGER_PURSUE_SPEED * simDt;
                }
              } else if (e.chargeState === 'telegraph') {
                e.chargeT += simDt;
                e.chargeDirX = fwdX; e.chargeDirY = fwdY;
                if (e.chargeT >= CHARGER_TELEGRAPH_S) {
                  e.chargeState = 'launching'; e.chargeT = 0;
                  e.chargeVx = e.chargeDirX * CHARGER_LAUNCH_SPEED;
                  e.chargeVy = e.chargeDirY * CHARGER_LAUNCH_SPEED;
                  emitChargerLaunchFlash(e);
                  state.freezeRemaining = CHARGER_FREEZE_S;
                  shake += 1.5;
                  playSfx('charger_launch', { volume: 0.55 });
                }
              } else {
                e.chargeT += simDt;
                e.x += e.chargeVx * simDt;
                e.y += e.chargeVy * simDt;
                const dragF = Math.pow(CHARGER_LAUNCH_DRAG, simDt);
                e.chargeVx *= dragF; e.chargeVy *= dragF;
                const spd = Math.hypot(e.chargeVx, e.chargeVy);
                if (spd < CHARGER_MIN_LAUNCH_SPEED || e.chargeT > CHARGER_MAX_LAUNCH_T) {
                  e.chargeState = 'pursue'; e.chargeT = 0;
                  e.chargeVx = 0; e.chargeVy = 0;
                }
              }
            } else if (e.kind === 'stalker') {
              // Steer current facing toward the player at a capped turn rate,
              // move forward at constant speed. Slow turn = easy to sidestep.
              const desX = dxp / distp, desY = dyp / distp;
              const curAng = Math.atan2(e.dirY, e.dirX);
              const tgtAng = Math.atan2(desY, desX);
              let diff = tgtAng - curAng;
              while (diff > Math.PI)  diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              const maxTurn = STALKER_TURN_RATE * simDt;
              const applied = Math.max(-maxTurn, Math.min(maxTurn, diff));
              const newAng = curAng + applied;
              e.dirX = Math.cos(newAng);
              e.dirY = Math.sin(newAng);
              e.x += e.dirX * STALKER_SPEED * simDt;
              e.y += e.dirY * STALKER_SPEED * simDt;
            }

            emitEnemyEmbers(e, simDt);

            // Touch damage — shield absorbs; enemy always dies on contact
            if (distp < e.radius + 10) {
              const wasShielded = state.loadout.item === 'shield' && state.shieldUp;
              e.alive = false;
              emitEnemyDeathBurst(e);
              if (e.kind === 'mine') playSfx('enemy_death');
              if (!wasShielded) shake += 3 + e.maxHp * 1.2;
              damagePlayerFromHazard(ENEMY_TOUCH_DAMAGE, e.x, e.y);
            }

            // Despawn rules
            if (e.alive) {
              const rFromCenter = Math.hypot(e.x, e.y);
              if (e.kind === 'grunt' || e.kind === 'weaver' || e.kind === 'broodmother' || e.kind === 'spawnling') {
                // Despawn when they've crossed out the far side
                if (e.spawnT > 1.2 && rFromCenter > ARENA_RADIUS + GRUNT_DESPAWN_MARGIN) {
                  e.alive = false; // silent despawn — not a kill, no XP, no burst
                }
              } else if (e.kind === 'stalker') {
                // Only drop if it wandered way off the map (orphaned)
                if (rFromCenter > ARENA_RADIUS + 500) e.alive = false;
              } else if (e.kind === 'pulser') {
                if (rFromCenter > ARENA_RADIUS + 400) e.alive = false;
              } else if (e.kind === 'mine') {
                // Mines expire after their set lifetime — pop silently. The
                // mine_pop cue is reserved for player destructions (arrow
                // hits, stepping on one), not ambient timeouts.
                if (e.spawnT > MINE_LIFETIME) {
                  emitEnemyDeathBurst(e);
                  e.alive = false;
                }
              }
              // Sapper: no timeout — sappers stay inside the arena via
              // smooth steering; they die only when destroyed by the player.
            }
          }
        }

        // Enemy render
        for (const e of enemies) {
          if (!e.alive) { e.aura.visible = false; e.body.clear(); continue; }
          const ex = e.x - camX + W / 2;
          const ey = e.y - camY + H / 2;

          // Mines get their own render so the big pulse (15% amplitude, fast)
          // reads as "armed hazard" rather than a sleepy enemy.
          if (e.kind === 'mine') {
            const minePulse = 0.85 + Math.sin(e.spawnT * 6 + e.phase) * 0.15;
            const popScaleM = 1 + e.pop * 0.35;
            if (simDt > 0) e.pop *= Math.pow(0.001, simDt);
            e.aura.tint = YELLOW_AURA_TINT;
            e.aura.x = ex; e.aura.y = ey;
            e.aura.width = e.aura.height = (e.radius * 2.5) * minePulse * popScaleM;
            e.aura.alpha = 0.25;
            e.aura.visible = true;
            e.body.clear();
            e.body.circle(ex, ey, e.radius * minePulse * popScaleM).fill({ color: YELLOW_FILL_DARK, alpha: 0.6 });
            e.body.circle(ex, ey, e.radius * 0.6 * minePulse * popScaleM).fill({ color: YELLOW_FILL_MID, alpha: 0.8 });
            e.body.circle(ex, ey, e.radius * 0.3 * minePulse * popScaleM).fill({ color: YELLOW_FILL_HIGH, alpha: 0.95 });
            e.body.circle(ex, ey, e.radius * minePulse * popScaleM).stroke({ width: 1.5, color: YELLOW_STROKE, alpha: 0.9 });
            continue;
          }

          const pulse = 1 + Math.sin(e.spawnT * 3) * 0.05;
          const popScale = 1 + e.pop * 0.35;
          if (simDt > 0) e.pop *= Math.pow(0.001, simDt);

          let aura: number, fD: number, fM: number, fH: number, st: number;
          if (e.kind === 'charger') {
            aura = CHARGER_AURA_TINT; fD = CHARGER_FILL_DARK; fM = CHARGER_FILL_MID;
            fH = CHARGER_FILL_HIGH; st = CHARGER_STROKE;
          } else if (e.kind === 'stalker') {
            aura = STALKER_AURA_TINT; fD = STALKER_FILL_DARK; fM = STALKER_FILL_MID;
            fH = STALKER_FILL_HIGH; st = STALKER_STROKE;
          } else if (e.kind === 'spawnling') {
            aura = SPAWNLING_AURA_TINT; fD = GRUNT_FILL_DARK; fM = SPAWNLING_FILL_MID;
            fH = GRUNT_FILL_HIGH; st = SPAWNLING_STROKE;
          } else if (e.kind === 'broodmother') {
            aura = BROODMOTHER_AURA_TINT; fD = BROODMOTHER_FILL_DARK; fM = BROODMOTHER_FILL_MID;
            fH = BROODMOTHER_FILL_HIGH; st = BROODMOTHER_STROKE;
          } else if (e.kind === 'pulser') {
            aura = PULSER_AURA_TINT; fD = PULSER_FILL_DARK; fM = PULSER_FILL_MID;
            fH = PULSER_FILL_HIGH; st = PULSER_STROKE;
          } else if (e.kind === 'sapper') {
            aura = YELLOW_AURA_TINT; fD = YELLOW_FILL_DARK; fM = YELLOW_FILL_MID;
            fH = YELLOW_FILL_HIGH; st = YELLOW_STROKE;
          } else {
            // grunt, weaver — shared muted rose palette
            aura = GRUNT_AURA_TINT; fD = GRUNT_FILL_DARK; fM = GRUNT_FILL_MID;
            fH = GRUNT_FILL_HIGH; st = GRUNT_STROKE;
          }

          const launchHot = e.chargeState === 'launching' ? 1.5 : 1.0;
          e.aura.tint = aura;
          e.aura.x = ex; e.aura.y = ey;
          e.aura.width = e.aura.height = (e.radius * 3.2) * pulse * popScale * launchHot;
          e.aura.alpha = 0.32 * launchHot;
          e.aura.visible = true;
          e.body.clear();
          e.body.circle(ex, ey, e.radius * popScale).fill({ color: fD });
          e.body.circle(ex, ey, e.radius * 0.72 * popScale).fill({ color: fM });
          e.body.circle(ex, ey, e.radius * 0.36 * popScale).fill({ color: fH, alpha: 0.9 });
          e.body.circle(ex, ey, e.radius * popScale).stroke({ width: 1.5, color: st, alpha: 0.85 });

          // Charger telegraph — pulsing ring ONLY (no aim line, no HP bar)
          if (e.kind === 'charger' && e.chargeState === 'telegraph') {
            const tProg = Math.min(1, e.chargeT / CHARGER_TELEGRAPH_S);
            const flash = 0.5 + 0.5 * Math.sin(e.chargeT * 32);
            e.body.circle(ex, ey, e.radius * (1.3 + tProg * 0.9)).stroke({
              width: 2 + tProg * 2, color: 0xee88ff, alpha: 0.35 + 0.55 * flash * tProg,
            });
          }

          // Pulser charge-up — an incoming ring CONTRACTS from far out toward
          // the pulser during the last 1s. On release, the real shockwave
          // expands outward as the damaging ring.
          if (e.kind === 'pulser') {
            const TELEGRAPH_WINDOW = 1.0;
            const tLeft = e.spawnCooldown;
            if (tLeft < TELEGRAPH_WINDOW && tLeft > 0) {
              const chargeT = 1 - tLeft / TELEGRAPH_WINDOW;   // 0 → 1
              const flash = 0.5 + 0.5 * Math.sin(e.spawnT * 22);
              // Contracting inward ring: starts at 3× radius, shrinks to ~1×.
              const inR = e.radius * (3.0 - chargeT * 2.0);
              e.body.circle(ex, ey, inR).stroke({
                width: 1.5 + chargeT * 2.5,
                color: PULSER_STROKE,
                alpha: 0.25 + 0.6 * chargeT * flash,
              });
              // Bright core gathers at the centre as energy collapses in.
              const coreR = e.radius * 0.28 * (1 + chargeT * 1.1);
              e.body.circle(ex, ey, coreR).fill({
                color: PULSER_FILL_HIGH, alpha: 0.5 + 0.45 * chargeT,
              });
            }
          }
        }
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (!enemies[i].alive) { enemies[i].aura.destroy(); enemies[i].body.destroy(); enemies.splice(i, 1); }
        }

        // Timed waves: during 'active' phase, spawn at wave-scaled rate and
        // count down. When the phase timer runs out, switch to a brief pause,
        // then roll into the next wave. Enemies still alive carry across.
        if (!updatesPaused && simDt > 0) {
          state.waveRemaining -= simDt;
          if (state.wavePhase === 'active') {
            state.spawnAccum += simDt;
            const interval = 1 / spawnRateFor(state.wave);
            while (state.spawnAccum >= interval) {
              state.spawnAccum -= interval;
              spawnEnemyOfKind(pickWaveKind(state.wave));
            }
            if (state.waveRemaining <= 0) {
              state.wavePhase = 'pause';
              state.waveRemaining = WAVE_PAUSE_S;
            }
          } else {
            if (state.waveRemaining <= 0) startWave(state.wave + 1);
          }
        }

        // ── Items: shield regen + shockwave effects ────────────────────────
        if (simDt > 0) state.simTime += simDt;
        if (!updatesPaused && simDt > 0) {
          // Passive shield regen — if broken, count down until back up
          if (state.loadout.item === 'shield' && !state.shieldUp && state.shieldRegenRemaining > 0) {
            state.shieldRegenRemaining -= simDt;
            if (state.shieldRegenRemaining <= 0) {
              state.shieldUp = true;
              state.shieldRegenRemaining = 0;
              playSfx('item_shield_ready');
            }
          }
          // Shockwave rings: expand, damage, cull
          for (let i = ringEffects.length - 1; i >= 0; i--) {
            const r = ringEffects[i];
            r.life += simDt;
            r.radius += r.expandSpeed * simDt;
            if (r.radius > r.maxRadius) {
              r.gfx.destroy();
              ringEffects.splice(i, 1);
              continue;
            }
            // Damage enemies inside the ring thickness (near the leading edge)
            const band = 50;
            for (const e of enemies) {
              if (!e.alive || r.hitEnemies.has(e)) continue;
              const dx = e.x - r.x, dy = e.y - r.y;
              const d = Math.hypot(dx, dy);
              if (d > r.radius - band && d < r.radius + 10) {
                e.hp -= r.damage;
                e.pop = 1;
                state.damageDealt += r.damage;
                grantXp(r.damage);
                r.hitEnemies.add(e);
                emitArrowImpact(e.x, e.y);
                if (e.hp <= 0) killEnemy(e);
              }
            }
          }
        }
        // Render ring effects (screen space)
        for (const r of ringEffects) {
          r.gfx.clear();
          const progress = r.radius / r.maxRadius;
          const alpha = Math.max(0, 1 - progress);
          const sx = r.x - camX + W / 2;
          const sy = r.y - camY + H / 2;
          r.gfx.circle(sx, sy, r.radius).stroke({ width: 5, color: 0xffaa33, alpha: alpha * 0.9 });
          r.gfx.circle(sx, sy, r.radius - 3).stroke({ width: 3, color: 0xffee88, alpha: alpha * 0.7 });
        }

        // Mines are handled in the shared enemy update/render now — their
        // movement (none), touch damage, lifetime expire, and pop are all
        // driven by the same pipeline as every other enemy.

        // ── Enemy rings (Pulser hazard) — expanding, damage player on contact
        if (!updatesPaused && simDt > 0) {
          for (let i = enemyRings.length - 1; i >= 0; i--) {
            const r = enemyRings[i];
            r.radius += r.expandSpeed * simDt;
            if (r.radius > r.maxRadius) {
              r.gfx.destroy();
              enemyRings.splice(i, 1);
              continue;
            }
            if (!r.didHit) {
              const dx = player.x - r.x, dy = player.y - r.y;
              const d = Math.hypot(dx, dy);
              const band = 28;
              if (d > r.radius - band && d < r.radius + 12) {
                damagePlayerFromHazard(r.damage, player.x, player.y);
                r.didHit = true;
              }
            }
          }
        }
        // Render enemy rings
        for (const r of enemyRings) {
          r.gfx.clear();
          const progress = r.radius / r.maxRadius;
          const alpha = Math.max(0, 1 - progress * progress);
          const sx = r.x - camX + W / 2;
          const sy = r.y - camY + H / 2;
          r.gfx.circle(sx, sy, r.radius).stroke({ width: 4, color: PULSER_STROKE, alpha: alpha * 0.95 });
          r.gfx.circle(sx, sy, r.radius - 3).stroke({ width: 2, color: PULSER_FILL_HIGH, alpha: alpha * 0.7 });
        }

        // ── Fire patches ───────────────────────────────────────────────────
        // Persistent ground hazard from Fire Bow. Ticks damage on enemies
        // inside and emits rising flame particles.
        if (simDt > 0 && !updatesPaused) {
          for (let i = firePatches.length - 1; i >= 0; i--) {
            const p = firePatches[i];
            p.life += simDt;
            if (p.life >= p.duration) {
              p.gfx.destroy();
              firePatches.splice(i, 1);
              continue;
            }
            // Damage enemies inside. Per-patch damageBudget caps the total a
            // single patch can deal (so blazing can't instakill via many
            // overlapping patches).
            p.tickDamageAccum += simDt;
            if (p.tickDamageAccum >= 0.12 && p.damageBudget > 0) {
              const tickAmount = Math.min(p.damageBudget, p.dps * p.tickDamageAccum);
              p.tickDamageAccum = 0;
              for (const e of enemies) {
                if (!e.alive) continue;
                if (p.damageBudget <= 0) break;
                const dx = e.x - p.x, dy = e.y - p.y;
                const r = p.radius + e.radius;
                if (dx * dx + dy * dy < r * r) {
                  const applied = Math.min(tickAmount, p.damageBudget);
                  const eff = Math.max(0, Math.min(applied, e.hp));
                  e.hp -= applied;
                  p.damageBudget -= applied;
                  state.damageDealt += eff;
                  grantXp(eff);
                  if (e.hp <= 0) killEnemy(e);
                }
              }
            }
            // Flame particles
            p.emberAccum = tickEmitter(p.emberAccum, 18, simDt, () => {
              const ang = Math.random() * Math.PI * 2;
              const r = Math.random() * p.radius * 0.75;
              spawnParticle({
                x: p.x + Math.cos(ang) * r, y: p.y + Math.sin(ang) * r,
                vx: (Math.random() - 0.5) * 16,
                vy: -30 - Math.random() * 36,
                life: 0.7 + Math.random() * 0.4,
                startSize: 24 + Math.random() * 10, endSize: 4,
                startAlpha: 0.75, color: 0xff6622, drag: 0.5,
                fadeInT: 0.1, fadeOutStartT: 0.8,
              });
            });
          }
        }
        // Fire patch render — pulsing glow that fades toward end of life
        for (const p of firePatches) {
          p.gfx.clear();
          const ageT = p.life / p.duration;
          const alpha = 1 - ageT * ageT * 0.6;
          const pulse = 1 + Math.sin(p.life * 7 + p.pulsePhase) * 0.08;
          const sx = p.x - camX + W / 2;
          const sy = p.y - camY + H / 2;
          p.gfx.circle(sx, sy, p.radius * pulse).fill({ color: 0x441100, alpha: 0.35 * alpha });
          p.gfx.circle(sx, sy, p.radius * 0.7 * pulse).fill({ color: 0xaa3311, alpha: 0.4 * alpha });
          p.gfx.circle(sx, sy, p.radius * 0.4 * pulse).fill({ color: 0xff7733, alpha: 0.5 * alpha });
        }

        if (simDt > 0) updateParticles(simDt, camX, camY, W, H);
        else repositionParticles(camX, camY, W, H);

        if (simDt > 0) {
          for (let i = rings.length - 1; i >= 0; i--) {
            const r = rings[i];
            r.t += simDt;
            const p = r.t / r.maxT;
            if (p >= 1) { r.gfx.destroy(); rings.splice(i, 1); continue; }
            r.gfx.clear();
            r.gfx.circle(r.x - camX + W / 2, r.y - camY + H / 2, 6 + p * 34)
              .stroke({ width: 2 * (1 - p), color: r.color, alpha: 1 - p });
          }
        }

        // Cursor ring — one segment per quiver slot, filled in the quiver
        // accent color. Slot currently reloading fills proportionally.
        cursorGfx.clear();
        if (!state.dead && !state.dying && !state.awaitingStart) {
          const maxQ = maxQuiver();
          if (maxQ > 0) {
            const cx = mouse.screenX, cy = mouse.screenY;
            const radius = 18;
            const thick = 4;
            const accentHex = QUIVER_ACCENT[state.loadout.quiver] ?? '#ffeecc';
            const accent = parseInt(accentHex.slice(1), 16);
            const empty = 0x222a38;
            const gapRad = 0.08;
            const segSpan = (Math.PI * 2) / maxQ;
            const reloadFrac = state.reloadRemaining > 0
              ? 1 - (state.reloadRemaining / reloadSeconds())
              : 0;
            for (let i = 0; i < maxQ; i++) {
              const a0 = -Math.PI / 2 + i * segSpan + gapRad * 0.5;
              const a1 = -Math.PI / 2 + (i + 1) * segSpan - gapRad * 0.5;
              if (i < state.arrows) {
                cursorGfx.arc(cx, cy, radius, a0, a1)
                  .stroke({ width: thick, color: accent, alpha: 0.95 });
              } else if (i === state.arrows && state.reloadRemaining > 0) {
                const mid = a0 + (a1 - a0) * reloadFrac;
                cursorGfx.arc(cx, cy, radius, a0, mid)
                  .stroke({ width: thick, color: accent, alpha: 0.95 });
                cursorGfx.arc(cx, cy, radius, mid, a1)
                  .stroke({ width: thick, color: empty, alpha: 0.6 });
              } else {
                cursorGfx.arc(cx, cy, radius, a0, a1)
                  .stroke({ width: thick, color: empty, alpha: 0.6 });
              }
            }
          }
        }

        hudSyncT += rawDt;
        if (hudSyncT > 0.08) {
          hudSyncT = 0;
          const base = xpToReachLevel(state.level);
          const next = xpToReachLevel(state.level + 1);
          const atMax = state.level >= MAX_LEVEL;
          setHud({
            hp: state.hp, maxHp: maxHp(),
            arrows: state.arrows, maxArrows: maxQuiver(),
            reloadRemaining: state.reloadRemaining,
            reloadSeconds: reloadSeconds(),
            wave: state.wave,
            wavePhase: state.wavePhase,
            waveRemaining: Math.max(0, state.waveRemaining),
            damageDealt: state.damageDealt, timeSurvived: state.timeSurvived,
            dead: state.dead,
            xp: state.xp, level: state.level,
            xpInLevel: atMax ? 0 : state.xp - base,
            xpForLevel: atMax ? 0 : next - base,
            kills: state.kills,
            awaitingStart: state.awaitingStart,
            paused: state.paused, levelUpPending: state.levelUpPending,
            levelUpChoices: state.levelUpChoices.map(u => ({ id: u.id, kind: u.kind, name: u.name, desc: u.desc })),
            stats: { ...state.stats },
            statLevels: { ...state.statLevels },
            loadout: { ...state.loadout },
            atMaxLevel: atMax,
            shieldUp: state.shieldUp,
            shieldRegenFrac: state.shieldRegenRemaining > 0
              ? 1 - state.shieldRegenRemaining / shieldRegenTime()
              : (state.shieldUp ? 1 : 0),
            itemPowerLevel: itemPowerLevel(),
          });
        }
      });
    });

    return () => {
      destroyed = true;
      if (cleanupListeners) cleanupListeners();
      if (initialized) app.destroy(true, { children: true });
      pickUpgradeRef.current = null;
      startGameRef.current = null;
      resetGameRef.current = null;
      togglePauseRef.current = null;
    };
  }, []);

  const xpPct = hud.xpForLevel > 0
    ? Math.max(0, Math.min(100, (hud.xpInLevel / hud.xpForLevel) * 100))
    : 100;

  // Family labels each offered card would influence — used by
  // ProgressionPanel to glow rows the player already has a level in, making
  // the link between the hovered card and existing progress visible. Empty
  // when nothing is hovered — highlights are hover-only, not always-on.
  // Persist a score row the moment the game-over overlay appears. Resetting
  // (awaitingStart flips back on) clears the "just-scored" highlight so a
  // fresh run starts clean.
  // Guards against React StrictMode's double-mount re-running the effect
  // and submitting the same run twice. Cleared on awaitingStart so a new
  // run is free to submit.
  const submittedRunRef = useRef(false);
  useEffect(() => {
    if (hud.dead && !submittedRunRef.current) {
      submittedRunRef.current = true;
      const ts = Date.now();
      const damage = Math.round(hud.damageDealt);
      const timeSeconds = Math.max(1, Math.round(hud.timeSurvived));
      const next: Score = {
        name: playerName,
        level: hud.level,
        kills: hud.kills,
        damage,
        time: hud.timeSurvived,
        ts,
      };
      setScores(saveScore(next));
      setLastScoreTs(ts);
      // Fire-and-forget online submission — the server rejects with
      // SenderError if validation fails (rate limit, impossible stats,
      // etc.). We swallow errors because a rejected online submit should
      // never block the local save or the game-over UI.
      submitScoreOnline({
        name: playerName,
        level: hud.level,
        kills: hud.kills,
        damage,
        timeSeconds,
      }).catch(() => { /* ignore */ });
    } else if (hud.awaitingStart) {
      setLastScoreTs(null);
      submittedRunRef.current = false;
    }
  // Only fire when the dead / awaitingStart transitions actually change;
  // the body reads whatever hud values are current.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud.dead, hud.awaitingStart]);

  const levelUpHighlightFamilies = useMemo(() => {
    const set = new Set<string>();
    if (hoveredCardId) {
      for (const fam of familiesForUpgrade(hoveredCardId)) set.add(fam);
    }
    return set;
  }, [hoveredCardId]);

  // Reset hover when the level-up overlay closes so a stale id can't carry
  // over into the next prompt.
  useEffect(() => {
    if (!hud.levelUpPending) setHoveredCardId(null);
  }, [hud.levelUpPending]);

  // Gate level-up clicks until all cards have animated in, so you can't
  // accidentally click one that appears under the cursor.
  useEffect(() => {
    if (hud.levelUpPending && hud.levelUpChoices.length > 0) {
      setCardsReady(false);
      const lastCardAppearMs = 280 + (hud.levelUpChoices.length - 1) * 90 + 400 + 60;
      const t = setTimeout(() => setCardsReady(true), lastCardAppearMs);
      return () => clearTimeout(t);
    } else {
      setCardsReady(false);
    }
  }, [hud.levelUpPending, hud.levelUpChoices.length]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0c12' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseGlow {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(255,200,68,0.4)); }
          50%      { filter: drop-shadow(0 0 14px rgba(255,200,68,0.7)); }
        }
        @keyframes damageBump {
          0%   { transform: scale(1);    }
          40%  { transform: scale(1.18); }
          100% { transform: scale(1);    }
        }
        @keyframes floatUpParticle {
          0%   { transform: translateY(0);      opacity: 0;   }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateY(-110vh); opacity: 0;   }
        }
      `}</style>
      <div ref={canvasRef} style={{ position: 'fixed', inset: 0 }} />

      {/* Full-width XP bar at the very top. No numeric indicator. */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 6, background: '#0f1220', borderBottom: '1px solid #222', zIndex: 15 }}>
        <div style={{
          height: '100%',
          width: `${hud.atMaxLevel ? 100 : xpPct}%`,
          background: hud.atMaxLevel
            ? 'linear-gradient(90deg, #ffcc44, #ff9922)'
            : 'linear-gradient(90deg, #66ccff, #33aaff)',
          transition: 'width 180ms ease',
          boxShadow: '0 0 10px rgba(102,204,255,0.5)',
        }} />
      </div>

      {/* Center-top: time + damage as big, stacked numbers. Damage bumps on
          each update so you feel the hit. */}
      <div style={{
        position: 'fixed', top: 18, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        pointerEvents: 'none', zIndex: 14, gap: 2,
      }}>
        <div style={{
          fontFamily: 'monospace', fontSize: 28, color: '#e8ecff',
          letterSpacing: 3, textShadow: '0 0 10px rgba(102,170,255,0.4)',
        }}>{fmtMMSS(hud.timeSurvived)}</div>
        <div
          key={Math.floor(hud.damageDealt)}
          style={{
            fontFamily: 'monospace', fontSize: 24, color: '#ffcc66',
            letterSpacing: 2, textShadow: '0 0 8px rgba(255,180,70,0.45)',
            animation: 'damageBump 220ms ease-out',
          }}
        >{Math.floor(hud.damageDealt)}</div>
      </div>

      {/* Top-left: level + kill count, just below the XP bar. */}
      <div style={{ position: 'fixed', top: 22, left: 16, color: '#88aaff', fontFamily: 'monospace', fontSize: 12 }}>
        <div style={{ fontSize: 14, color: '#ffcc44', letterSpacing: 1 }}>
          LV {hud.level}{hud.atMaxLevel && <span style={{ color: '#88aadd', marginLeft: 6 }}>MAX</span>}
        </div>
        <div
          key={hud.kills}
          style={{
            fontSize: 13, color: '#ff8899', letterSpacing: 1, marginTop: 2,
            animation: 'damageBump 180ms ease-out',
          }}
        >×{hud.kills}</div>
      </div>

{(() => {
        // The bow/quiver/item strip always sits at the bottom of the HUD.
        // On the start screen it wears an orange frame + onboarding caption
        // and floats above the modal's backdrop so the player can see it
        // clearly against the dark overlay. During gameplay it's bare.
        const highlight = hud.awaitingStart;
        const accent = '#ffaa66';
        return (
          <div style={{
            position: 'fixed', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            fontFamily: 'monospace',
            // Pop above the start-screen backdrop (z=30) when highlighted so
            // the outline actually reads.
            zIndex: highlight ? 32 : 5,
            pointerEvents: 'none',
          }}>
            <div style={{
              display: 'flex', gap: 18, alignItems: 'flex-end',
              padding: highlight ? '12px 20px' : 0,
              background: highlight ? 'rgba(20,16,12,0.9)' : 'transparent',
              border: highlight ? `2px solid ${accent}` : '2px solid transparent',
              borderRadius: 10,
              boxShadow: highlight ? `0 0 20px ${accent}88, 0 4px 24px rgba(0,0,0,0.6)` : 'none',
              transition: 'background 200ms, border-color 200ms, box-shadow 200ms, padding 200ms',
            }}>
              <BowSlot bow={hud.loadout.bow} />
              <QuiverSlot
                arrows={hud.arrows} max={hud.maxArrows}
                reloadRemaining={hud.reloadRemaining} reloadSeconds={hud.reloadSeconds}
                kind={hud.loadout.quiver}
              />
              <ItemSlot
                item={hud.loadout.item}
                shieldUp={hud.shieldUp}
                shieldRegenFrac={hud.shieldRegenFrac}
                itemPower={hud.itemPowerLevel}
                placeholder={highlight}
              />
            </div>
            {highlight && (
              <div style={{
                fontSize: 11, color: accent, letterSpacing: 3,
                textTransform: 'uppercase',
                textShadow: `0 0 8px ${accent}aa`,
              }}>Shoot enemies to level up and upgrade</div>
            )}
          </div>
        );
      })()}

      {hud.paused && !hud.levelUpPending && !hud.dead && !hud.awaitingStart && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 18,
          color: '#fff', fontFamily: 'monospace', pointerEvents: 'none',
          animation: 'fadeIn 240ms ease forwards',
          padding: 24, overflowY: 'auto',
        }}>
          <div style={{
            background: 'rgba(20,20,30,0.92)', border: '1px solid #66aaff',
            borderRadius: 8, padding: '18px 28px', textAlign: 'center',
            animation: 'scaleIn 240ms ease forwards',
            pointerEvents: 'auto', minWidth: 280, maxWidth: 760,
            maxHeight: '92vh', overflowY: 'auto',
          }}>
            <div style={{ fontSize: 20, color: '#66aaff', marginBottom: 14, letterSpacing: 3 }}>PAUSED</div>
            <button
              type="button"
              onClick={() => togglePauseRef.current?.()}
              data-no-draw-start
              style={{
                display: 'block', margin: '0 auto 6px',
                padding: '10px 22px', borderRadius: 6,
                background: 'linear-gradient(180deg, #4a7dd0, #325a9e)',
                border: '1px solid #6a9cff', color: '#fff',
                fontFamily: 'monospace', fontSize: 13, letterSpacing: 3,
                cursor: 'pointer', boxShadow: '0 0 14px rgba(90,140,255,0.45)',
              }}
            >RESUME</button>
            <div style={{ fontSize: 10, color: '#667', letterSpacing: 1, marginBottom: 18 }}>or press ESC</div>
            <div style={{ maxWidth: 280, margin: '0 auto' }}>
              <VolumeSlider label="Music" value={musicVol}
                onChange={(v) => { setMusicVol(v); setMusicVolume(v); }} accent="#66aaff" />
              <VolumeSlider label="Sound effects" value={sfxVol}
                onChange={(v) => { setSfxVol(v); setMasterVolume(v); }} accent="#ffaa66" />
            </div>
          </div>
        </div>
      )}

      {hud.levelUpPending && !hud.dead && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 19,
          color: '#fff', fontFamily: 'monospace', padding: 20,
          animation: 'fadeIn 300ms ease forwards', overflow: 'hidden',
        }}>
          <LevelUpParticles />
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'rgba(18,22,32,0.96)', border: '1px solid #66ccff',
            borderRadius: 10, padding: 24, minWidth: 520, maxWidth: 780, textAlign: 'center',
            animation: 'scaleIn 360ms cubic-bezier(0.22, 0.9, 0.3, 1.1) forwards',
          }}>
            <div style={{
              fontSize: 12, color: '#88aadd', letterSpacing: 3, marginBottom: 2,
              opacity: 0, animation: 'fadeUp 320ms ease forwards 100ms',
            }}>LEVEL UP</div>
            <div style={{
              fontSize: 30, color: '#ffcc44', marginBottom: 14,
              opacity: 0, animation: 'fadeUp 380ms ease forwards 180ms, pulseGlow 2000ms ease-in-out infinite 700ms',
            }}>Level {hud.level}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'stretch' }}>
              {hud.levelUpChoices.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    opacity: 0,
                    animation: `fadeUp 400ms ease forwards ${280 + i * 90}ms`,
                    pointerEvents: cardsReady ? 'auto' : 'none',
                    display: 'flex',
                  }}
                >
                  <UpgradeCard
                    idx={i}
                    choice={c}
                    onClick={() => { if (cardsReady) pickUpgradeRef.current?.(i); }}
                    enabled={cardsReady}
                    loadout={hud.loadout}
                    statLevels={hud.statLevels}
                    onHoverChange={(h) => {
                      if (h) setHoveredCardId(c.id);
                      else setHoveredCardId(prev => (prev === c.id ? null : prev));
                    }}
                  />
                </div>
              ))}
            </div>
            {/* HP — vertical rectangles, one per max HP, HP label to the left. */}
            <div style={{
              opacity: 0, animation: `fadeUp 380ms ease forwards ${280 + hud.levelUpChoices.length * 90 + 30}ms`,
              marginTop: 18, display: 'flex', justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: '#88a' }}>HP</div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {Array.from({ length: hud.maxHp }).map((_, i) => {
                    const filled = i < hud.hp;
                    const frac = hud.maxHp > 0 ? hud.hp / hud.maxHp : 0;
                    const fillColor = frac > 0.6 ? '#88dd66' : frac > 0.25 ? '#ffaa33' : '#ff4466';
                    return (
                      <div key={i} style={{
                        width: 10, height: 24,
                        background: filled ? fillColor : '#1a1a24',
                        border: `1px solid ${filled ? fillColor : '#333'}`,
                        boxShadow: filled ? `0 0 5px ${fillColor}66` : 'none',
                      }} />
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{
              opacity: 0,
              animation: `fadeUp 420ms ease forwards ${280 + hud.levelUpChoices.length * 90 + 90}ms`,
              marginTop: 18, borderTop: '1px solid #223', paddingTop: 12,
            }}>
              <ProgressionPanel
                bow={hud.loadout.bow} quiver={hud.loadout.quiver} item={hud.loadout.item}
                statLevels={hud.statLevels}
                highlightFamilies={levelUpHighlightFamilies}
              />
            </div>
            <div style={{
              marginTop: 10, fontSize: 10, color: '#667',
              opacity: 0, animation: 'fadeIn 400ms ease forwards 800ms',
            }}>Click a card, or press 1 / 2 / 3</div>
          </div>
        </div>
      )}

      {showDebug && (
        <DebugPanel stats={hud.stats} loadout={hud.loadout} onClose={() => setShowDebug(false)} />
      )}

      {hud.dead && (
        <GameOverScreen
          level={hud.level}
          kills={hud.kills}
          damageDealt={hud.damageDealt}
          timeSurvived={hud.timeSurvived}
          scores={scores}
          highlightTs={lastScoreTs}
          onlineScores={onlineScores}
          onlineReady={onlineReady}
          myIdentityHex={myIdentityHex}
          onRestart={() => {
            // Reset sets awaitingStart=true, then startGame immediately
            // flips it off and spawns the welcome grunt — the player skips
            // the start screen entirely.
            resetGameRef.current?.();
            startGameRef.current?.();
          }}
        />
      )}

      {hud.awaitingStart && (
        <StartScreen
          playerName={playerName}
          onPlayerName={commitPlayerName}
          onStart={() => startGameRef.current?.()}
          musicVol={musicVol}
          sfxVol={sfxVol}
          onMusicVol={(v) => { setMusicVol(v); setMusicVolume(v); }}
          onSfxVol={(v) => { setSfxVol(v); setMasterVolume(v); }}
          scores={scores}
          onlineScores={onlineScores}
          onlineReady={onlineReady}
          myIdentityHex={myIdentityHex}
        />
      )}

    </div>
  );
}

// Compact slider — the wrapper pads the track by the thumb's half-width so
// the native thumb can reach both extremes without being clipped by the
// container edge.
function VolumeSlider({ label, value, onChange, accent }: {
  label: string; value: number; onChange: (v: number) => void; accent: string;
}) {
  return (
    <div style={{ textAlign: 'left', marginBottom: 10 }}>
      <div style={{ fontSize: 9, color: '#88a', letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' }}>
        {label} <span style={{ color: '#667', marginLeft: 4 }}>{Math.round(value * 100)}%</span>
      </div>
      <div style={{ paddingLeft: 8, paddingRight: 8 }}>
        <input
          type="range" min={0} max={100} step={1}
          value={Math.round(value * 100)}
          onChange={e => onChange(parseInt(e.currentTarget.value, 10) / 100)}
          style={{ width: '100%', accentColor: accent, display: 'block' }}
          data-no-draw-start
        />
      </div>
    </div>
  );
}

// Little graphic showing WASD + LMB on the start screen, so the controls are
// immediately obvious without explanation text.
// Compact leaderboard table. Rows are rendered as flex rows so the columns
// stay aligned without an HTML table. The most recent run (matching
// highlightTs) is tinted so the player can find their row immediately.
function Leaderboard({ scores, highlightTs, title = 'LEADERBOARD' }: {
  scores: Score[];
  highlightTs?: number | null;
  title?: string;
}) {
  if (scores.length === 0) {
    return (
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 9, color: '#88a', letterSpacing: 2, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#556', letterSpacing: 1, textAlign: 'center', padding: '8px 0' }}>
          No scores yet — die trying to claim first.
        </div>
      </div>
    );
  }
  const headerStyle: React.CSSProperties = {
    display: 'flex', fontSize: 9, color: '#667', letterSpacing: 2,
    padding: '0 4px', marginBottom: 3,
  };
  const rowBase: React.CSSProperties = {
    display: 'flex', fontSize: 11, padding: '3px 4px', borderRadius: 3,
  };
  const cRank: React.CSSProperties  = { width: 22, textAlign: 'right' };
  const cName: React.CSSProperties  = { flex: 1, paddingLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  const cDmg: React.CSSProperties   = { width: 46, textAlign: 'right' };
  const cTime: React.CSSProperties  = { width: 46, textAlign: 'right' };
  const cKills: React.CSSProperties = { width: 36, textAlign: 'right' };
  const cLvl: React.CSSProperties   = { width: 28, textAlign: 'right' };
  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{ fontSize: 9, color: '#88a', letterSpacing: 2, marginBottom: 6 }}>{title}</div>
      <div style={headerStyle}>
        <div style={cRank}>#</div>
        <div style={cName}>NAME</div>
        <div style={cDmg}>DMG</div>
        <div style={cTime}>TIME</div>
        <div style={cKills}>KILLS</div>
        <div style={cLvl}>LVL</div>
      </div>
      {scores.map((s, i) => {
        const mine = highlightTs != null && s.ts === highlightTs;
        return (
          <div key={s.ts} style={{
            ...rowBase,
            background: mine ? 'rgba(255,170,60,0.18)' : (i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'),
            color: mine ? '#ffd7a0' : '#bcd',
            border: mine ? '1px solid #ffaa66' : '1px solid transparent',
          }}>
            <div style={cRank}>{i + 1}</div>
            <div style={cName}>{s.name}</div>
            <div style={cDmg}>{s.damage}</div>
            <div style={cTime}>{fmtMMSS(s.time)}</div>
            <div style={cKills}>{s.kills}</div>
            <div style={cLvl}>{s.level}</div>
          </div>
        );
      })}
    </div>
  );
}

// Renders the live SpacetimeDB score table. Converts OnlineScore rows into
// the local Score shape so the existing Leaderboard component can render
// them without duplicating column layout / styling. Uses the u64 id cast to
// Number for ts (rank-highlight) — ids are monotonic and fit comfortably in
// Number for the lifetime of a leaderboard. Falls back to a "connecting"
// placeholder while the subscription hasn't returned.
function OnlineLeaderboard({ scores, myIdentityHex, title = 'ONLINE LEADERBOARD', ready }: {
  scores: readonly OnlineScore[];
  myIdentityHex: string | null;
  title?: string;
  ready: boolean;
}) {
  const mapped: Score[] = useMemo(() => {
    return [...scores]
      .map(s => ({
        name: s.name,
        level: s.level,
        kills: s.kills,
        damage: s.damage,
        time: s.timeSeconds,
        ts: Number(s.id),
        _identity: s.identity.toHexString(),
      } as Score & { _identity: string }))
      .sort(compareScores)
      .slice(0, MAX_SCORES);
  }, [scores]);

  const highlightTs = useMemo(() => {
    if (!myIdentityHex) return null;
    const mine = mapped.find(s => (s as Score & { _identity: string })._identity === myIdentityHex);
    return mine ? mine.ts : null;
  }, [mapped, myIdentityHex]);

  if (!ready) {
    return (
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 9, color: '#88a', letterSpacing: 2, marginBottom: 6 }}>{title}</div>
        <div style={{
          fontSize: 11, color: '#556', letterSpacing: 1,
          textAlign: 'center', padding: '8px 0',
          border: '1px dashed #333', borderRadius: 4,
        }}>
          Connecting…
        </div>
      </div>
    );
  }
  return <Leaderboard scores={mapped} highlightTs={highlightTs} title={title} />;
}

function ControlsHint() {
  const key: React.CSSProperties = {
    minWidth: 30, height: 30, padding: '0 6px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(28,32,44,0.92)', border: '1px solid #6a9cff',
    borderRadius: 5, color: '#cfe2ff', fontSize: 12,
    fontFamily: 'monospace', letterSpacing: 1,
    boxShadow: '0 0 8px rgba(106,156,255,0.35)',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ display: 'flex', gap: 4 }}><span style={key}>W</span></div>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={key}>A</span><span style={key}>S</span><span style={key}>D</span>
        </div>
        <div style={{ fontSize: 9, color: '#88a', letterSpacing: 2, marginTop: 4 }}>MOVE</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <svg width="44" height="60" viewBox="0 0 44 60">
          {/* Mouse pill: 36×52 with rx=18 — top and bottom are full semi-circles. */}
          <rect x="4" y="4" width="36" height="52" rx="18" fill="rgba(28,32,44,0.92)" stroke="#ffaa66" strokeWidth="1.4" />
          {/* Left button: traces the pill's top-left arc exactly so it
              never pokes outside the mouse body. */}
          <path
            d="M 22 4 A 18 18 0 0 0 4 22 L 4 26 L 22 26 Z"
            fill="rgba(255,170,102,0.35)"
            stroke="#ffaa66"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <line x1="22" y1="6" x2="22" y2="54" stroke="#3a3e4c" strokeWidth="1" />
        </svg>
        <div style={{ fontSize: 9, color: '#88a', letterSpacing: 2 }}>HOLD · RELEASE</div>
      </div>
    </div>
  );
}

function StartScreen({
  playerName, onPlayerName, onStart,
  musicVol, sfxVol, onMusicVol, onSfxVol,
  scores, onlineScores, onlineReady, myIdentityHex,
}: {
  playerName: string;
  onPlayerName: (n: string) => void;
  onStart: () => void;
  musicVol: number; sfxVol: number;
  onMusicVol: (v: number) => void;
  onSfxVol: (v: number) => void;
  scores: Score[];
  onlineScores: readonly OnlineScore[];
  onlineReady: boolean;
  myIdentityHex: string | null;
}) {
  // Empty draft when the stored name is still the default — we show it as a
  // placeholder instead so the field reads as inviting rather than prefilled.
  const [draft, setDraft] = useState(playerName === 'Bowman' ? '' : playerName);
  const commit = () => onPlayerName(draft);
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      zIndex: 30, fontFamily: 'monospace',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 240ms ease forwards',
    }}>
      {/* Centered menu — single column so the name + controls read first.
          Flex on the backdrop handles centering; the leaderboard sits in
          absolute positioning so it doesn't shift this modal off-center. */}
      <div style={{
        background: 'rgba(20,22,32,0.96)', border: '1px solid #445',
        borderRadius: 12, padding: '28px 32px', width: 420, maxWidth: '92vw',
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'scaleIn 280ms cubic-bezier(0.22, 0.9, 0.3, 1.1) forwards',
      }}>
        <div style={{
          fontSize: 28, color: '#e8ecff', letterSpacing: 6,
          textAlign: 'center', marginBottom: 22,
        }}>🏹 BOW</div>

        <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 9, color: '#88a', letterSpacing: 2 }}>YOUR NAME</label>
          <input
            type="text"
            value={draft}
            placeholder="Bowman"
            onChange={e => setDraft(e.currentTarget.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { commit(); onStart(); }
            }}
            maxLength={20}
            data-no-draw-start
            style={{
              background: 'rgba(14,16,24,0.8)', border: '1px solid #334',
              borderRadius: 4, color: '#fff', padding: '6px 10px',
              fontFamily: 'monospace', fontSize: 14, textAlign: 'center',
              width: 200,
            }}
          />
        </div>

        <div style={{ marginBottom: 22 }}>
          <ControlsHint />
        </div>

        <button
          type="button"
          onClick={() => { commit(); onStart(); }}
          data-no-draw-start
          style={{
            display: 'block', margin: '0 auto',
            padding: '12px 28px', borderRadius: 6,
            background: 'linear-gradient(180deg, #4a7dd0, #325a9e)',
            border: '1px solid #6a9cff', color: '#fff',
            fontFamily: 'monospace', fontSize: 14, letterSpacing: 4,
            cursor: 'pointer', boxShadow: '0 0 14px rgba(90,140,255,0.45)',
          }}
        >START</button>
        <div style={{
          marginTop: 14, fontSize: 10, color: '#667', letterSpacing: 1,
          textAlign: 'center',
        }}>or just click and hold to draw</div>
      </div>

      {/* Detached audio panel — mirrors the leaderboard on the right so
          volume controls stay reachable without crowding the menu. */}
      <div style={{
        position: 'absolute', left: 40, top: '50%',
        transform: 'translateY(-50%)',
        width: 280,
      }}>
        <VolumeSlider label="Music" value={musicVol} onChange={onMusicVol} accent="#66aaff" />
        <VolumeSlider label="Sound effects" value={sfxVol} onChange={onSfxVol} accent="#ffaa66" />
      </div>

      {/* Detached leaderboard panel — pinned to the right of the viewport
          so it stays visible but doesn't crowd the opening menu. */}
      <div style={{
        position: 'absolute', right: 40, top: '50%',
        transform: 'translateY(-50%)',
        width: 280, display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <Leaderboard scores={scores} title="LOCAL LEADERBOARD" />
        <OnlineLeaderboard scores={onlineScores} ready={onlineReady} myIdentityHex={myIdentityHex} />
      </div>
    </div>
  );
}

// Game-over screen — shows the run stats with an editable name at the top.
// This is the only moment the player is invited to change their name, so
// local scores + the eventual online board get a fresh prompt between runs.
function GameOverScreen({
  level, kills, damageDealt, timeSurvived,
  scores, highlightTs, onRestart,
  onlineScores, onlineReady, myIdentityHex,
}: {
  level: number; kills: number; damageDealt: number; timeSurvived: number;
  scores: Score[];
  highlightTs: number | null;
  onRestart: () => void;
  onlineScores: readonly OnlineScore[];
  onlineReady: boolean;
  myIdentityHex: string | null;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 20, color: '#fff', fontFamily: 'monospace',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 360ms ease forwards',
    }}>
      {/* Centered menu — single column so the death summary + AGAIN read as
          one sharp focal point. Flex on the backdrop handles centering; the
          leaderboard sits in absolute positioning so it doesn't shift this
          modal off-center. */}
      <div style={{
        background: 'rgba(20,20,30,0.92)', border: '1px solid #ff4466',
        borderRadius: 10, padding: '24px 32px', width: 380, maxWidth: '92vw',
        maxHeight: '92vh', overflowY: 'auto', textAlign: 'center',
        animation: 'scaleIn 380ms cubic-bezier(0.22, 0.9, 0.3, 1.1) forwards',
      }}>
        <div style={{
          fontSize: 28, color: '#ff4466', marginBottom: 16, letterSpacing: 5,
          opacity: 0, animation: 'fadeUp 420ms ease forwards 120ms',
        }}>GAME OVER</div>

        <div style={{
          marginBottom: 20,
          opacity: 0, animation: 'fadeUp 420ms ease forwards 300ms',
        }}>
          {[
            ['Damage', damageDealt.toFixed(0)],
            ['Time', fmtMMSS(timeSurvived)],
            ['Kills', kills],
            ['Level', level],
          ].map(([label, value]) => (
            <div key={label as string} style={{ fontSize: 14, color: '#ccd', marginBottom: 4 }}>
              <span style={{ color: '#88a' }}>{label}:</span>{' '}
              <span style={{ color: '#ffcc44' }}>{value}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onRestart()}
          data-no-draw-start
          style={{
            display: 'block', margin: '0 auto',
            padding: '10px 22px', borderRadius: 6,
            background: 'linear-gradient(180deg, #d04a5a, #9e3242)',
            border: '1px solid #ff6a7c', color: '#fff',
            fontFamily: 'monospace', fontSize: 13, letterSpacing: 3,
            cursor: 'pointer', boxShadow: '0 0 14px rgba(255,90,120,0.45)',
            opacity: 0, animation: 'fadeUp 420ms ease forwards 540ms',
          }}
        >AGAIN</button>
        <div style={{
          marginTop: 10, fontSize: 10, color: '#667', letterSpacing: 1,
          opacity: 0, animation: 'fadeIn 500ms ease forwards 760ms',
        }}>or press R</div>
      </div>

      {/* Detached leaderboard panel — pinned to the right of the viewport
          to match the start screen's layout. Wrapper handles the vertical
          centering (translateY -50%); inner div handles the fade-in so the
          animation's own transform doesn't clobber the centering. */}
      <div style={{
        position: 'absolute', right: 40, top: '50%',
        transform: 'translateY(-50%)',
        width: 280,
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 18,
          opacity: 0, animation: 'fadeIn 420ms ease forwards 420ms',
        }}>
          <Leaderboard scores={scores} highlightTs={highlightTs} title="LOCAL LEADERBOARD" />
          <OnlineLeaderboard scores={onlineScores} ready={onlineReady} myIdentityHex={myIdentityHex} />
        </div>
      </div>
    </div>
  );
}

